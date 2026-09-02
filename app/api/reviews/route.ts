import { AuthorizationError, authorizationResponse, getAppSession, requireVerifiedPhone } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';
import { PublicReview, ReviewRatings, ReviewsPayload, reviewCategories } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

type ReviewRow = { id: string; user_id: string; author: string; body: string; status: string; trust_level: 'standard' | 'verified_resident'; moderation_reason: string | null; created_at: string; updated_at: string; response_body: string | null; response_updated_at: string | null; response_organization: string | null };
type RatingRow = { review_id: string; category: keyof ReviewRatings; rating: number };

const categoryKeys = reviewCategories.map(([key]) => key);
const emptyRatings = () => Object.fromEntries(categoryKeys.map((key) => [key, 0])) as ReviewRatings;

async function currentUserId(request: Request) {
  try { return (await getAppSession(request)).user.id; } catch (error) { if (error instanceof AuthorizationError) return null; throw error; }
}

function mapReviews(rows: ReviewRow[], ratings: RatingRow[]) {
  const ratingsByReview = new Map<string, ReviewRatings>();
  ratings.forEach((item) => { const current = ratingsByReview.get(item.review_id) ?? emptyRatings(); current[item.category] = Number(item.rating); ratingsByReview.set(item.review_id, current); });
  return rows.map<PublicReview>((row) => {
    const values = ratingsByReview.get(row.id) ?? emptyRatings();
    const overall = categoryKeys.reduce((sum, key) => sum + values[key], 0) / categoryKeys.length;
    return { id: row.id, author: row.author, body: row.body, status: row.status, trustLevel: row.trust_level, createdAt: row.created_at, updatedAt: row.updated_at, overall, ratings: values, response: row.response_body ? { organization: row.response_organization ?? 'Застройщик', body: row.response_body, updatedAt: row.response_updated_at ?? row.updated_at } : null };
  });
}

async function readPayload(database: D1Database, complexId: string, userId: string | null): Promise<ReviewsPayload> {
  const [publicResult, publicRatingsResult, myRow, myRatingsResult, aggregateResult] = await Promise.all([
    database.prepare(`SELECT review.id, review.user_id, user.full_name AS author, review.body, review.status, review.trust_level, review.moderation_reason, review.created_at, review.updated_at,
      response.body AS response_body, response.updated_at AS response_updated_at, organization.name AS response_organization
      FROM reviews review JOIN users user ON user.id = review.user_id
      LEFT JOIN review_responses response ON response.review_id = review.id LEFT JOIN organizations organization ON organization.id = response.organization_id
      WHERE review.complex_id = ? AND review.status = 'published' ORDER BY review.trust_level DESC, review.updated_at DESC`).bind(complexId).all<ReviewRow>(),
    database.prepare(`SELECT rating.review_id, rating.category, rating.rating FROM review_ratings rating JOIN reviews review ON review.id = rating.review_id WHERE review.complex_id = ? AND review.status = 'published'`).bind(complexId).all<RatingRow>(),
    userId ? database.prepare(`SELECT review.id, review.user_id, user.full_name AS author, review.body, review.status, review.trust_level, review.moderation_reason, review.created_at, review.updated_at,
      response.body AS response_body, response.updated_at AS response_updated_at, organization.name AS response_organization
      FROM reviews review JOIN users user ON user.id = review.user_id LEFT JOIN review_responses response ON response.review_id = review.id LEFT JOIN organizations organization ON organization.id = response.organization_id
      WHERE review.complex_id = ? AND review.user_id = ? LIMIT 1`).bind(complexId, userId).first<ReviewRow>() : Promise.resolve(null),
    userId ? database.prepare(`SELECT rating.review_id, rating.category, rating.rating FROM review_ratings rating JOIN reviews review ON review.id = rating.review_id WHERE review.complex_id = ? AND review.user_id = ?`).bind(complexId, userId).all<RatingRow>() : Promise.resolve({ results: [] } as unknown as D1Result<RatingRow>),
    database.prepare(`SELECT rating.category,
      ROUND(SUM(rating.rating * CASE WHEN review.trust_level = 'verified_resident' THEN 2.0 ELSE 1.0 END) / SUM(CASE WHEN review.trust_level = 'verified_resident' THEN 2.0 ELSE 1.0 END), 2) AS rating
      FROM review_ratings rating JOIN reviews review ON review.id = rating.review_id WHERE review.complex_id = ? AND review.status = 'published' GROUP BY rating.category`).bind(complexId).all<{ category: keyof ReviewRatings; rating: number }>(),
  ]);
  const reviews = mapReviews((publicResult.results ?? []) as ReviewRow[], (publicRatingsResult.results ?? []) as RatingRow[]);
  const categories = emptyRatings();
  (aggregateResult.results ?? []).forEach((item) => { categories[item.category] = Number(item.rating); });
  const nonZero = categoryKeys.filter((key) => categories[key] > 0);
  const overall = nonZero.length ? nonZero.reduce((sum, key) => sum + categories[key], 0) / nonZero.length : 0;
  const mappedMine = myRow ? mapReviews([myRow], (myRatingsResult.results ?? []) as RatingRow[])[0] : null;
  return { reviews, aggregate: { overall, total: reviews.length, categories }, myReview: mappedMine && myRow ? { ...mappedMine, moderationReason: myRow.moderation_reason } : null };
}

