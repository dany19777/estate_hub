import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    await database.batch([
      database.prepare(`UPDATE reservation_transactions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE buyer_user_id = ? AND status = 'confirmed' AND payment_reference LIKE 'LOCAL-DEMO-%' AND reservation_expires_at <= CURRENT_TIMESTAMP`).bind(session.user.id),
      database.prepare(`UPDATE units SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE availability_status = 'reserved' AND id IN (SELECT unit_id FROM reservation_transactions WHERE buyer_user_id = ? AND status = 'expired' AND payment_reference LIKE 'LOCAL-DEMO-%') AND NOT EXISTS (SELECT 1 FROM reservation_transactions active WHERE active.unit_id = units.id AND active.status IN ('payment_hold', 'confirmed'))`).bind(session.user.id),
      database.prepare(`UPDATE listings SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE status = 'reserved' AND id IN (SELECT listing_id FROM reservation_transactions WHERE buyer_user_id = ? AND status = 'expired' AND payment_reference LIKE 'LOCAL-DEMO-%') AND NOT EXISTS (SELECT 1 FROM reservation_transactions active WHERE active.listing_id = listings.id AND active.status IN ('payment_hold', 'confirmed'))`).bind(session.user.id),
    ]);
    const result = await database
      .prepare(`SELECT r.id, r.listing_id, r.status, r.payment_status, r.payment_reference, r.price_uzs, r.reservation_fee_uzs, r.hold_expires_at, r.reservation_expires_at,
      c.slug, c.name AS complex_name, c.hero_image_url AS image, u.unit_number, u.rooms, u.area_sqm, o.name AS seller
      FROM reservation_transactions r
      JOIN listings l ON l.id = r.listing_id
      JOIN units u ON u.id = r.unit_id
      JOIN complexes c ON c.id = r.complex_id
      JOIN organizations o ON o.id = r.organization_id
      WHERE r.buyer_user_id = ? AND r.status IN ('payment_hold', 'confirmed')
      ORDER BY CASE r.status WHEN 'payment_hold' THEN 0 ELSE 1 END, r.created_at DESC`)
      .bind(session.user.id)
      .all();
    return Response.json(
      { reservations: result.results ?? [] },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return (
      authorizationResponse(error) ??
      Response.json(
        {
          error: 'reservations_unavailable',
          message: 'Не удалось загрузить бронирования.',
        },
        { status: 500 },
      )
    );
  }
}
