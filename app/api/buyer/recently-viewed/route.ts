import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

type TargetType = 'complex' | 'listing';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT recent.id, recent.target_type, recent.target_id, recent.viewed_at,
      complex.id AS complex_id, complex.slug, complex.name AS complex_name, complex.hero_image_url AS image,
      complex.completion_label, listing.id AS listing_id, listing.price_uzs,
      unit.unit_number, unit.rooms, unit.area_sqm
      FROM buyer_recent_views recent
      LEFT JOIN listings listing ON recent.target_type = 'listing' AND listing.id = recent.target_id
      LEFT JOIN units unit ON unit.id = listing.unit_id
      JOIN complexes complex ON complex.id = CASE WHEN recent.target_type = 'complex' THEN recent.target_id ELSE listing.complex_id END
      JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id AND workflow.status = 'published'
      WHERE recent.user_id = ?
      ORDER BY recent.viewed_at DESC
      LIMIT 12`).bind(session.user.id).all();
    return Response.json({ items: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'recent_views_unavailable', message: 'Не удалось загрузить историю просмотров.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAppSession(request);
    const body = await request.json() as { targetType?: unknown; targetId?: unknown };
    const targetType: TargetType | null = body.targetType === 'complex' || body.targetType === 'listing' ? body.targetType : null;
    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
    if (!targetType || !targetId) return Response.json({ error: 'validation_failed', message: 'Не выбран объект просмотра.' }, { status: 400 });

    const database = await ensureMarketplaceDatabase();
    const target = targetType === 'complex'
      ? await database.prepare(`SELECT id FROM complexes WHERE id = ? AND verification_status = 'verified' LIMIT 1`).bind(targetId).first()
      : await database.prepare(`SELECT id FROM listings WHERE id = ? AND status IN ('published', 'reserved') LIMIT 1`).bind(targetId).first();
    if (!target) return Response.json({ error: 'not_found', message: 'Объект недоступен.' }, { status: 404 });

    await database.batch([
      database.prepare(`INSERT INTO buyer_recent_views (id, user_id, target_type, target_id) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, target_type, target_id) DO UPDATE SET viewed_at = CURRENT_TIMESTAMP`)
        .bind(crypto.randomUUID(), session.user.id, targetType, targetId),
      database.prepare(`DELETE FROM buyer_recent_views WHERE user_id = ? AND id NOT IN (
        SELECT id FROM buyer_recent_views WHERE user_id = ? ORDER BY viewed_at DESC LIMIT 20
      )`).bind(session.user.id, session.user.id),
    ]);
    return Response.json({ tracked: true }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'recent_view_save_failed', message: 'Не удалось сохранить просмотр.' }, { status: 500 });
  }
}
