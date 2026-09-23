export type MarketType =
  | 'PRIMARY_DEVELOPER'
  | 'SECONDARY_OWNER'
  | 'SECONDARY_AGENCY';

export type SellerType = 'developer' | 'owner' | 'agency';

export type ParsedFilter = {
  key:
    | 'city'
    | 'complex'
    | 'rooms'
    | 'minPrice'
    | 'maxPrice'
    | 'completed'
    | 'notFirstFloor'
    | 'minFloor'
    | 'maxFloor'
    | 'minArea'
    | 'maxArea'
    | 'reservable'
    | 'specialOffer'
    | 'market'
    | 'seller'
    | 'district'
    | 'finish';
  label: string;
  value: string | number | boolean;
};

export type ComplexSummary = {
  id: string;
  slug: string;
  name: string;
  city: string;
  district: string;
  address: string;
  developer: string;
  developerVerified: boolean;
  complexVerified: boolean;
  completionStatus: 'completed' | 'under_construction';
  completionLabel: string;
  image: string;
  featured: boolean;
  rating: number;
  mapX: number;
  mapY: number;
  latitude: number;
  longitude: number;
  priceFrom: number;
  pricePerSqmFrom: number;
  largestArea: number;
  newestPublishedAt: string;
  availableUnits: number;
  minRooms: number;
  maxRooms: number;
  marketTypes: MarketType[];
  reservable: boolean;
  sponsored: boolean;
  sponsoredLabel: string | null;
  specialOffer: boolean;
  specialOfferLabel: string | null;
  promotionWeight: number;
};

export type CatalogFacets = {
  cities: string[];
  districts: string[];
  complexes: { slug: string; name: string }[];
};

export type CatalogResponse = {
  items: ComplexSummary[];
  total: number;
  parsedFilters: ParsedFilter[];
  unsupportedCriteria: string[];
  validationWarnings: string[];
  alternatives: ComplexSummary[];
  alternativeReason: string | null;
  facets: CatalogFacets;
};

export type CatalogQuery = {
  market?: 'all' | 'primary' | 'secondary';
  q?: string;
  city?: string;
  complex?: string;
  rooms?: number;
  status?: 'completed' | 'under_construction';
  seller?: SellerType;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  minFloor?: number;
  maxFloor?: number;
  district?: string;
  finish?: string;
  verified?: boolean;
  reservable?: boolean;
  specialOffer?: boolean;
  sort?:
    | 'recommended'
    | 'price_asc'
    | 'price_desc'
    | 'price_per_sqm'
    | 'newest'
    | 'area_desc';
  surface?: 'search' | 'homepage';
  excludeParsed?: string[];
  limit?: number;
};

export type ComplexRecord = Omit<
  ComplexSummary,
  | 'priceFrom'
  | 'pricePerSqmFrom'
  | 'largestArea'
  | 'newestPublishedAt'
  | 'availableUnits'
  | 'minRooms'
  | 'maxRooms'
  | 'marketTypes'
  | 'reservable'
  | 'sponsored'
  | 'sponsoredLabel'
  | 'promotionWeight'
> & { promotionSearchWeight: number; promotionHomepageWeight: number };

export type ListingRecord = {
  id: string;
  complexId: string;
  unitNumber: string;
  rooms: number;
  areaSqm: number;
  floorNumber: number;
  totalFloors: number;
  finish: string;
  priceUzs: number;
  marketType: MarketType;
  sellerType: SellerType;
  reserveEnabled: boolean;
  publishedAt: string;
};

export type ComplexListing = ListingRecord & {
  seller: string;
  sellerVerified: boolean;
  contactPhone: string | null;
  promoted: boolean;
  sponsoredLabel: string | null;
};

export type ComplexBuilding = {
  id: string;
  name: string;
  totalFloors: number;
  completionStatus: ComplexSummary['completionStatus'];
  sectionsCount: number;
  availableUnits: number;
};

export type ComplexFeature = {
  id: string;
  category: 'infrastructure' | 'amenity';
  name: string;
  detail: string;
};

export type ComplexDocument = {
  id: string;
  title: string;
  url: string | null;
};

export type ComplexPricePoint = {
  period: string;
  pricePerSqm: number;
  listingCount: number;
};

export type ComplexDetail = {
  summary: ComplexSummary;
  description: string;
  gallery: string[];
  listings: ComplexListing[];
  buildings: ComplexBuilding[];
  features: ComplexFeature[];
  documents: ComplexDocument[];
  priceHistory: ComplexPricePoint[];
  similarComplexes: ComplexSummary[];
};

export type ListingPriceHistoryEntry = {
  id: string;
  oldPriceUzs: number | null;
  newPriceUzs: number;
  reason: string;
  changedAt: string;
};

export type ListingDetail = {
  listing: ComplexListing & {
    expiresAt: string | null;
    availabilityStatus: string;
    buildingName: string;
  };
  complex: Pick<
    ComplexSummary,
    | 'id'
    | 'slug'
    | 'name'
    | 'city'
    | 'district'
    | 'address'
    | 'image'
    | 'completionLabel'
    | 'complexVerified'
  >;
  description: string;
  gallery: string[];
  priceHistory: ListingPriceHistoryEntry[];
};

export function formatPriceMillions(priceUzs: number) {
  if (Math.abs(priceUzs) >= 1_000_000_000) {
    const billions = priceUzs / 1_000_000_000;
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(billions)} млрд`;
  }
  const millions = priceUzs / 1_000_000;
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: millions % 1 === 0 ? 0 : 1 }).format(millions)} млн`;
}

export function formatUzsAmount(priceUzs: number) {
  return Math.abs(priceUzs) >= 1_000_000
    ? `${formatPriceMillions(priceUzs)} сум`
    : `${new Intl.NumberFormat('ru-RU').format(priceUzs)} сум`;
}

export function formatPricePerSqm(priceUzs: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(priceUzs / 1_000_000)} млн / м²`;
}

export function formatApartmentCount(count: number) {
  if (count === 0) return 'Предложений пока нет';
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun =
    mod10 === 1 && mod100 !== 11
      ? 'квартира'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'квартиры'
        : 'квартир';
  return `${count} ${noun}`;
}

export function formatComplexStartingPrice(complex: ComplexSummary) {
  return complex.availableUnits > 0 ? `от ${formatPriceMillions(complex.priceFrom)} сум` : 'Цены пока не указаны';
}

export function marketLabel(marketTypes: MarketType[]) {
  const hasPrimary = marketTypes.includes('PRIMARY_DEVELOPER');
  const hasSecondary = marketTypes.some((type) => type !== 'PRIMARY_DEVELOPER');
  if (hasPrimary && hasSecondary) return 'Оба рынка';
  return hasPrimary ? 'Первичный' : 'Вторичный';
}
