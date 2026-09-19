import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission(request, 'VIEW_ADMIN');
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT event.id, event.actor_type, event.actor_id, event.action, event.entity_type, event.entity_id,
      event.metadata_json, event.created_at, user.full_name AS actor_name, user.email AS actor_email
      FROM audit_events event LEFT JOIN users user ON user.id = event.actor_id
      WHERE ? = '' OR LOWER(event.action || ' ' || event.entity_type || ' ' || event.entity_id || ' ' || COALESCE(user.full_name, '') || ' ' || COALESCE(user.email, '')) LIKE '%' || ? || '%'
      ORDER BY event.created_at DESC LIMIT 200`).bind(query, query).all();
    return Response.json({ events: (result.results ?? []).map((event) => ({ ...event, metadata: JSON.parse(String(event.metadata_json || '{}')) })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'audit_unavailable', message: 'Не удалось загрузить журнал аудита.' }, { status: 500 });
  }
}
