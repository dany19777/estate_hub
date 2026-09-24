import { ensureMarketplaceDatabase } from '@/lib/database';
import { passwordSessionUser, sameOrigin } from '@/lib/password-auth';

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

export async function getAppSession(request: Request): Promise<AppSession> {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !sameOrigin(request)
  )
    throw new AuthorizationError(403, 'Недопустимый источник запроса.');
  const user = await passwordSessionUser(request);
  if (!user) throw new AuthorizationError(401, 'Войдите в аккаунт EstateHub.');
  const database = await ensureMarketplaceDatabase();

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
  if (platformRoles.length > 0 && !user.mfa_verified_at)
    throw new AuthorizationError(403, 'Подтвердите вход кодом из приложения-аутентификатора.', 'mfa_required');
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

export async function requirePlatformPermission(request: Request, permission: Permission) {
  const session = await requirePermission(request, permission);
  if (!session.permissions.includes('VIEW_ADMIN') || session.platformRoles.length === 0)
    throw new AuthorizationError(403, 'Доступно только сотруднику платформы.', 'platform_role_required');
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
