import type {
  CatalogQuery,
  CatalogResponse,
  ComplexRecord,
  ComplexSummary,
  ListingRecord,
  ParsedFilter,
} from '@/lib/marketplace';

type ParsedSearch = {
  filters: ParsedFilter[];
  unsupportedCriteria: string[];
};

export function parseNaturalLanguageQuery(query: string): ParsedSearch {
  const normalized = query.toLowerCase().replace(/ё/g, 'е').trim();
  const filters: ParsedFilter[] = [];
  const unsupportedCriteria: string[] = [];

  const roomMatch = normalized.match(/(?:^|\s)([1-4])(?:\s*[-–]?\s*)(?:комнат|комн\.)/) ??
    (/(?:двуш|двухкомнат)/.test(normalized) ? ['', '2'] : null) ??
    (/(?:треш|трехкомнат)/.test(normalized) ? ['', '3'] : null) ??
    (/(?:однуш|однокомнат)/.test(normalized) ? ['', '1'] : null);
  if (roomMatch?.[1]) {
    const rooms = Number(roomMatch[1]);
    filters.push({ key: 'rooms', label: `${rooms} ${rooms === 1 ? 'комната' : 'комнаты'}`, value: rooms });
  }

  const maxPriceMatch = normalized.match(/(?:до|не дороже)\s*([\d.,]+)\s*(млн|миллион|млрд|миллиард)/);
  if (maxPriceMatch) {
    const numeric = Number(maxPriceMatch[1].replace(',', '.'));
    const maxPrice = Math.round(numeric * (maxPriceMatch[2].startsWith('млрд') || maxPriceMatch[2].startsWith('миллиард') ? 1_000_000_000 : 1_000_000));
    filters.push({ key: 'maxPrice', label: `до ${maxPrice / 1_000_000} млн`, value: maxPrice });
  }

  if (/(?:сдан|готов(?:ом|ый|ом доме)?|заселен)/.test(normalized)) {
    filters.push({ key: 'completed', label: 'сдан', value: true });
  }
  if (/(?:не\s+на\s+перв|не\s+первый\s+этаж|выше\s+первого)/.test(normalized)) {
    filters.push({ key: 'notFirstFloor', label: 'не первый этаж', value: true });
  }
  if (/(?:онлайн[- ]?брон|забронировать онлайн)/.test(normalized)) {
    filters.push({ key: 'reservable', label: 'онлайн-бронь', value: true });
  }

  const unsupported = [
    { pattern: /(?:вид\s+на|с видом)/, label: 'вид из окна' },
    { pattern: /(?:тихий|тишина)/, label: 'уровень шума' },
    { pattern: /(?:рядом\s+со\s+школ|школа\s+рядом)/, label: 'расстояние до школы' },
  ];
  for (const item of unsupported) {
    if (item.pattern.test(normalized)) unsupportedCriteria.push(item.label);
  }

  return { filters, unsupportedCriteria };
}

function hasMarket(listing: ListingRecord, market: CatalogQuery['market']) {
  if (!market || market === 'all') return true;
  if (market === 'primary') return listing.marketType === 'PRIMARY_DEVELOPER';
  return listing.marketType !== 'PRIMARY_DEVELOPER';
}

function matchesSeller(listing: ListingRecord, seller: CatalogQuery['seller']) {
  return !seller || listing.sellerType === seller;
}

export function buildCatalog(
  complexes: ComplexRecord[],
  listings: ListingRecord[],
  query: CatalogQuery,
): CatalogResponse {
  const parsed = parseNaturalLanguageQuery(query.q ?? '');
  const parsedRooms = parsed.filters.find((filter) => filter.key === 'rooms')?.value as number | undefined;
  const parsedMaxPrice = parsed.filters.find((filter) => filter.key === 'maxPrice')?.value as number | undefined;
  const wantsCompleted = parsed.filters.some((filter) => filter.key === 'completed');
  const wantsNotFirstFloor = parsed.filters.some((filter) => filter.key === 'notFirstFloor');
  const wantsReservable = parsed.filters.some((filter) => filter.key === 'reservable');
  const rooms = query.rooms ?? parsedRooms;
  const maxPrice = query.maxPrice ?? parsedMaxPrice;
  const normalizedText = (query.q ?? '').toLowerCase().trim();
  const useTextSearch = normalizedText.length > 0 && parsed.filters.length === 0;

  const items = complexes.flatMap<ComplexSummary>((complex) => {
    if (query.verified && (!complex.developerVerified || !complex.complexVerified)) return [];
    if ((query.status === 'completed' || wantsCompleted) && complex.completionStatus !== 'completed') return [];
    if (query.status === 'under_construction' && complex.completionStatus !== 'under_construction') return [];
    if (useTextSearch && !`${complex.name} ${complex.city} ${complex.district} ${complex.address} ${complex.developer}`.toLowerCase().includes(normalizedText)) return [];

    const matchingListings = listings.filter((listing) => {
      if (listing.complexId !== complex.id) return false;
      if (!hasMarket(listing, query.market)) return false;
      if (!matchesSeller(listing, query.seller)) return false;
      if (rooms && listing.rooms !== rooms) return false;
      if (query.minPrice && listing.priceUzs < query.minPrice) return false;
      if (maxPrice && listing.priceUzs > maxPrice) return false;
      if ((query.reservable || wantsReservable) && !listing.reserveEnabled) return false;
      if (wantsNotFirstFloor && listing.floorNumber <= 1) return false;
      return true;
    });

    if (matchingListings.length === 0) return [];
    const prices = matchingListings.map((listing) => listing.priceUzs);
    const pricesPerSqm = matchingListings.map((listing) => Math.round(listing.priceUzs / listing.areaSqm));
    const roomValues = matchingListings.map((listing) => listing.rooms);

    return [{
      ...complex,
      priceFrom: Math.min(...prices),
      pricePerSqmFrom: Math.min(...pricesPerSqm),
      availableUnits: matchingListings.length,
      minRooms: Math.min(...roomValues),
      maxRooms: Math.max(...roomValues),
      marketTypes: [...new Set(matchingListings.map((listing) => listing.marketType))],
      reservable: matchingListings.some((listing) => listing.reserveEnabled),
    }];
  });

  const sorted = [...items].sort((a, b) => {
    if (query.sort === 'price_asc') return a.priceFrom - b.priceFrom;
    if (query.sort === 'price_desc') return b.priceFrom - a.priceFrom;
    if (query.sort === 'newest') return a.completionLabel.localeCompare(b.completionLabel);
    return Number(b.featured) - Number(a.featured) || b.rating - a.rating;
  });
  const limited = query.limit ? sorted.slice(0, query.limit) : sorted;

  return {
    items: limited,
    total: sorted.length,
    parsedFilters: parsed.filters,
    unsupportedCriteria: parsed.unsupportedCriteria,
  };
}
