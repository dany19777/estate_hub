import { env } from 'cloudflare:workers';
import { ensureMarketplaceDatabase } from '@/lib/database';

export type PlatformRole =
  | 'SUPERADMIN'
  | 'PLATFORM_ADMIN'
  | 'MODERATOR'
  | 'VERIFICATION_SPECIALIST'
  | 'FINANCE_OPERATOR'
  | 'SUPPORT'
  | 'CONTENT_MANAGER';
export type OrganizationRole =
  | 'OWNER'
  | 'ADMIN'
  | 'HEAD_OF_SALES'
  | 'MANAGER'
  | 'CONTENT_MANAGER'
  | 'FINANCE'
  | 'ANALYST';
export type Permission =
  | 'VIEW_DEVELOPER_DASHBOARD'
  | 'MANAGE_COMPLEXES'
  | 'MANAGE_UNITS'
  | 'MANAGE_LEADS'
  | 'VIEW_ADMIN'
  | 'REVIEW_VERIFICATION'
  | 'MODERATE_LISTINGS'
  | 'MANAGE_FINANCE'
  | 'MANAGE_BILLING'
  | 'MANAGE_PROMOTIONS';

export type AppSession = {
  user: { id: string; email: string; fullName: string };
  platformRoles: PlatformRole[];
  organization: {
    id: string;
    name: string;
    role: OrganizationRole;
    verificationStatus: string;
  } | null;
  permissions: Permission[];
  phoneVerification: {
    status: 'not_started' | 'pending' | 'verified' | 'blocked';
    phone: string | null;
    verifiedAt: string | null;
  };
};

type UserRow = { id: string; email: string; full_name: string };
type MembershipRow = {
  organization_id: string;
  organization_name: string;
  role: OrganizationRole;
  verification_status: string;
};
type PhoneVerificationRow = {
  status: 'pending' | 'verified' | 'blocked';
  phone_e164: string;
  verified_at: string | null;
};

const platformPermissionMatrix: Record<PlatformRole, Permission[]> = {
  SUPERADMIN: [
    'VIEW_DEVELOPER_DASHBOARD',
    'MANAGE_COMPLEXES',
    'MANAGE_UNITS',
    'MANAGE_LEADS',
    'VIEW_ADMIN',
    'REVIEW_VERIFICATION',
    'MODERATE_LISTINGS',
    'MANAGE_FINANCE',
    'MANAGE_BILLING',
    'MANAGE_PROMOTIONS',
  ],
  PLATFORM_ADMIN: [
    'VIEW_ADMIN',
    'REVIEW_VERIFICATION',
    'MODERATE_LISTINGS',
    'MANAGE_FINANCE',
    'MANAGE_BILLING',
    'MANAGE_PROMOTIONS',
  ],
  MODERATOR: ['VIEW_ADMIN', 'MODERATE_LISTINGS'],
  VERIFICATION_SPECIALIST: ['VIEW_ADMIN', 'REVIEW_VERIFICATION'],
  FINANCE_OPERATOR: [
    'VIEW_ADMIN',
    'MANAGE_FINANCE',
    'MANAGE_BILLING',
    'MANAGE_PROMOTIONS',
  ],
  SUPPORT: ['VIEW_ADMIN'],
  CONTENT_MANAGER: ['VIEW_ADMIN'],
};

const organizationPermissionMatrix: Record<OrganizationRole, Permission[]> = {
  OWNER: [
    'VIEW_DEVELOPER_DASHBOARD',
    'MANAGE_COMPLEXES',
    'MANAGE_UNITS',
    'MANAGE_LEADS',
    'MANAGE_BILLING',
    'MANAGE_PROMOTIONS',
  ],
  ADMIN: [
    'VIEW_DEVELOPER_DASHBOARD',
    'MANAGE_COMPLEXES',
    'MANAGE_UNITS',
    'MANAGE_LEADS',
    'MANAGE_BILLING',
    'MANAGE_PROMOTIONS',
  ],
  HEAD_OF_SALES: ['VIEW_DEVELOPER_DASHBOARD', 'MANAGE_LEADS'],
  MANAGER: ['VIEW_DEVELOPER_DASHBOARD', 'MANAGE_LEADS'],
  CONTENT_MANAGER: [
    'VIEW_DEVELOPER_DASHBOARD',
    'MANAGE_COMPLEXES',
    'MANAGE_UNITS',
    'MANAGE_PROMOTIONS',
  ],
  FINANCE: ['VIEW_DEVELOPER_DASHBOARD', 'MANAGE_BILLING', 'MANAGE_PROMOTIONS'],
  ANALYST: ['VIEW_DEVELOPER_DASHBOARD'],
};

export class AuthorizationError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

function requestIdentity(request: Request) {
  const url = new URL(request.url);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const externalId =
    request.headers.get('oai-authenticated-user-id') ??
    (isLocal ? 'local-sites-owner' : null);
  const email =
    request.headers.get('oai-authenticated-user-email') ??
    (isLocal ? 'seedy@sites.test' : null);
  let fullName = email ?? 'Пользователь EstateHub';
  const encodedName = request.headers.get('oai-authenticated-user-full-name');
  if (
    encodedName &&
    request.headers.get('oai-authenticated-user-full-name-encoding') ===
      'percent-encoded-utf-8'
  ) {
    try {
      fullName = decodeURIComponent(encodedName);
    } catch {
      /* fall back to email */
    }
  }
  if (!externalId || !email)
    throw new AuthorizationError(
      401,
      'Для доступа необходимо войти в аккаунт.',
    );
  return { externalId, email, fullName };
}

