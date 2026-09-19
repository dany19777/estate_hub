import { authorizationResponse, getAppSession, type PlatformRole } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

const roles = new Set<PlatformRole>(['SUPERADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'VERIFICATION_SPECIALIST', 'FINANCE_OPERATOR', 'SUPPORT', 'CONTENT_MANAGER']);

async function requireSuperadmin(request: Request) {
  const session = await getAppSession(request);
  if (!session.platformRoles.includes('SUPERADMIN')) return { session, denied: Response.json({ error: 'forbidden', message: 'Управлять ролями может только SUPERADMIN.' }, { status: 403 }) };
  return { session, denied: null };
}

async function payload() {
  const database = await ensureMarketplaceDatabase();
  const users = await database.prepare(`SELECT user.id, user.email, user.full_name, user.status, user.created_at,
    GROUP_CONCAT(DISTINCT role.role) AS roles, membership.role AS organization_role, organization.name AS organization_name,
    phone.status AS phone_status
    FROM users user
    LEFT JOIN platform_role_assignments role ON role.user_id = user.id
    LEFT JOIN organization_memberships membership ON membership.user_id = user.id AND membership.status = 'active'
    LEFT JOIN organizations organization ON organization.id = membership.organization_id
    LEFT JOIN buyer_phone_verifications phone ON phone.user_id = user.id
    GROUP BY user.id, membership.role, organization.name, phone.status
    ORDER BY user.created_at DESC`).all();
  return { users: (users.results ?? []).map((user) => ({ ...user, roles: String(user.roles ?? '').split(',').filter(Boolean) })) };
}

export async function GET(request: Request) {
  try {
    const access = await requireSuperadmin(request);
    if (access.denied) return access.denied;
    return Response.json({ ...(await payload()), session: access.session }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'users_unavailable', message: 'Не удалось загрузить пользователей.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireSuperadmin(request);
    if (access.denied) return access.denied;
    const body = await request.json() as { userId?: string; action?: string; role?: PlatformRole };
    const userId = String(body.userId ?? '');
    const action = String(body.action ?? '');
    if (!userId) return Response.json({ error: 'invalid_user', message: 'Пользователь не выбран.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const target = await database.prepare(`SELECT id, status FROM users WHERE id = ? LIMIT 1`).bind(userId).first<{ id: string; status: string }>();
    if (!target) return Response.json({ error: 'not_found', message: 'Пользователь не найден.' }, { status: 404 });

    if (action === 'add_role' || action === 'remove_role') {
      if (!body.role || !roles.has(body.role)) return Response.json({ error: 'invalid_role', message: 'Выберите допустимую роль.' }, { status: 400 });
      if (action === 'remove_role' && body.role === 'SUPERADMIN') {
        const count = await database.prepare(`SELECT COUNT(*) AS count FROM platform_role_assignments WHERE role = 'SUPERADMIN'`).first<{ count: number }>();
        if ((count?.count ?? 0) <= 1) return Response.json({ error: 'last_superadmin', message: 'Нельзя удалить последнего SUPERADMIN.' }, { status: 409 });
      }
      const statement = action === 'add_role'
        ? database.prepare(`INSERT OR IGNORE INTO platform_role_assignments (user_id, role) VALUES (?, ?)`).bind(userId, body.role)
        : database.prepare(`DELETE FROM platform_role_assignments WHERE user_id = ? AND role = ?`).bind(userId, body.role);
      await database.batch([
        statement,
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, 'user', ?, ?)`).bind(crypto.randomUUID(), access.session.user.id, `access.${action}`, userId, JSON.stringify({ role: body.role })),
      ]);
    } else if (action === 'block' || action === 'unblock') {
      if (userId === access.session.user.id && action === 'block') return Response.json({ error: 'self_block', message: 'Нельзя заблокировать собственный аккаунт.' }, { status: 409 });
      await database.batch([
        database.prepare(`UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(action === 'block' ? 'blocked' : 'active', userId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, 'user', ?, ?)`).bind(crypto.randomUUID(), access.session.user.id, `access.user_${action}`, userId, JSON.stringify({ previousStatus: target.status })),
      ]);
    } else return Response.json({ error: 'invalid_action', message: 'Неизвестное действие.' }, { status: 400 });

    return Response.json({ ...(await payload()), message: 'Права доступа обновлены.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'users_update_failed', message: 'Не удалось обновить права пользователя.' }, { status: 500 });
  }
}
