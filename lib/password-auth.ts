import { env } from 'cloudflare:workers';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { randomToken, tokenHash, verifyPassword } from '@/lib/password';

const COOKIE = 'estatehub_session';
const LIFETIME = 30 * 24 * 60 * 60;
const MFA_PENDING_LIFETIME = 10 * 60;
const DUMMY_HASH =
  'pbkdf2-sha256$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
export function sessionToken(request: Request) {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export function sessionCookie(
  request: Request,
  token: string,
  maxAge = LIFETIME,
) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

// Only an explicitly configured secret may provision the three test accounts.
// Passwords are never stored here; existing credentials/roles are never reset.
let provision: Promise<void> | undefined;
export async function provisionTestAccounts() {
  const raw = (env as typeof env & { ESTATEHUB_TEST_ACCOUNTS?: string })
    .ESTATEHUB_TEST_ACCOUNTS;
  if (!raw) return;
  if (!provision)
    provision = (async () => {
      const database = await ensureMarketplaceDatabase();
      const decoded = new TextDecoder().decode(
        Uint8Array.from(atob(raw), (character) => character.charCodeAt(0)),
      );
      const accounts = JSON.parse(decoded) as Array<{
        id: string;
        login: string;
        name: string;
        passwordHash: string;
        role: string;
      }>;
      if (
        accounts.length !== 3 ||
        new Set(accounts.map((a) => a.role)).size !== 3
      )
        throw new Error('Invalid test account configuration');
      for (const account of accounts) {
        if (
          !['buyer', 'developer', 'superadmin'].includes(account.role) ||
          !account.id.startsWith('test-auth-') ||
          !account.passwordHash.startsWith('pbkdf2-sha256$100000$')
        )
          throw new Error('Invalid test account configuration');
        const statements = [
          database
            .prepare(
              'INSERT OR IGNORE INTO users (id, external_user_id, email, full_name) VALUES (?, ?, ?, ?)',
            )
            .bind(
              account.id,
              `password:${account.id}`,
              account.login,
              account.name,
            ),
          database
            .prepare(
              'UPDATE users SET email = ?, full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            )
            .bind(account.login, account.name, account.id),
          database
            .prepare(
              "INSERT OR IGNORE INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) SELECT ?, 'system', 'test-account-provisioning', 'auth.test_account_created', 'user', ?, '{}' WHERE NOT EXISTS (SELECT 1 FROM auth_credentials WHERE user_id = ?)",
            )
            .bind(`audit-${account.id}`, account.id, account.id),
        ];
        if (account.role === 'superadmin')
          statements.push(
            database
              .prepare(
                "INSERT OR IGNORE INTO platform_role_assignments (user_id, role) SELECT ?, 'SUPERADMIN' WHERE NOT EXISTS (SELECT 1 FROM auth_credentials WHERE user_id = ?)",
              )
              .bind(account.id, account.id),
          );
        if (account.role === 'developer')
          statements.push(
            database
              .prepare(
                "INSERT OR IGNORE INTO organization_memberships (organization_id, user_id, role, status) SELECT 'org-samarkand-development', ?, 'OWNER', 'active' WHERE NOT EXISTS (SELECT 1 FROM auth_credentials WHERE user_id = ?)",
              )
              .bind(account.id, account.id),
          );
        if (account.role === 'buyer')
          statements.push(
            database
              .prepare(
                `INSERT OR IGNORE INTO buyer_phone_verifications
                (user_id, phone_e164, status, verified_at)
               VALUES (?, '+998901111111', 'verified', CURRENT_TIMESTAMP)`,
              )
              .bind(account.id),
          );
        statements.push(
          database
            .prepare(
              'INSERT OR IGNORE INTO auth_credentials (user_id, login, password_hash) VALUES (?, ?, ?)',
            )
            .bind(
              account.id,
              account.login.toLowerCase(),
              account.passwordHash,
            ),
        );
        await database.batch(statements);
      }
    })().catch((error) => {
      provision = undefined;
      throw error;
    });
  await provision;
}
export async function passwordSessionUser(request: Request) {
  const token = sessionToken(request);
  if (!token) return null;
  const database = await ensureMarketplaceDatabase();
  return database
    .prepare(`SELECT users.id, users.email, users.full_name, auth_sessions.mfa_verified_at FROM auth_sessions
    JOIN users ON users.id = auth_sessions.user_id
    WHERE token_hash = ? AND expires_at > ? AND users.status = 'active'`)
    .bind(await tokenHash(token), Math.floor(Date.now() / 1000))
    .first<{ id: string; email: string; full_name: string; mfa_verified_at: number | null }>();
}
export async function loginWithPassword(
  request: Request,
  login: string,
  password: string,
) {
  const database = await ensureMarketplaceDatabase();
  await provisionTestAccounts();
  const now = Math.floor(Date.now() / 1000);
  // Account and trusted network buckets are incremented atomically before KDF work.
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  const buckets = [
    [`login:${await tokenHash(login)}`, 10],
    [`ip:${await tokenHash(ip)}`, 50],
  ] as const;
  for (const [bucket, limit] of buckets) {
    const row = await database
      .prepare(`INSERT INTO auth_rate_limits (bucket, attempts, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING attempts`)
      .bind(bucket, now + 900, now, now)
      .first<{ attempts: number }>();
    if ((row?.attempts ?? limit + 1) > limit) {
      if (row?.attempts === limit + 1) {
        await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'system', NULL, 'auth.rate_limited', 'auth_bucket', ?, ?)`).bind(crypto.randomUUID(), bucket, JSON.stringify({ limit })).run().catch((error) => console.error('Failed to record login rate limit', error));
      }
      return { status: 429 as const };
    }
  }
  const credentials = await database
    .prepare(`SELECT credentials.user_id, credentials.password_hash, users.status
    FROM auth_credentials credentials JOIN users ON users.id = credentials.user_id WHERE login = ?`)
    .bind(login)
    .first<{ user_id: string; password_hash: string; status: string }>();
  const valid = await verifyPassword(
    password,
    credentials?.password_hash ?? DUMMY_HASH,
  );
  if (!valid || !credentials || credentials.status !== 'active') {
    if (credentials) {
      await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'system', ?, 'auth.login_failed', 'user', ?, '{}')`).bind(crypto.randomUUID(), credentials.user_id, credentials.user_id).run().catch((error) => console.error('Failed to record login failure', error));
    }
    return { status: 401 as const };
  }
  const [platformRole, membership] = await Promise.all([
    database
      .prepare(`SELECT 1 AS allowed FROM platform_role_assignments WHERE user_id = ? LIMIT 1`)
      .bind(credentials.user_id)
      .first<{ allowed: number }>(),
    database
      .prepare(`SELECT 1 AS allowed FROM organization_memberships WHERE user_id = ? AND status = 'active' LIMIT 1`)
      .bind(credentials.user_id)
      .first<{ allowed: number }>(),
  ]);
  const token = randomToken();
  const oldToken = sessionToken(request);
  await database.batch([
    database
      .prepare(
        'DELETE FROM auth_sessions WHERE expires_at <= ? OR token_hash = ?',
      )
      .bind(now, oldToken ? await tokenHash(oldToken) : ''),
    database
      .prepare(
        'DELETE FROM auth_rate_limits WHERE expires_at <= ? OR bucket = ?',
      )
      .bind(now, buckets[0][0]),
    database
      .prepare(
        'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      )
      .bind(await tokenHash(token), credentials.user_id, now + (platformRole ? MFA_PENDING_LIFETIME : LIFETIME)),
    database
      .prepare(
        "INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'auth.login', 'user', ?, '{}')",
      )
      .bind(crypto.randomUUID(), credentials.user_id, credentials.user_id),
  ]);
  const redirectTo = platformRole
    ? '/mfa'
    : membership
      ? '/developer'
      : '/profile';
  return { status: 200 as const, token, redirectTo };
}
export async function logout(request: Request) {
  const token = sessionToken(request);
  if (!token) return;
  const database = await ensureMarketplaceDatabase();
  await database
    .prepare('DELETE FROM auth_sessions WHERE token_hash = ?')
    .bind(await tokenHash(token))
    .run();
}
