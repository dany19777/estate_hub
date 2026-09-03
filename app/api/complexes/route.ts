import { buildCatalog } from '@/lib/catalog-service';
import { readMarketplaceData } from '@/lib/database';
import type { CatalogQuery, SellerType } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';

function positiveNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function booleanValue(value: string | null) {
  return value === 'true' ? true : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketParam = searchParams.get('market');
    const statusParam = searchParams.get('status');
    const sellerParam = searchParams.get('seller');
    const sortParam = searchParams.get('sort');
    const excludedFilters = new Set(['city', 'complex', 'rooms', 'minPrice', 'maxPrice', 'completed', 'notFirstFloor', 'minFloor', 'maxFloor', 'minArea', 'maxArea', 'reservable', 'specialOffer', 'market', 'seller', 'district', 'finish']);
    const query: CatalogQuery = {
      market: marketParam === 'primary' || marketParam === 'secondary' ? marketParam : 'all',
      q: searchParams.get('q')?.trim() || undefined,
      city: searchParams.get('city')?.trim() || undefined,
      complex: searchParams.get('complex')?.trim() || undefined,
      rooms: positiveNumber(searchParams.get('rooms')),
      status: statusParam === 'completed' || statusParam === 'under_construction' ? statusParam : undefined,
      seller: sellerParam === 'developer' || sellerParam === 'owner' || sellerParam === 'agency' ? sellerParam as SellerType : undefined,
      minPrice: positiveNumber(searchParams.get('minPrice')),
      maxPrice: positiveNumber(searchParams.get('maxPrice')),
      minArea: positiveNumber(searchParams.get('minArea')),
      maxArea: positiveNumber(searchParams.get('maxArea')),
      minFloor: positiveNumber(searchParams.get('minFloor')),
      maxFloor: positiveNumber(searchParams.get('maxFloor')),
      district: searchParams.get('district')?.trim() || undefined,
      finish: searchParams.get('finish')?.trim() || undefined,
      verified: booleanValue(searchParams.get('verified')),
      reservable: booleanValue(searchParams.get('reservable')),
      specialOffer: booleanValue(searchParams.get('specialOffer')),
      sort: sortParam === 'price_asc' || sortParam === 'price_desc' || sortParam === 'price_per_sqm' || sortParam === 'newest' || sortParam === 'area_desc' ? sortParam : 'recommended',
      surface: searchParams.get('surface') === 'homepage' ? 'homepage' : 'search',
      excludeParsed: (searchParams.get('excludeParsed') ?? '').split(',').filter((key) => excludedFilters.has(key)),
      limit: positiveNumber(searchParams.get('limit')),
    };
    const { complexes, listings } = await readMarketplaceData();
    return Response.json(buildCatalog(complexes, listings, query), {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Failed to load marketplace catalog', error);
    return Response.json(
      { error: 'catalog_unavailable', message: 'Не удалось загрузить каталог. Попробуйте ещё раз.' },
      { status: 500 },
    );
  }
}
