import pg from 'pg';
import { randomBytes, pbkdf2Sync, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const fullName = process.env.ADMIN_NAME?.trim() || 'Владелец EstateHub';
const output = process.env.ADMIN_CREDENTIALS_OUTPUT;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !output?.startsWith('/')) {
  throw new Error('ADMIN_EMAIL and absolute ADMIN_CREDENTIALS_OUTPUT are required');
}
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
const digest = pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex');
const hash = `pbkdf2-sha256$100000$${salt}$${digest}`;
const userId = randomUUID();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query('BEGIN');
  const existing = await client.query('SELECT id FROM users WHERE lower(email) = $1 LIMIT 1', [email]);
  if (existing.rowCount) throw new Error('User with this email already exists; do not overwrite credentials');
  await client.query('INSERT INTO users (id, external_user_id, email, full_name) VALUES ($1, $2, $3, $4)', [userId, `password:${userId}`, email, fullName]);
  await client.query('INSERT INTO platform_role_assignments (user_id, role) VALUES ($1, $2)', [userId, 'SUPERADMIN']);
  await client.query('INSERT INTO auth_credentials (user_id, login, password_hash) VALUES ($1, $2, $3)', [userId, email, hash]);
  await client.query(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES ($1, 'system', NULL, 'admin.bootstrap', 'user', $2, '{}')`, [randomUUID(), userId]);
  await writeFile(output, `Login: ${email}\nInitial password: ${password}\nChange the password after first login and enroll an authenticator.\n`, { flag: 'wx', mode: 0o600 });
  await client.query('COMMIT');
  process.stdout.write('Superadmin created; credentials written to protected file\n');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
