import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT l.id, c.slug, c.name AS complex_name, c.hero_image_url AS image, u.unit_number, u.rooms, u.area_sqm, u.floor_number, u.total_floors, u.finish, l.price_uzs, l.market_type, l.reserve_enabled, c.completion_label
      FROM buyer_comparisons comparison
      JOIN listings l ON l.id = comparison.listing_id
      JOIN units u ON u.id = l.unit_id
      JOIN complexes c ON c.id = l.complex_id
      WHERE comparison.user_id = ? ORDER BY comparison.created_at ASC`).bind(session.user.id).all();
    return Response.json({ items: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'comparison_unavailable', message: 'Не удалось загрузить сравнение.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession(request);
    const { listingId } = await request.json() as { listingId?: unknown };
    if (typeof listingId !== 'string' || !listingId) return Response.json({ error: 'validation_failed', message: 'Не выбрана квартира.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const listing = await database.prepare(`SELECT l.id FROM listings l JOIN units u ON u.id = l.unit_id WHERE l.id = ? AND l.status = 'published' AND u.availability_status = 'available' LIMIT 1`).bind(listingId).first<{ id: string }>();
    if (!listing) return Response.json({ error: 'listing_unavailable', message: 'Эта квартира больше недоступна для сравнения.' }, { status: 409 });
    const already = await database.prepare(`SELECT 1 AS value FROM buyer_comparisons WHERE user_id = ? AND listing_id = ?`).bind(session.user.id, listingId).first();
    if (already) return Response.json({ listingId, selected: true, duplicate: true });
    const inserted = await database.prepare(`INSERT INTO buyer_comparisons (user_id, listing_id)
      SELECT ?, ? WHERE (SELECT COUNT(*) FROM buyer_comparisons WHERE user_id = ?) < 4`).bind(session.user.id, listingId, session.user.id).run();
    if ((inserted.meta.changes ?? 0) === 0) return Response.json({ error: 'comparison_limit', message: 'В сравнении может быть не больше четырёх квартир.' }, { status: 409 });
    await database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'comparison.added', 'listing', ?, '{}')`).bind(crypto.randomUUID(), session.user.id, listingId).run();
    return Response.json({ listingId, selected: true }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'comparison_save_failed', message: 'Не удалось добавить квартиру к сравнению.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAppSession(request);
    const listingId = new URL(request.url).searchParams.get('listingId');
    if (!listingId) return Response.json({ error: 'validation_failed', message: 'Не выбрана квартира.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    await database.prepare(`DELETE FROM buyer_comparisons WHERE user_id = ? AND listing_id = ?`).bind(session.user.id, listingId).run();
    return Response.json({ listingId, selected: false });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'comparison_remove_failed', message: 'Не удалось удалить квартиру из сравнения.' }, { status: 500 });
  }
}
