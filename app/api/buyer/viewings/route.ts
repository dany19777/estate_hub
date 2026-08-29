import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT viewing.id, viewing.requested_date, viewing.time_slot, viewing.status, c.name AS complex_name, c.slug, u.unit_number
      FROM viewings viewing
      JOIN leads lead ON lead.id = viewing.lead_id
      JOIN crm_customers customer ON customer.id = lead.customer_id
      JOIN complexes c ON c.id = lead.complex_id
      LEFT JOIN listings l ON l.id = lead.listing_id
      LEFT JOIN units u ON u.id = l.unit_id
      WHERE customer.buyer_user_id = ? AND viewing.status NOT IN ('cancelled', 'attended', 'no_show')
      ORDER BY viewing.requested_date ASC, viewing.time_slot ASC`).bind(session.user.id).all();
    return Response.json({ viewings: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'viewings_unavailable', message: 'Не удалось загрузить просмотры.' }, { status: 500 });
  }
}
