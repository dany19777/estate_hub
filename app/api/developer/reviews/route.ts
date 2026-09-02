import { authorizationResponse, requirePermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

async function payload(database: D1Database, organizationId: string) {
  const result = await database.prepare(`SELECT review.id, review.complex_id, complex.name AS complex_name, user.full_name AS author, review.body, review.trust_level, review.updated_at,
    ROUND(AVG(rating.rating), 1) AS overall, response.body AS response_body, response.updated_at AS response_updated_at
    FROM reviews review JOIN complexes complex ON complex.id = review.complex_id AND complex.developer_org_id = ? JOIN users user ON user.id = review.user_id
    JOIN review_ratings rating ON rating.review_id = review.id LEFT JOIN review_responses response ON response.review_id = review.id
    WHERE review.status = 'published' GROUP BY review.id, complex.name, user.full_name, response.body, response.updated_at ORDER BY review.updated_at DESC`).bind(organizationId).all();
  return { reviews: result.results ?? [] };
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission(request, 'VIEW_DEVELOPER_DASHBOARD');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Профиль застройщика не найден.' }, { status: 403 });
    return Response.json(await payload(await ensureMarketplaceDatabase(), session.organization.id), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'developer_reviews_unavailable', message: 'Не удалось загрузить отзывы.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, 'MANAGE_COMPLEXES');
    if (!session.organization) return Response.json({ error: 'organization_required', message: 'Профиль застройщика не найден.' }, { status: 403 });
    const body = await request.json() as { reviewId?: unknown; text?: unknown };
    const reviewId = typeof body.reviewId === 'string' ? body.reviewId : '';
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1000) : '';
    if (!reviewId || text.length < 10) return Response.json({ error: 'validation_failed', message: 'Официальный ответ должен содержать не менее 10 символов.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const review = await database.prepare(`SELECT review.id FROM reviews review JOIN complexes complex ON complex.id = review.complex_id WHERE review.id = ? AND review.status = 'published' AND complex.developer_org_id = ? LIMIT 1`).bind(reviewId, session.organization.id).first();
    if (!review) return Response.json({ error: 'not_found', message: 'Опубликованный отзыв по вашему ЖК не найден.' }, { status: 404 });
    const responseId = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO review_responses (id, review_id, organization_id, responder_user_id, body) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(review_id) DO UPDATE SET body = excluded.body, responder_user_id = excluded.responder_user_id, updated_at = CURRENT_TIMESTAMP`).bind(responseId, reviewId, session.organization.id, session.user.id, text),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'review.developer_responded', 'review', ?, ?)`).bind(crypto.randomUUID(), session.user.id, reviewId, JSON.stringify({ organizationId: session.organization.id })),
    ]);
    return Response.json({ ...(await payload(database, session.organization.id)), message: 'Официальный ответ опубликован.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'developer_review_response_failed', message: 'Не удалось опубликовать ответ.' }, { status: 500 });
  }
}
