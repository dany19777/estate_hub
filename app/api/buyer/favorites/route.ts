import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type FavoriteRow = { id: string; slug: string; name: string; image: string; price_from: number; available_units: number; completion_label: string };

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT c.id, c.slug, c.name, c.hero_image_url AS image, MIN(l.price_uzs) AS price_from, COUNT(l.id) AS available_units, c.completion_label
      FROM buyer_favorites favorite
      JOIN complexes c ON c.id = favorite.complex_id
      JOIN complex_publication_workflows workflow ON workflow.complex_id = c.id AND workflow.status = 'published'
      LEFT JOIN listings l ON l.complex_id = c.id AND l.status = 'published'
        AND EXISTS (SELECT 1 FROM units u WHERE u.id = l.unit_id AND u.availability_status = 'available')
        AND (l.seller_org_id IS NULL OR EXISTS (SELECT 1 FROM organizations seller WHERE seller.id = l.seller_org_id AND seller.verification_status = 'verified'))
        AND (l.market_type = 'PRIMARY_DEVELOPER' OR (
          EXISTS (SELECT 1 FROM secondary_listing_owners owner WHERE owner.listing_id = l.id AND owner.verification_status = 'approved')
          AND EXISTS (SELECT 1 FROM secondary_listing_purchases purchase JOIN billing_events payment ON payment.id = purchase.billing_event_id
            WHERE purchase.listing_id = l.id AND purchase.status = 'active' AND purchase.period_end > CURRENT_TIMESTAMP
              AND payment.status = 'paid' AND payment.provider IN ('offline_bank_transfer', 'offline_card_transfer'))))
      WHERE favorite.user_id = ? GROUP BY c.id ORDER BY MAX(favorite.created_at) DESC`).bind(session.user.id).all<FavoriteRow>();
    return Response.json({ favorites: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'favorites_unavailable', message: 'Не удалось загрузить избранное.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession(request);
    const { complexId } = await request.json() as { complexId?: unknown };
    if (typeof complexId !== 'string' || !complexId) return Response.json({ error: 'validation_failed', message: 'Не выбран жилой комплекс.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const complex = await database.prepare(`SELECT c.id FROM complexes c JOIN complex_publication_workflows workflow ON workflow.complex_id = c.id AND workflow.status = 'published' WHERE c.id = ? LIMIT 1`).bind(complexId).first<{ id: string }>();
    if (!complex) return Response.json({ error: 'complex_unavailable', message: 'Этот жилой комплекс недоступен.' }, { status: 409 });
    await database.batch([
      database.prepare(`INSERT OR IGNORE INTO buyer_favorites (user_id, complex_id) VALUES (?, ?)`).bind(session.user.id, complexId),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'favorite.added', 'complex', ?, '{}')`).bind(crypto.randomUUID(), session.user.id, complexId),
    ]);
    return Response.json({ complexId, saved: true }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'favorite_save_failed', message: 'Не удалось сохранить объект.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAppSession(request);
    const complexId = new URL(request.url).searchParams.get('complexId');
    if (!complexId) return Response.json({ error: 'validation_failed', message: 'Не выбран жилой комплекс.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    await database.batch([
      database.prepare(`DELETE FROM buyer_favorites WHERE user_id = ? AND complex_id = ?`).bind(session.user.id, complexId),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'favorite.removed', 'complex', ?, '{}')`).bind(crypto.randomUUID(), session.user.id, complexId),
    ]);
    return Response.json({ complexId, saved: false });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'favorite_remove_failed', message: 'Не удалось удалить объект из избранного.' }, { status: 500 });
  }
}