export async function GET(request: Request) {
  try {
    const complexId = new URL(request.url).searchParams.get('complexId') ?? '';
    if (!complexId) return Response.json({ error: 'complex_required', message: 'Не выбран жилой комплекс.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    return Response.json(await readPayload(database, complexId, await currentUserId(request)), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'reviews_unavailable', message: 'Не удалось загрузить отзывы.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const body = await request.json() as { complexId?: unknown; text?: unknown; ratings?: Partial<ReviewRatings> };
    const complexId = typeof body.complexId === 'string' ? body.complexId : '';
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1500) : '';
    const ratings = body.ratings ?? {};
    if (!complexId || text.length < 20 || !categoryKeys.every((key) => Number.isInteger(Number(ratings[key])) && Number(ratings[key]) >= 1 && Number(ratings[key]) <= 5)) return Response.json({ error: 'validation_failed', message: 'Напишите не менее 20 символов и поставьте оценки по всем шести категориям.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const complex = await database.prepare(`SELECT complex.id FROM complexes complex JOIN complex_publication_workflows workflow ON workflow.complex_id = complex.id AND workflow.status = 'published' WHERE complex.id = ? LIMIT 1`).bind(complexId).first();
    if (!complex) return Response.json({ error: 'not_found', message: 'Жилой комплекс не найден.' }, { status: 404 });
    const [existing, resident] = await Promise.all([
      database.prepare(`SELECT id FROM reviews WHERE user_id = ? AND complex_id = ? LIMIT 1`).bind(session.user.id, complexId).first<{ id: string }>(),
      database.prepare(`SELECT owner.listing_id FROM secondary_listing_owners owner JOIN listings listing ON listing.id = owner.listing_id WHERE owner.seller_user_id = ? AND listing.complex_id = ? AND owner.verification_status = 'approved' LIMIT 1`).bind(session.user.id, complexId).first(),
    ]);
    const reviewId = existing?.id ?? crypto.randomUUID();
    const trustLevel = resident ? 'verified_resident' : 'standard';
    const statements: D1PreparedStatement[] = existing ? [
      database.prepare(`UPDATE reviews SET body = ?, status = 'submitted', trust_level = ?, moderation_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(text, trustLevel, reviewId),
      database.prepare(`DELETE FROM review_ratings WHERE review_id = ?`).bind(reviewId),
      database.prepare(`DELETE FROM review_responses WHERE review_id = ?`).bind(reviewId),
    ] : [database.prepare(`INSERT INTO reviews (id, user_id, complex_id, body, trust_level) VALUES (?, ?, ?, ?, ?)`).bind(reviewId, session.user.id, complexId, text, trustLevel)];
    categoryKeys.forEach((key) => statements.push(database.prepare(`INSERT INTO review_ratings (review_id, category, rating) VALUES (?, ?, ?)`).bind(reviewId, key, Number(ratings[key]))));
    statements.push(database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, ?, 'review', ?, ?)`).bind(crypto.randomUUID(), session.user.id, existing ? 'review.replaced' : 'review.submitted', reviewId, JSON.stringify({ complexId, trustLevel })));
    await database.batch(statements);
    return Response.json({ reviewId, status: 'submitted', trustLevel, message: existing ? 'Изменённый отзыв отправлен на повторную модерацию.' : 'Отзыв отправлен на модерацию.' }, { status: existing ? 200 : 201 });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'review_failed', message: 'Не удалось сохранить отзыв.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireVerifiedPhone(request);
    const body = await request.json() as { reviewId?: unknown; reason?: unknown };
    const reviewId = typeof body.reviewId === 'string' ? body.reviewId : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 250) : '';
    if (!reviewId || reason.length < 5) return Response.json({ error: 'validation_failed', message: 'Укажите причину жалобы.' }, { status: 400 });
    const database = await ensureMarketplaceDatabase();
    const review = await database.prepare(`SELECT id, user_id FROM reviews WHERE id = ? AND status = 'published' LIMIT 1`).bind(reviewId).first<{ id: string; user_id: string }>();
    if (!review) return Response.json({ error: 'not_found', message: 'Опубликованный отзыв не найден.' }, { status: 404 });
    if (review.user_id === session.user.id) return Response.json({ error: 'own_review', message: 'Нельзя пожаловаться на собственный отзыв.' }, { status: 409 });
    await database.batch([
      database.prepare(`INSERT INTO review_reports (id, review_id, reporter_user_id, reason) VALUES (?, ?, ?, ?) ON CONFLICT(review_id, reporter_user_id) DO UPDATE SET reason = excluded.reason, status = 'submitted', updated_at = CURRENT_TIMESTAMP`).bind(crypto.randomUUID(), reviewId, session.user.id, reason),
      database.prepare(`INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json) VALUES (?, 'user', ?, 'review.reported', 'review', ?, ?)`).bind(crypto.randomUUID(), session.user.id, reviewId, JSON.stringify({ reason })),
    ]);
    return Response.json({ reviewId, message: 'Жалоба отправлена модератору.' });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'review_report_failed', message: 'Не удалось отправить жалобу.' }, { status: 500 });
  }
}
