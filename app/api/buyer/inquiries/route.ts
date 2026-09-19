import { authorizationResponse, getAppSession } from '@/lib/auth';
import { ensureMarketplaceDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const result = await database.prepare(`SELECT lead.id, lead.lead_type, lead.status, lead.source, lead.message,
      lead.created_at, lead.updated_at, complex.id AS complex_id, complex.slug,
      complex.name AS complex_name, complex.hero_image_url AS image,
      listing.id AS listing_id, unit.unit_number
      FROM leads lead
      JOIN crm_customers customer ON customer.id = lead.customer_id
      JOIN complexes complex ON complex.id = lead.complex_id
      LEFT JOIN listings listing ON listing.id = lead.listing_id
      LEFT JOIN units unit ON unit.id = listing.unit_id
      WHERE customer.buyer_user_id = ?
      ORDER BY lead.updated_at DESC
      LIMIT 30`).bind(session.user.id).all();
    return Response.json({ inquiries: result.results ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return authorizationResponse(error) ?? Response.json({ error: 'inquiries_unavailable', message: 'Не удалось загрузить обращения.' }, { status: 500 });
  }
}
