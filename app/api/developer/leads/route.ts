import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type LeadRow = {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  complex_name: string;
  listing_id: string | null;
  unit_number: string | null;
  lead_type: string;
  status: string;
  message: string;
  repeated_interaction: number;
  created_at: string;
  requested_date: string | null;
  time_slot: string | null;
  viewing_status: string | null;
};

const allowedActions = new Set(['contacted', 'confirm_viewing', 'lost']);

export async function GET(request: Request) {
  try {
    const session = await requirePermission(request, 'VIEW_DEVELOPER_DASHBOARD');
    if (!session.organization) return Response.json({ leads: [], stats: { total: 0, new: 0, viewings: 0, slaBreaches: 0 }, slaMinutes: 45 });
    const database = await ensureMarketplaceDatabase();
    const [result, setting] = await Promise.all([
      database.prepare(`SELECT
        lead.id, customer.full_name AS customer_name, customer.phone_e164 AS phone, customer.email,
        complex.name AS complex_name, lead.listing_id, unit.unit_number,
        lead.lead_type, lead.status, lead.message, lead.repeated_interaction, lead.created_at,
        viewing.requested_date, viewing.time_slot, viewing.status AS viewing_status
        FROM leads lead
        JOIN crm_customers customer ON customer.id = lead.customer_id
        JOIN complexes complex ON complex.id = lead.complex_id
        LEFT JOIN listings listing ON listing.id = lead.listing_id
        LEFT JOIN units unit ON unit.id = listing.unit_id
        LEFT JOIN viewings viewing ON viewing.lead_id = lead.id
        WHERE lead.organization_id = ?
        ORDER BY CASE lead.status WHEN 'new' THEN 1 WHEN 'contact_required' THEN 2 ELSE 3 END, lead.created_at DESC
        LIMIT 50`).bind(session.organization.id).all<LeadRow>(),
      database.prepare(`SELECT new_lead_sla_minutes FROM organization_sales_settings WHERE organization_id = ? LIMIT 1`).bind(session.organization.id).first<{ new_lead_sla_minutes: number }>(),
    ]);
    const leads = result.results ?? [];
    const slaMinutes = setting?.new_lead_sla_minutes ?? 45;
    const now = Date.now();
    const withSla = leads.map((lead) => ({
      ...lead,
      repeated_interaction: Boolean(lead.repeated_interaction),
      sla_breached: ['new', 'contact_required'].includes(lead.status) && now - new Date(lead.created_at.replace(' ', 'T') + 'Z').getTime() > slaMinutes * 60_000,
    }));
    return Response.json({
      leads: withSla,
      slaMinutes,
      stats: {
        total: leads.length,
        new: leads.filter((lead) => ['new', 'contact_required'].includes(lead.status)).length,
        viewings: leads.filter((lead) => lead.lead_type === 'viewing').length,
        slaBreaches: withSla.filter((lead) => lead.sla_breached).length,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to load developer leads', error);
    return Response.json({ error: 'leads_unavailable', message: 'Не удалось загрузить заявки.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_LEADS');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Не найден профиль компании.' }, { status: 409 });
    const body = await request.json() as Record<string, unknown>;
    const leadId = typeof body.leadId === 'string' ? body.leadId : '';
    const action = typeof body.action === 'string' && allowedActions.has(body.action) ? body.action : null;
    const lostReason = typeof body.lostReason === 'string' ? body.lostReason.trim().slice(0, 250) : '';
    if (!leadId || !action || action === 'lost' && lostReason.length < 3) return Response.json({ error: 'validation_failed', message: action === 'lost' ? 'Укажите причину потери лида.' : 'Не указано действие.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const lead = await database.prepare(`SELECT id, lead_type, status FROM leads WHERE id = ? AND organization_id = ? LIMIT 1`).bind(leadId, session.organization.id).first<{ id: string; lead_type: string; status: string }>();
    if (!lead) return Response.json({ error: 'not_found', message: 'Заявка не найдена.' }, { status: 404 });
    if (['won', 'lost'].includes(lead.status)) return Response.json({ error: 'closed_lead', message: 'Закрытую заявку нельзя изменить.' }, { status: 409 });
    if (action === 'confirm_viewing' && lead.lead_type !== 'viewing') return Response.json({ error: 'invalid_action', message: 'Эта заявка не относится к просмотру.' }, { status: 409 });
    const nextStatus = action === 'contacted' ? 'contacted' : action === 'confirm_viewing' ? 'viewing_scheduled' : 'lost';
    const statements = [
      database.prepare(`UPDATE leads SET status = ?, lost_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(nextStatus, action === 'lost' ? lostReason : null, leadId),
      database.prepare(`INSERT INTO lead_activities (id, lead_id, actor_type, actor_id, activity_type, metadata_json) VALUES (?, ?, 'user', ?, ?, ?)`)
        .bind(crypto.randomUUID(), leadId, session.user.id, `lead.${nextStatus}`, JSON.stringify(action === 'lost' ? { lostReason } : {})),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, 'lead', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, `lead.${nextStatus}`, leadId, JSON.stringify(action === 'lost' ? { lostReason } : {})),
    ];
    if (action === 'confirm_viewing') statements.push(database.prepare(`UPDATE viewings SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE lead_id = ?`).bind(leadId));
    await database.batch(statements);
    return Response.json({ leadId, status: nextStatus, message: action === 'confirm_viewing' ? 'Просмотр подтверждён.' : action === 'contacted' ? 'Контакт отмечен.' : 'Лид закрыт.' });
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error('Failed to update developer lead', error);
    return Response.json({ error: 'lead_update_failed', message: 'Не удалось обновить заявку.' }, { status: 500 });
  }
}