export async function getAppSession(request: Request): Promise<AppSession> {
  const identity = requestIdentity(request);
  const database = await ensureMarketplaceDatabase();
  let user = await database
    .prepare(
      `SELECT id, email, full_name FROM users WHERE external_user_id = ? LIMIT 1`,
    )
    .bind(identity.externalId)
    .first<UserRow>();

  if (!user) {
    const userId = crypto.randomUUID();
    await database
      .prepare(
        `INSERT OR IGNORE INTO users (id, external_user_id, email, full_name) VALUES (?, ?, ?, ?)`,
      )
      .bind(userId, identity.externalId, identity.email, identity.fullName)
      .run();
    user = await database
      .prepare(
        `SELECT id, email, full_name FROM users WHERE external_user_id = ? LIMIT 1`,
      )
      .bind(identity.externalId)
      .first<UserRow>();
  } else if (
    user.email !== identity.email ||
    user.full_name !== identity.fullName
  ) {
    await database
      .prepare(
        `UPDATE users SET email = ?, full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .bind(identity.email, identity.fullName, user.id)
      .run();
    user = { ...user, email: identity.email, full_name: identity.fullName };
  }
  if (!user)
    throw new AuthorizationError(
      401,
      'Не удалось создать профиль пользователя.',
    );

  const roleCount = await database
    .prepare(`SELECT COUNT(*) AS count FROM platform_role_assignments`)
    .first<{ count: number }>();
  const bootstrapEmail = String(
    (env as typeof env & { ESTATEHUB_BOOTSTRAP_ADMIN_EMAIL?: string })
      .ESTATEHUB_BOOTSTRAP_ADMIN_EMAIL ?? '',
  )
    .trim()
    .toLowerCase();
  if (
    (roleCount?.count ?? 0) === 0 &&
    bootstrapEmail &&
    identity.email.toLowerCase() === bootstrapEmail
  ) {
    await database.batch([
      database
        .prepare(
          `INSERT OR IGNORE INTO platform_role_assignments (user_id, role) VALUES (?, 'SUPERADMIN')`,
        )
        .bind(user.id),
      database
        .prepare(
          `INSERT OR IGNORE INTO organization_memberships (organization_id, user_id, role, status) VALUES ('org-samarkand-development', ?, 'OWNER', 'active')`,
        )
        .bind(user.id),
      database
        .prepare(
          `INSERT OR IGNORE INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'access.bootstrap_owner', 'user', ?, '{"scope":"owner-only-site"}')`,
        )
        .bind(`audit-bootstrap-${user.id}`, user.id, user.id),
    ]);
  }

  const [roleResult, membership, phoneVerification] = await Promise.all([
    database
      .prepare(`SELECT role FROM platform_role_assignments WHERE user_id = ?`)
      .bind(user.id)
      .all<{ role: PlatformRole }>(),
    database
      .prepare(`SELECT membership.organization_id, organization.name AS organization_name, membership.role, organization.verification_status
      FROM organization_memberships membership
      JOIN organizations organization ON organization.id = membership.organization_id
      WHERE membership.user_id = ? AND membership.status = 'active'
      ORDER BY membership.created_at ASC LIMIT 1`)
      .bind(user.id)
      .first<MembershipRow>(),
    database
      .prepare(
        `SELECT status, phone_e164, verified_at FROM buyer_phone_verifications WHERE user_id = ? LIMIT 1`,
      )
      .bind(user.id)
      .first<PhoneVerificationRow>(),
  ]);
  const platformRoles = (roleResult.results ?? []).map((item) => item.role);
  const permissionSet = new Set<Permission>();
  platformRoles.forEach((role) =>
    platformPermissionMatrix[role].forEach((permission) =>
      permissionSet.add(permission),
    ),
  );
  if (
    membership &&
    !['rejected', 'suspended'].includes(membership.verification_status)
  ) {
    organizationPermissionMatrix[membership.role].forEach((permission) =>
      permissionSet.add(permission),
    );
  }

  return {
    user: { id: user.id, email: user.email, fullName: user.full_name },
    platformRoles,
    organization: membership
      ? {
          id: membership.organization_id,
          name: membership.organization_name,
          role: membership.role,
          verificationStatus: membership.verification_status,
        }
      : null,
    permissions: [...permissionSet],
    phoneVerification: phoneVerification
      ? {
          status: phoneVerification.status,
          phone: phoneVerification.phone_e164,
          verifiedAt: phoneVerification.verified_at,
        }
      : { status: 'not_started', phone: null, verifiedAt: null },
  };
}

export async function requireVerifiedPhone(request: Request) {
  const session = await getAppSession(request);
  if (session.phoneVerification.status !== 'verified')
    throw new AuthorizationError(
      403,
      'Подтвердите номер телефона, чтобы использовать эту функцию.',
      'phone_verification_required',
    );
  return session;
}

export async function requirePermission(
  request: Request,
  permission: Permission,
) {
  const session = await getAppSession(request);
  if (!session.permissions.includes(permission))
    throw new AuthorizationError(403, 'У вас нет прав для этого действия.');
  return session;
}

export function authorizationResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json(
      {
        error:
          error.code ??
          (error.status === 401 ? 'unauthenticated' : 'forbidden'),
        message: error.message,
      },
      { status: error.status },
    );
  }
  return null;
}
