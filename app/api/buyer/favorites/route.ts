import { authorizationResponse, requireVerifiedPhone } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type FavoriteRow = { id: string; slug: string; name: string; image: string; price_from: number; available_units: number; completion_label: string };

export async function GET(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT c.id, c.slug, c.name, c.hero_image_url AS image, MIN(l.price_uzs) AS price_from, COUNT(l.id) AS available_units, c.completion_label
      FROM buyer_favorites favorite
      JOIN complexes c ON c.id = favorite.complex_id
      JOIN complex_publication_workflows workflow ON workflow.complex_id = c.id AND workflow.status = 'published'
      LEFT JOIN listings l ON l.complex_id = c.id AND l.status = 'published'
      LEFT JOIN units u ON u.id = l.unit_id AND u.availability_status = 'available'
      WHERE favorite.user_id = ? GROUP BY c.id ORDER BY favorite.created_at DESC`).bind(session.user.id).all<FavoriteRow>();
    return Response.json({ favorites: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'favorites_unavailable', message: 'Не удалось загрузить избранное.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
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
    const session = await requireVerifiedPhone(request);
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
