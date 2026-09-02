import { authorizationResponse, requireVerifiedPhone } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type TargetType = 'complex' | 'listing' | 'saved_search';

async function watchlistPayload(database: D1Database, userId: string) {
  const result = await database.prepare(`SELECT watch.id, watch.target_type, watch.target_id, watch.notify_price_reduction, watch.notify_availability,
    watch.notify_special_offer, watch.notify_new_inventory, watch.active, watch.created_at, watch.updated_at,
    COALESCE(complex.name, listing_complex.name, search.name, 'Подписка') AS target_name,
    COALESCE(complex.slug, listing_complex.slug) AS slug,
    listing.id AS listing_id, unit.unit_number
    FROM buyer_watch_subscriptions watch
    LEFT JOIN complexes complex ON watch.target_type = 'complex' AND complex.id = watch.target_id
    LEFT JOIN listings listing ON watch.target_type = 'listing' AND listing.id = watch.target_id
    LEFT JOIN units unit ON unit.id = listing.unit_id
    LEFT JOIN complexes listing_complex ON listing_complex.id = listing.complex_id
    LEFT JOIN buyer_saved_searches search ON watch.target_type = 'saved_search' AND search.id = watch.target_id AND search.user_id = watch.user_id
    WHERE watch.user_id = ? AND watch.active = 1 ORDER BY watch.updated_at DESC`).bind(userId).all();
  return { subscriptions: result.results ?? [] };
}

async function validTarget(database: D1Database, userId: string, targetType: TargetType, targetId: string) {
  if (targetType === 'complex') return database.prepare(`SELECT complex.id FROM complexes complex JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id AND workflow.status = 'published' WHERE complex.id = ? LIMIT 1`).bind(targetId).first();
  if (targetType === 'listing') return database.prepare(`SELECT id FROM listings WHERE id = ? AND status IN ('published', 'reserved') LIMIT 1`).bind(targetId).first();
  return database.prepare(`SELECT id FROM buyer_saved_searches WHERE id = ? AND user_id = ? LIMIT 1`).bind(targetId, userId).first();
}

export async function GET(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const database = await ensureMarketplaceDatabase();
    return Response.json(await watchlistPayload(database, session.user.id), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'watchlist_unavailable', message: 'Не удалось загрузить подписки.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const body = await request.json() as Record<string, unknown>;
    const targetType: TargetType | null = body.targetType === 'complex' || body.targetType === 'listing' || body.targetType === 'saved_search' ? body.targetType : null;
    const targetId = typeof body.targetId === 'string' ? body.targetId : '';
    if (!targetType || !targetId) return Response.json({ error: 'validation_failed', message: 'Не выбран объект подписки.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    if (!await validTarget(database, session.user.id, targetType, targetId)) return Response.json({ error: 'target_unavailable', message: 'Объект подписки недоступен.' }, { status: 404 });
    const settings = {
      price: body.notifyPriceReduction !== false ? 1 : 0,
      availability: body.notifyAvailability !== false ? 1 : 0,
      special: body.notifySpecialOffer !== false ? 1 : 0,
      inventory: body.notifyNewInventory !== false ? 1 : 0,
    };
    const id = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO buyer_watch_subscriptions
        (id, user_id, target_type, target_id, notify_price_reduction, notify_availability, notify_special_offer, notify_new_inventory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, target_type, target_id) DO UPDATE SET notify_price_reduction = excluded.notify_price_reduction,
          notify_availability = excluded.notify_availability, notify_special_offer = excluded.notify_special_offer,
          notify_new_inventory = excluded.notify_new_inventory, active = 1, updated_at = CURRENT_TIMESTAMP`)
        .bind(id, session.user.id, targetType, targetId, settings.price, settings.availability, settings.special, settings.inventory),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'watchlist.saved', ?, ?, ?)`).bind(crypto.randomUUID(), session.user.id, targetType, targetId, JSON.stringify(settings)),
    ]);
    return Response.json({ ...(await watchlistPayload(database, session.user.id)), message: 'Подписка сохранена. Новые события появятся в центре уведомлений.' }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'watchlist_save_failed', message: 'Не удалось сохранить подписку.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const url = new URL(request.url);
    const targetType = url.searchParams.get('targetType');
    const targetId = url.searchParams.get('targetId');
    if (!targetId || !['complex', 'listing', 'saved_search'].includes(targetType ?? '')) return Response.json({ error: 'validation_failed', message: 'Подписка не найдена.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    await database.batch([
      database.prepare(`UPDATE buyer_watch_subscriptions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND target_type = ? AND target_id = ?`).bind(session.user.id, targetType, targetId),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'watchlist.removed', ?, ?, '{}')`).bind(crypto.randomUUID(), session.user.id, targetType, targetId),
    ]);
    return Response.json({ ...(await watchlistPayload(database, session.user.id)), message: 'Подписка отключена.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'watchlist_remove_failed', message: 'Не удалось отключить подписку.' }, { status: 500 });
  }
}
