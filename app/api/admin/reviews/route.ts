import { authorizationResponse, requirePermission, requirePlatformPermission } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission(request, 'VIEW_ADMIN');
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT review.id, review.complex_id, complex.name AS complex_name, user.full_name AS author, review.body, review.status, review.trust_level,
      review.moderation_reason, review.created_at, review.updated_at, ROUND(AVG(rating.rating), 1) AS overall,
      COUNT(DISTINCT CASE WHEN report.status = 'submitted' THEN report.id END) AS report_count,
      MAX(CASE WHEN report.status = 'submitted' THEN report.reason END) AS latest_report_reason
      FROM reviews review JOIN complexes complex ON complex.id = review.complex_id JOIN users user ON user.id = review.user_id
      JOIN review_ratings rating ON rating.review_id = review.id LEFT JOIN review_reports report ON report.review_id = review.id
      WHERE review.status = 'submitted' OR report.status = 'submitted'
      GROUP BY review.id, complex.name, user.full_name ORDER BY CASE WHEN COUNT(DISTINCT CASE WHEN report.status = 'submitted' THEN report.id END) > 0 THEN 0 ELSE 1 END, review.updated_at ASC`).all();
    const stats = await database.prepare(`SELECT
      (SELECT COUNT(*) FROM reviews WHERE status = 'submitted') AS pending,
      (SELECT COUNT(*) FROM reviews WHERE status = 'published') AS published,
      (SELECT COUNT(*) FROM reviews WHERE status = 'hidden') AS hidden,
      (SELECT COUNT(*) FROM review_reports WHERE status = 'submitted') AS reports`).first();
    return Response.json({ queue: result.results ?? [], stats: stats ?? { pending: 0, published: 0, hidden: 0, reports: 0 } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'reviews_unavailable', message: 'Не удалось загрузить модерацию отзывов.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePlatformPermission(request, 'MODERATE_LISTINGS');
    const body = await request.json() as Record<string, unknown>;
    const reviewId = typeof body.reviewId === 'string' ? body.reviewId : '';
    const decision = body.decision === 'publish' || body.decision === 'reject' || body.decision === 'hide' || body.decision === 'restore' || body.decision === 'dismiss_report' ? body.decision : null;
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 250) : '';
    if (!reviewId || !decision) return Response.json({ error: 'validation_failed', message: 'Не выбрано решение по отзыву.' }, { status: 400 });
    if (['reject', 'hide'].includes(decision) && reason.length < 3) return Response.json({ error: 'reason_required', message: 'Укажите причину решения.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const review = await database.prepare(`SELECT id, complex_id, status FROM reviews WHERE id = ? LIMIT 1`).bind(reviewId).first<{ id: string; complex_id: string; status: string }>();
    if (!review) return Response.json({ error: 'not_found', message: 'Отзыв не найден.' }, { status: 404 });
    if (decision === 'dismiss_report') {
      await database.batch([
        database.prepare(`UPDATE review_reports SET status = 'dismissed', updated_at = CURRENT_TIMESTAMP WHERE review_id = ? AND status = 'submitted'`).bind(reviewId),
        database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'review.report_dismissed', 'review', ?, '{}')`).bind(crypto.randomUUID(), session.user.id, reviewId),
      ]);
      return Response.json({ reviewId, status: review.status, message: 'Жалоба отклонена, отзыв остаётся опубликованным.' });
    }
    const nextStatus = decision === 'publish' || decision === 'restore' ? 'published' : decision === 'hide' ? 'hidden' : 'rejected';
    const moderationDecision = decision === 'publish' ? 'published' : decision === 'restore' ? 'restored' : decision === 'hide' ? 'hidden' : 'rejected';
    await database.batch([
      database.prepare(`UPDATE reviews SET status = ?, moderation_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(nextStatus, reason || null, session.user.id, reviewId),
      database.prepare(`INSERT INTO review_moderation_events (id, review_id, decision, reason, reviewed_by) VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), reviewId, moderationDecision, reason || null, session.user.id),
      database.prepare(`UPDATE review_reports SET status = 'reviewed', updated_at = CURRENT_TIMESTAMP WHERE review_id = ? AND status = 'submitted'`).bind(reviewId),
      database.prepare(`UPDATE complexes SET rating = COALESCE((SELECT ROUND(SUM(rating.rating * CASE WHEN review.trust_level = 'verified_resident' THEN 2.0 ELSE 1.0 END) / SUM(CASE WHEN review.trust_level = 'verified_resident' THEN 2.0 ELSE 1.0 END), 1)
        FROM review_ratings rating JOIN reviews review ON review.id = rating.review_id WHERE review.complex_id = ? AND review.status = 'published'), 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(review.complex_id, review.complex_id),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, 'review', ?, ?)`).bind(crypto.randomUUID(), session.user.id, `review.moderation_${moderationDecision}`, reviewId, JSON.stringify({ reason: reason || null, complexId: review.complex_id })),
    ]);
    return Response.json({ reviewId, status: nextStatus, message: nextStatus === 'published' ? 'Отзыв опубликован.' : nextStatus === 'hidden' ? 'Отзыв скрыт по результатам жалобы.' : 'Отзыв отклонён.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'review_moderation_failed', message: 'Не удалось сохранить решение.' }, { status: 500 });
  }
}
