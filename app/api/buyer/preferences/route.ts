import { authorizationResponse, requireVerifiedPhone } from '@/lib/auth';
import { parseNaturalLanguageQuery } from '@/lib/catalog-service';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

function sanitizeFilters(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const allowed = ['market', 'rooms', 'status', 'seller', 'minPrice', 'maxPrice', 'minArea', 'maxArea', 'minFloor', 'maxFloor', 'district', 'finish', 'verified', 'reservable'];
  const result: Record<string, string | number | boolean> = {};
  for (const key of allowed) {
    const item = source[key];
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') result[key] = item;
  }
  if (typeof source.q === 'string' && source.q.trim()) {
    const parsed = parseNaturalLanguageQuery(source.q);
    for (const filter of parsed.filters) {
      if (filter.key === 'completed' && result.status === undefined) result.status = 'completed';
      else if (filter.key === 'notFirstFloor' && result.minFloor === undefined) result.minFloor = 2;
      else if (filter.key !== 'completed' && filter.key !== 'notFirstFloor' && result[filter.key] === undefined) result[filter.key] = filter.value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

export async function GET(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT id, name, filters_json, notifications_enabled, created_at, updated_at FROM buyer_saved_searches WHERE user_id = ? ORDER BY updated_at DESC`).bind(session.user.id).all();
    return Response.json({ searches: (result.results ?? []).map((row) => ({ ...row, filters: JSON.parse(String(row.filters_json)) })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'preferences_unavailable', message: 'Не удалось загрузить сохранённые поиски.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const body = await request.json() as { name?: unknown; filters?: unknown };
    const filters = sanitizeFilters(body.filters);
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    if (!filters || !name) return Response.json({ error: 'validation_failed', message: 'Добавьте критерии для сохранённого поиска.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const id = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO buyer_saved_searches (id, user_id, name, filters_json) VALUES (?, ?, ?, ?)`)
        .bind(id, session.user.id, name, JSON.stringify(filters)),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'buyer_search.saved', 'saved_search', ?, ?)`)
        .bind(crypto.randomUUID(), session.user.id, id, JSON.stringify(filters)),
    ]);
    return Response.json({ id, name, filters, notificationsEnabled: true }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'preference_save_failed', message: 'Не удалось сохранить поиск.' }, { status: 500 });
  }
}
