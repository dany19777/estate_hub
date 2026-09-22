import { authorizationResponse, getAppSession } from '@/lib/auth';
import { buildCatalog } from '@/lib/catalog-service';
import { ensureMarketplaceDatabase, readMarketplaceData } from '@/lib/database';
import type { CatalogQuery } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';

type SavedRow = { name: string; filters_json: string };
type BehaviorRow = { district: string; average_price: number | null; average_rooms: number | null; signals: number };

function safeQuery(value: string): CatalogQuery {
  try {
    const source = JSON.parse(value) as Record<string, unknown>;
    const query: CatalogQuery = { market: 'all', verified: true, sort: 'recommended', limit: 6 };
    if (source.market === 'primary' || source.market === 'secondary' || source.market === 'all') query.market = source.market;
    if (source.status === 'completed' || source.status === 'under_construction') query.status = source.status;
    if (source.seller === 'developer' || source.seller === 'owner' || source.seller === 'agency') query.seller = source.seller;
    for (const key of ['rooms', 'minPrice', 'maxPrice', 'minArea', 'maxArea', 'minFloor', 'maxFloor'] as const) if (typeof source[key] === 'number') query[key] = source[key];
    if (typeof source.district === 'string') query.district = source.district;
    if (typeof source.finish === 'string') query.finish = source.finish;
    if (source.reservable === true) query.reservable = true;
    return query;
  } catch { return { market: 'all', verified: true, sort: 'recommended', limit: 6 }; }
}

export async function GET(request: Request) {
  try {
    const session = await getAppSession(request);
    const database = await ensureMarketplaceDatabase();
    const saved = await database.prepare(`SELECT name, filters_json FROM buyer_saved_searches WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`).bind(session.user.id).first<SavedRow>();
    const behavior = await database.prepare(`SELECT d.name_ru AS district, AVG(l.price_uzs) AS average_price, AVG(u.rooms) AS average_rooms, COUNT(DISTINCT c.id) AS signals
      FROM buyer_favorites favorite JOIN complexes c ON c.id = favorite.complex_id JOIN districts d ON d.id = c.district_id LEFT JOIN listings l ON l.complex_id = c.id AND l.status = 'published' LEFT JOIN units u ON u.id = l.unit_id AND u.availability_status = 'available'
      WHERE favorite.user_id = ? GROUP BY d.name_ru ORDER BY signals DESC LIMIT 1`).bind(session.user.id).first<BehaviorRow>();
    const query = saved ? safeQuery(saved.filters_json) : behavior ? { market: 'all' as const, district: behavior.district, rooms: behavior.average_rooms ? Math.round(behavior.average_rooms) : undefined, maxPrice: behavior.average_price ? Math.round(behavior.average_price * 1.15) : undefined, verified: true, sort: 'recommended' as const, limit: 6 } : { market: 'all' as const, verified: true, sort: 'recommended' as const, limit: 6 };
    const { complexes, listings } = await readMarketplaceData();
    const catalog = buildCatalog(complexes, listings, query);
    const selected = catalog.items.length ? catalog.items : catalog.alternatives;
    const recommendations = selected.map((item) => ({ ...item, reasons: [query.district === item.district ? `Район ${item.district}` : '', query.rooms && item.minRooms <= query.rooms && item.maxRooms >= query.rooms ? `${query.rooms}-комнатные варианты` : '', query.maxPrice && item.priceFrom <= query.maxPrice ? 'В пределах сохранённого бюджета' : '', item.completionStatus === 'completed' ? 'ЖК сдан' : '', item.reservable ? 'Можно связаться с застройщиком' : ''].filter(Boolean).slice(0, 3) }));
    return Response.json({ basis: saved ? { type: 'saved_search', label: saved.name } : behavior ? { type: 'favorites', label: `Интерес к району ${behavior.district}` } : { type: 'catalog', label: 'Проверенные предложения Самарканда' }, recommendations, disclosure: 'Рекомендации рассчитаны по сохранённым критериям и действиям в EstateHub. Они не являются инвестиционной рекомендацией.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to build buyer recommendations', error);
    return authorizationResponse(error) ?? Response.json({ error: 'recommendations_unavailable', message: 'Не удалось загрузить рекомендации.' }, { status: 500 });
  }
}
