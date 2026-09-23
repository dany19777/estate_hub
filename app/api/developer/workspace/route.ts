import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

const teamRoles = new Set([
  'ADMIN',
  'HEAD_OF_SALES',
  'MANAGER',
  'CONTENT_MANAGER',
  'FINANCE',
  'ANALYST',
]);

async function organizationAdmin(request: Request) {
  const session = await requirePermission(request, 'VIEW_DEVELOPER_DASHBOARD');
  if (
    !session.organization ||
    !['OWNER', 'ADMIN'].includes(session.organization.role)
  ) {
    return { session, allowed: false };
  }
  return { session, allowed: true };
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission(
      request,
      'VIEW_DEVELOPER_DASHBOARD',
    );
    if (!session.organization)
      return Response.json(
        {
          error: 'organization_required',
          message: 'Кабинет не связан с организацией.',
        },
        { status: 403 },
      );
    const database = await ensureMarketplaceDatabase();
    const organizationId = session.organization.id;
    const [
      units,
      viewings,
      deals,
      documents,
      media,
      team,
      leadTimeline,
      settings,
    ] = await Promise.all([
      database
        .prepare(`SELECT listing.id AS listing_id, unit.id AS unit_id, complex.name AS complex_name, complex.slug,
        building.name AS building_name, unit.unit_number, unit.rooms, unit.area_sqm, unit.floor_number,
        unit.total_floors, unit.availability_status, listing.price_uzs, listing.status AS listing_status,
        listing.created_at
        FROM listings listing JOIN units unit ON unit.id = listing.unit_id
        JOIN complexes complex ON complex.id = listing.complex_id
        JOIN buildings building ON building.id = unit.building_id
        WHERE listing.seller_org_id = ? AND listing.market_type = 'PRIMARY_DEVELOPER'
        ORDER BY listing.created_at DESC LIMIT 250`)
        .bind(organizationId)
        .all(),
      database
        .prepare(`SELECT lead.id, customer.full_name AS customer_name, customer.phone_e164 AS phone,
        complex.name AS complex_name, unit.unit_number, lead.message, lead.status AS lead_status,
        viewing.requested_date, viewing.time_slot, viewing.status AS viewing_status, lead.created_at
        FROM leads lead JOIN viewings viewing ON viewing.lead_id = lead.id
        JOIN crm_customers customer ON customer.id = lead.customer_id
        JOIN complexes complex ON complex.id = lead.complex_id
        LEFT JOIN listings listing ON listing.id = lead.listing_id
        LEFT JOIN units unit ON unit.id = listing.unit_id
        WHERE lead.organization_id = ? ORDER BY viewing.requested_date DESC, viewing.time_slot DESC LIMIT 100`)
        .bind(organizationId)
        .all(),
      database
        .prepare(`SELECT lead.id, customer.full_name AS customer_name, complex.name AS complex_name,
        unit.unit_number, listing.price_uzs, lead.status, lead.updated_at,
        reservation.id AS reservation_id, reservation.payment_reference
        FROM leads lead JOIN crm_customers customer ON customer.id = lead.customer_id
        JOIN complexes complex ON complex.id = lead.complex_id
        LEFT JOIN listings listing ON listing.id = lead.listing_id
        LEFT JOIN units unit ON unit.id = listing.unit_id
        LEFT JOIN reservation_transactions reservation ON reservation.lead_id = lead.id
        WHERE lead.organization_id = ? AND lead.status IN ('deal_in_progress', 'won')
        ORDER BY lead.updated_at DESC LIMIT 100`)
        .bind(organizationId)
        .all(),
      database
        .prepare(`SELECT media.id, media.entity_type, media.entity_id, media.alt_text, media.url, media.created_at,
        complex.name AS complex_name
        FROM media_assets media
        JOIN complexes complex ON complex.id = media.entity_id AND media.entity_type = 'complex'
        WHERE complex.developer_org_id = ? AND media.media_type = 'document'
        ORDER BY media.created_at DESC LIMIT 100`)
        .bind(organizationId)
        .all(),
      database
        .prepare(`SELECT media.id, media.entity_type, media.entity_id, media.media_type, media.alt_text, media.url,
        complex.name AS complex_name, complex.slug
        FROM media_assets media
        JOIN complexes complex ON complex.id = media.entity_id AND media.entity_type = 'complex'
        WHERE complex.developer_org_id = ? AND media.media_type IN ('image', 'floor_plan')
        ORDER BY complex.name, media.sort_order LIMIT 100`)
        .bind(organizationId)
        .all(),
      database
        .prepare(`SELECT membership.user_id, membership.role, membership.status, membership.created_at,
        user.full_name, user.email FROM organization_memberships membership
        JOIN users user ON user.id = membership.user_id
        WHERE membership.organization_id = ? ORDER BY CASE membership.role WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END, user.full_name`)
        .bind(organizationId)
        .all(),
      database
        .prepare(`SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total,
        SUM(CASE WHEN lead_type = 'viewing' THEN 1 ELSE 0 END) AS viewings
        FROM leads WHERE organization_id = ? AND created_at >= datetime('now', '-30 days')
        GROUP BY substr(created_at, 1, 10) ORDER BY day`)
        .bind(organizationId)
        .all(),
      database
        .prepare(
          `SELECT new_lead_sla_minutes, sticky_assignment FROM organization_sales_settings WHERE organization_id = ? LIMIT 1`,
        )
        .bind(organizationId)
        .first(),
    ]);
    return Response.json(
      {
        units: units.results ?? [],
        viewings: viewings.results ?? [],
        deals: deals.results ?? [],
        documents: documents.results ?? [],
        media: media.results ?? [],
        team: team.results ?? [],
        leadTimeline: leadTimeline.results ?? [],
        settings: settings ?? {
          new_lead_sla_minutes: 45,
          sticky_assignment: 1,
        },
        organization: {
          name: session.organization.name,
          role: session.organization.role,
        },
        canManageTeam: ['OWNER', 'ADMIN'].includes(session.organization.role),
        canManageUnits: session.permissions.includes('MANAGE_UNITS'),
        canManageLeads: session.permissions.includes('MANAGE_LEADS'),
        currentUserId: session.user.id,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load developer workspace', error);
    return Response.json(
      {
        error: 'workspace_unavailable',
        message: 'Не удалось загрузить разделы кабинета.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, allowed } = await organizationAdmin(request);
    if (!allowed || !session.organization)
      return Response.json(
        {
          error: 'forbidden',
          message:
            'Управлять командой может владелец или администратор компании.',
        },
        { status: 403 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = typeof body.role === 'string' ? body.role : '';
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !teamRoles.has(role) ||
      (role === 'ADMIN' && session.organization.role !== 'OWNER')
    ) {
      return Response.json(
        {
          error: 'validation_failed',
          message: 'Проверьте email и роль сотрудника.',
        },
        { status: 400 },
      );
    }
    const database = await ensureMarketplaceDatabase();
    const user = await database
      .prepare(`SELECT id, status FROM users WHERE lower(email) = ? LIMIT 1`)
      .bind(email)
      .first<{ id: string; status: string }>();
    if (!user || user.status !== 'active')
      return Response.json(
        {
          error: 'user_not_found',
          message:
            'Сотрудник должен сначала создать активный аккаунт EstateHub с этим email.',
        },
        { status: 404 },
      );
    const otherMembership = await database
      .prepare(
        `SELECT organization_id FROM organization_memberships WHERE user_id = ? AND organization_id <> ? AND status = 'active' LIMIT 1`,
      )
      .bind(user.id, session.organization.id)
      .first();
    if (otherMembership)
      return Response.json(
        {
          error: 'another_organization',
          message: 'Этот аккаунт уже состоит в другой компании.',
        },
        { status: 409 },
      );
    const existing = await database
      .prepare(
        `SELECT role, status FROM organization_memberships WHERE organization_id = ? AND user_id = ? LIMIT 1`,
      )
      .bind(session.organization.id, user.id)
      .first<{ role: string; status: string }>();
    if (existing?.role === 'OWNER')
      return Response.json(
        {
          error: 'owner_protected',
          message: 'Роль владельца нельзя изменить здесь.',
        },
        { status: 403 },
      );
    if (
      existing &&
      session.organization.role !== 'OWNER' &&
      existing.role === 'ADMIN'
    )
      return Response.json(
        {
          error: 'admin_protected',
          message: 'Изменить администратора может только владелец.',
        },
        { status: 403 },
      );
    await database.batch([
      database
        .prepare(`INSERT INTO organization_memberships (organization_id, user_id, role, status) VALUES (?, ?, ?, 'active')
        ON CONFLICT(organization_id, user_id) DO UPDATE SET role = excluded.role, status = 'active'`)
        .bind(session.organization.id, user.id, role),
      database
        .prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
        VALUES (?, 'user', ?, 'organization.member_upserted', 'organization', ?, ?)`)
        .bind(
          crypto.randomUUID(),
          session.user.id,
          session.organization.id,
          JSON.stringify({ userId: user.id, role }),
        ),
    ]);
    return Response.json({ message: 'Сотрудник добавлен в команду.' });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update developer team', error);
    return Response.json(
      { error: 'team_update_failed', message: 'Не удалось обновить команду.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, allowed } = await organizationAdmin(request);
    if (!allowed || !session.organization)
      return Response.json(
        {
          error: 'forbidden',
          message:
            'Изменить настройки может владелец или администратор компании.',
        },
        { status: 403 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    const database = await ensureMarketplaceDatabase();
    if (body.action === 'settings') {
      const minutes = Number(body.newLeadSlaMinutes);
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440)
        return Response.json(
          {
            error: 'validation_failed',
            message: 'Время ответа должно быть от 5 до 1440 минут.',
          },
          { status: 400 },
        );
      await database.batch([
        database
          .prepare(`INSERT INTO organization_sales_settings (organization_id, new_lead_sla_minutes)
          VALUES (?, ?) ON CONFLICT(organization_id) DO UPDATE SET new_lead_sla_minutes = excluded.new_lead_sla_minutes, updated_at = CURRENT_TIMESTAMP`)
          .bind(session.organization.id, minutes),
        database
          .prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'user', ?, 'organization.sales_settings_updated', 'organization', ?, ?)`)
          .bind(
            crypto.randomUUID(),
            session.user.id,
            session.organization.id,
            JSON.stringify({ newLeadSlaMinutes: minutes }),
          ),
      ]);
      return Response.json({
        message: 'Время ответа на новые заявки сохранено.',
      });
    }
    if (body.action === 'member_status') {
      const userId = typeof body.userId === 'string' ? body.userId : '';
      const status =
        body.status === 'active' || body.status === 'suspended'
          ? body.status
          : '';
      if (!userId || !status || userId === session.user.id)
        return Response.json(
          {
            error: 'validation_failed',
            message: 'Нельзя изменить собственный доступ.',
          },
          { status: 400 },
        );
      const member = await database
        .prepare(
          `SELECT role FROM organization_memberships WHERE organization_id = ? AND user_id = ? LIMIT 1`,
        )
        .bind(session.organization.id, userId)
        .first<{ role: string }>();
      if (
        !member ||
        member.role === 'OWNER' ||
        (member.role === 'ADMIN' && session.organization.role !== 'OWNER')
      )
        return Response.json(
          {
            error: 'forbidden',
            message: 'Недостаточно прав для изменения этого сотрудника.',
          },
          { status: 403 },
        );
      await database.batch([
        database
          .prepare(
            `UPDATE organization_memberships SET status = ? WHERE organization_id = ? AND user_id = ?`,
          )
          .bind(status, session.organization.id, userId),
        database
          .prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
          VALUES (?, 'user', ?, 'organization.member_status_updated', 'organization', ?, ?)`)
          .bind(
            crypto.randomUUID(),
            session.user.id,
            session.organization.id,
            JSON.stringify({ userId, status }),
          ),
      ]);
      return Response.json({
        message:
          status === 'active'
            ? 'Доступ сотрудника восстановлен.'
            : 'Доступ сотрудника приостановлен.',
      });
    }
    return Response.json(
      { error: 'invalid_action', message: 'Неизвестное действие.' },
      { status: 400 },
    );
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update developer settings', error);
    return Response.json(
      {
        error: 'settings_update_failed',
        message: 'Не удалось сохранить изменения.',
      },
      { status: 500 },
    );
  }
}
