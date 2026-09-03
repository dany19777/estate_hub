import type { CatalogQuery, CatalogResponse, ComplexRecord, ComplexSummary, ListingRecord, ParsedFilter } from '@/lib/marketplace';

export type ParsedSearch = { filters: ParsedFilter[]; unsupportedCriteria: string[]; validationWarnings: string[] };

const districtPatterns = [
  { pattern: /б[ооғ]ишамол|bog['‘]?ishamol/i, value: 'Боғишамол' },
  { pattern: /регистан|registan/i, value: 'Регистан' },
  { pattern: /си[её]б|siyob/i, value: 'Сиёб' },
  { pattern: /саттепо|sattepo/i, value: 'Саттепо' },
  { pattern: /(?:в|район)?\s*центр(?:е|а)?|markaz/i, value: 'Центр' },
  { pattern: /конигил|konigil/i, value: 'Конигил' },
] as const;

function moneyValue(value: string, unit: string) {
  const numeric = Number(value.replace(',', '.'));
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * (/млрд|миллиард/.test(unit) ? 1_000_000_000 : 1_000_000));
}

function pushUnique(filters: ParsedFilter[], filter: ParsedFilter) {
  if (!filters.some((item) => item.key === filter.key)) filters.push(filter);
}

export function parseNaturalLanguageQuery(query: string): ParsedSearch {
  const normalized = query.toLowerCase().replace(/ё/g, 'е').trim();
  const filters: ParsedFilter[] = [];
  const unsupportedCriteria: string[] = [];
  const validationWarnings: string[] = [];
  if (/самарканд|samarqand|samarkand/.test(normalized)) pushUnique(filters, { key: 'city', label: 'Самарканд', value: 'Самарканд' });
  const roomMatch = normalized.match(/(?:^|\s)([1-9])(?:\s*[-–]?\s*)(?:комнат|комн\.)/) ?? (/(?:двуш|двухкомнат)/.test(normalized) ? ['', '2'] : null) ?? (/(?:треш|трехкомнат)/.test(normalized) ? ['', '3'] : null) ?? (/(?:однуш|однокомнат)/.test(normalized) ? ['', '1'] : null);
  if (roomMatch?.[1]) { const rooms = Number(roomMatch[1]); pushUnique(filters, { key: 'rooms', label: `${rooms} ${rooms === 1 ? 'комната' : rooms < 5 ? 'комнаты' : 'комнат'}`, value: rooms }); }

  const maxPriceMatch = normalized.match(/(?:до|не дороже|максимум)\s*([\d.,]+)\s*(млн|миллион\w*|млрд|миллиард\w*)/);
  if (maxPriceMatch) { const maxPrice = moneyValue(maxPriceMatch[1], maxPriceMatch[2]); if (maxPrice) pushUnique(filters, { key: 'maxPrice', label: `до ${maxPrice / 1_000_000} млн`, value: maxPrice }); }
  const minPriceMatch = normalized.match(/(?:от|не дешевле|минимум)\s*([\d.,]+)\s*(млн|миллион\w*|млрд|миллиард\w*)/);
  if (minPriceMatch) { const minPrice = moneyValue(minPriceMatch[1], minPriceMatch[2]); if (minPrice) pushUnique(filters, { key: 'minPrice', label: `от ${minPrice / 1_000_000} млн`, value: minPrice }); }

  const areaRange = normalized.match(/(?:площад\w*\s*)?(?:от\s*)?(\d+(?:[.,]\d+)?)\s*(?:-|–|до)\s*(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв\.?\s*м)/);
  if (areaRange) {
    pushUnique(filters, { key: 'minArea', label: `от ${Number(areaRange[1].replace(',', '.'))} м²`, value: Number(areaRange[1].replace(',', '.')) });
    pushUnique(filters, { key: 'maxArea', label: `до ${Number(areaRange[2].replace(',', '.'))} м²`, value: Number(areaRange[2].replace(',', '.')) });
  } else {
    const minArea = normalized.match(/(?:площад\w*\s*)?(?:от|не меньше)\s*(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв\.?\s*м)/);
    const maxArea = normalized.match(/(?:площад\w*\s*)?(?:до|не больше)\s*(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв\.?\s*м)/);
    if (minArea) pushUnique(filters, { key: 'minArea', label: `от ${Number(minArea[1].replace(',', '.'))} м²`, value: Number(minArea[1].replace(',', '.')) });
    if (maxArea) pushUnique(filters, { key: 'maxArea', label: `до ${Number(maxArea[1].replace(',', '.'))} м²`, value: Number(maxArea[1].replace(',', '.')) });
  }

  const floorRange = normalized.match(/(?:этаж\w*\s*)?(?:с|от)\s*(\d+)\s*(?:-|–|до|по)\s*(\d+)\s*(?:этаж\w*)?/);
  if (floorRange) {
    pushUnique(filters, { key: 'minFloor', label: `этаж от ${Number(floorRange[1])}`, value: Number(floorRange[1]) });
    pushUnique(filters, { key: 'maxFloor', label: `этаж до ${Number(floorRange[2])}`, value: Number(floorRange[2]) });
  } else {
    const minFloor = normalized.match(/(?:выше|не ниже)\s*(\d+)\s*(?:этаж\w*)?/);
    const maxFloor = normalized.match(/(?:не выше|ниже)\s*(\d+)\s*(?:этаж\w*)?/);
    if (minFloor) pushUnique(filters, { key: 'minFloor', label: `выше ${Number(minFloor[1])} этажа`, value: Number(minFloor[1]) + (/выше/.test(minFloor[0]) ? 1 : 0) });
    if (maxFloor) pushUnique(filters, { key: 'maxFloor', label: `не выше ${Number(maxFloor[1])} этажа`, value: Number(maxFloor[1]) });
  }

  if (/(?:сдан|готов(?:ом|ый|ом доме)?|заселен)/.test(normalized)) pushUnique(filters, { key: 'completed', label: 'сдан', value: true });
  if (/(?:не\s+на\s+перв|не\s+первый\s+этаж|выше\s+первого)/.test(normalized)) pushUnique(filters, { key: 'notFirstFloor', label: 'не первый этаж', value: true });
  if (/(?:онлайн[- ]?брон|забронировать онлайн)/.test(normalized)) pushUnique(filters, { key: 'reservable', label: 'онлайн-бронь', value: true });
  if (/(?:спецпредлож|эксклюзивн\w*\s+цен|скидк\w*\s+estatehub)/.test(normalized)) pushUnique(filters, { key: 'specialOffer', label: 'спецпредложение EstateHub', value: true });
  const wantsPrimary = /новострой|первичн|от застройщика/.test(normalized);
  const wantsSecondary = /вторичн|готовая квартира от/.test(normalized);
  if (wantsPrimary && wantsSecondary) validationWarnings.push('Указаны оба типа рынка — показываем все предложения.');
  else if (wantsPrimary) pushUnique(filters, { key: 'market', label: 'первичный рынок', value: 'primary' });
  else if (wantsSecondary) pushUnique(filters, { key: 'market', label: 'вторичный рынок', value: 'secondary' });
  if (/от собственник|от владельц/.test(normalized)) pushUnique(filters, { key: 'seller', label: 'от собственника', value: 'owner' });
  else if (/агентств|риелтор/.test(normalized)) pushUnique(filters, { key: 'seller', label: 'от агентства', value: 'agency' });
  else if (/от застройщика/.test(normalized)) pushUnique(filters, { key: 'seller', label: 'от застройщика', value: 'developer' });
  const district = districtPatterns.find((item) => item.pattern.test(normalized));
  if (district) pushUnique(filters, { key: 'district', label: `район ${district.value}`, value: district.value });
  if (/с ремонтом|готов\w* ремонт/.test(normalized)) pushUnique(filters, { key: 'finish', label: 'с ремонтом', value: 'С ремонтом' });
  else if (/чистов\w* отделк/.test(normalized)) pushUnique(filters, { key: 'finish', label: 'чистовая отделка', value: 'Чистовая' });
  else if (/предчистов/.test(normalized)) pushUnique(filters, { key: 'finish', label: 'предчистовая', value: 'Предчистовая' });

  const unsupported = [
    { pattern: /(?:вид\s+на|с видом)/, label: 'вид из окна' }, { pattern: /(?:тихий|тишина)/, label: 'уровень шума' },
    { pattern: /(?:рядом\s+со\s+школ|школа\s+рядом)/, label: 'расстояние до школы' }, { pattern: /(?:ипотек|рассрочк)/, label: 'ипотека или рассрочка' },
    { pattern: /(?:доходност|инвестиц)/, label: 'инвестиционная доходность' },
  ];
  for (const item of unsupported) if (item.pattern.test(normalized)) unsupportedCriteria.push(item.label);
  const values = Object.fromEntries(filters.map((item) => [item.key, item.value]));
  if (Number(values.minPrice ?? 0) > Number(values.maxPrice ?? Number.MAX_SAFE_INTEGER)) validationWarnings.push('Минимальная цена выше максимальной — ценовой диапазон не применён.');
  if (Number(values.minArea ?? 0) > Number(values.maxArea ?? Number.MAX_SAFE_INTEGER)) validationWarnings.push('Минимальная площадь выше максимальной — диапазон площади не применён.');
  if (Number(values.minFloor ?? 0) > Number(values.maxFloor ?? Number.MAX_SAFE_INTEGER)) validationWarnings.push('Минимальный этаж выше максимального — диапазон этажей не применён.');
  return { filters, unsupportedCriteria, validationWarnings };
}

function hasMarket(listing: ListingRecord, market: CatalogQuery['market']) { if (!market || market === 'all') return true; return market === 'primary' ? listing.marketType === 'PRIMARY_DEVELOPER' : listing.marketType !== 'PRIMARY_DEVELOPER'; }
function matchesSeller(listing: ListingRecord, seller: CatalogQuery['seller']) { return !seller || listing.sellerType === seller; }

export function buildCatalog(complexes: ComplexRecord[], listings: ListingRecord[], query: CatalogQuery, allowAlternatives = true): CatalogResponse {
  const rawParsed = parseNaturalLanguageQuery(query.q ?? '');
  const excluded = new Set(query.excludeParsed ?? []);
  const parsed = { ...rawParsed, filters: rawParsed.filters.filter((filter) => !excluded.has(filter.key)) };
  const value = (key: ParsedFilter['key']) => parsed.filters.find((filter) => filter.key === key)?.value;
  const rooms = query.rooms ?? (value('rooms') as number | undefined);
  const minPrice = query.minPrice ?? (value('minPrice') as number | undefined);
  const maxPrice = query.maxPrice ?? (value('maxPrice') as number | undefined);
  const minArea = query.minArea ?? (value('minArea') as number | undefined);
  const maxArea = query.maxArea ?? (value('maxArea') as number | undefined);
  const minFloor = query.minFloor ?? (value('minFloor') as number | undefined);
  const maxFloor = query.maxFloor ?? (value('maxFloor') as number | undefined);
  const district = query.district ?? (value('district') as string | undefined);
  const finish = query.finish ?? (value('finish') as string | undefined);
  const city = query.city ?? (value('city') as string | undefined);
  const complexQuery = query.complex ?? (value('complex') as string | undefined);
  const parsedMarket = value('market') as CatalogQuery['market'];
  const parsedSeller = value('seller') as CatalogQuery['seller'];
  const wantsCompleted = parsed.filters.some((filter) => filter.key === 'completed');
  const wantsNotFirstFloor = parsed.filters.some((filter) => filter.key === 'notFirstFloor');
  const wantsReservable = parsed.filters.some((filter) => filter.key === 'reservable');
  const wantsSpecialOffer = parsed.filters.some((filter) => filter.key === 'specialOffer');
  const normalizedText = (query.q ?? '').toLowerCase().trim();
  const useTextSearch = normalizedText.length > 0 && rawParsed.filters.length === 0;
  const invalidPrice = Boolean(minPrice && maxPrice && minPrice > maxPrice);
  const invalidArea = Boolean(minArea && maxArea && minArea > maxArea);
  const invalidFloor = Boolean(minFloor && maxFloor && minFloor > maxFloor);
  const effectiveMarket = query.market && query.market !== 'all' ? query.market : parsedMarket ?? query.market;
  const effectiveSeller = query.seller ?? parsedSeller;
  const items = complexes.flatMap<ComplexSummary>((complex) => {
    if (query.verified && (!complex.developerVerified || !complex.complexVerified)) return [];
    if (city && complex.city.toLowerCase() !== city.toLowerCase()) return [];
    if (complexQuery && ![complex.id, complex.slug, complex.name.toLowerCase()].includes(complexQuery.toLowerCase())) return [];
    if ((query.specialOffer || wantsSpecialOffer) && !complex.specialOffer) return [];
    if ((query.status === 'completed' || wantsCompleted) && complex.completionStatus !== 'completed') return [];
    if (query.status === 'under_construction' && complex.completionStatus !== 'under_construction') return [];
    if (district && complex.district.toLowerCase() !== district.toLowerCase()) return [];
    if (useTextSearch && !`${complex.name} ${complex.city} ${complex.district} ${complex.address} ${complex.developer}`.toLowerCase().includes(normalizedText)) return [];
    const matchingListings = listings.filter((listing) => {
      if (listing.complexId !== complex.id || !hasMarket(listing, effectiveMarket) || !matchesSeller(listing, effectiveSeller)) return false;
      if (rooms && (rooms >= 4 ? listing.rooms < rooms : listing.rooms !== rooms)) return false;
      if (!invalidPrice && minPrice && listing.priceUzs < minPrice) return false;
      if (!invalidPrice && maxPrice && listing.priceUzs > maxPrice) return false;
      if (!invalidArea && minArea && listing.areaSqm < minArea) return false;
      if (!invalidArea && maxArea && listing.areaSqm > maxArea) return false;
      if (!invalidFloor && minFloor && listing.floorNumber < minFloor) return false;
      if (!invalidFloor && maxFloor && listing.floorNumber > maxFloor) return false;
      if (finish && !listing.finish.toLowerCase().includes(finish.toLowerCase())) return false;
      if ((query.reservable || wantsReservable) && !listing.reserveEnabled) return false;
      if (wantsNotFirstFloor && listing.floorNumber <= 1) return false;
      return true;
    });
    if (matchingListings.length === 0) return [];
    const prices = matchingListings.map((listing) => listing.priceUzs), roomValues = matchingListings.map((listing) => listing.rooms);
    const promotionWeight = query.surface === 'homepage' ? complex.promotionHomepageWeight : complex.promotionSearchWeight;
    const { promotionSearchWeight: _searchWeight, promotionHomepageWeight: _homepageWeight, ...publicComplex } = complex;
    return [{ ...publicComplex, priceFrom: Math.min(...prices), pricePerSqmFrom: Math.min(...matchingListings.map((listing) => Math.round(listing.priceUzs / listing.areaSqm))), availableUnits: matchingListings.length,
      largestArea: Math.max(...matchingListings.map((listing) => listing.areaSqm)), newestPublishedAt: matchingListings.map((listing) => listing.publishedAt).sort().at(-1) ?? '',
      minRooms: Math.min(...roomValues), maxRooms: Math.max(...roomValues), marketTypes: [...new Set(matchingListings.map((listing) => listing.marketType))], reservable: matchingListings.some((listing) => listing.reserveEnabled),
      sponsored: promotionWeight > 0, sponsoredLabel: promotionWeight > 0 ? (complex.specialOfferLabel ?? 'Реклама') : null, promotionWeight }];
  });
  const sorted = [...items].sort((a, b) => {
    if (query.sort === 'price_asc') return a.priceFrom - b.priceFrom;
    if (query.sort === 'price_desc') return b.priceFrom - a.priceFrom;
    if (query.sort === 'price_per_sqm') return a.pricePerSqmFrom - b.pricePerSqmFrom;
    if (query.sort === 'area_desc') return b.largestArea - a.largestArea;
    if (query.sort === 'newest') return b.newestPublishedAt.localeCompare(a.newestPublishedAt);
    return b.promotionWeight - a.promotionWeight || Number(b.featured) - Number(a.featured) || b.rating - a.rating;
  });
  const limited = query.limit ? sorted.slice(0, query.limit) : sorted;
  let alternatives: ComplexSummary[] = [], alternativeReason: string | null = null;
  if (allowAlternatives && sorted.length === 0 && (query.q || rooms || minPrice || maxPrice || minArea || maxArea || minFloor || maxFloor || district || finish)) {
    const relaxed = buildCatalog(complexes, listings, { market: effectiveMarket ?? 'all', district, verified: query.verified, surface: query.surface, sort: 'recommended', limit: 3 }, false);
    const fallback = relaxed.items.length ? relaxed : buildCatalog(complexes, listings, { market: effectiveMarket ?? 'all', verified: query.verified, surface: query.surface, sort: 'recommended', limit: 3 }, false);
    alternatives = fallback.items;
    alternativeReason = relaxed.items.length ? 'Точных совпадений нет — показываем ближайшие варианты в выбранном районе.' : 'Точных совпадений нет — ослабили второстепенные условия, сохранив тип рынка.';
  }
  const facets = {
    cities: [...new Set(complexes.map((complex) => complex.city))].sort(),
    districts: [...new Set(complexes.filter((complex) => !city || complex.city.toLowerCase() === city.toLowerCase()).map((complex) => complex.district))].sort(),
    complexes: complexes
      .filter((complex) => (!city || complex.city.toLowerCase() === city.toLowerCase()) && (!district || complex.district.toLowerCase() === district.toLowerCase()))
      .map((complex) => ({ slug: complex.slug, name: complex.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
  return { items: limited, total: sorted.length, parsedFilters: parsed.filters, unsupportedCriteria: parsed.unsupportedCriteria, validationWarnings: parsed.validationWarnings, alternatives, alternativeReason, facets };
}
