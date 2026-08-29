import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT r.id, r.status, r.payment_status, r.price_uzs, r.reservation_fee_uzs, r.hold_expires_at, r.reservation_expires_at,
      c.slug, c.name AS complex_name, c.hero_image_url AS image, u.unit_number, u.rooms, u.area_sqm
      FROM reservation_transactions r
      JOIN listings l ON l.id = r.listing_id
      JOIN units u ON u.id = r.unit_id
      JOIN complexes c ON c.id = r.complex_id
      WHERE r.buyer_user_id = ? AND r.status IN ('payment_hold', 'confirmed')
      ORDER BY CASE r.status WHEN 'payment_hold' THEN 0 ELSE 1 END, r.created_at DESC`).bind(session.user.id).all();
    return Response.json({ reservations: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'reservations_unavailable', message: 'Не удалось загрузить бронирования.' }, { status: 500 });
  }
}
