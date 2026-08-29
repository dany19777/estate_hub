export type MarketType = 'PRIMARY_DEVELOPER' | 'SECONDARY_OWNER' | 'SECONDARY_AGENCY';

export type SellerType = 'developer' | 'owner' | 'agency';

export type ParsedFilter = {
  key: 'rooms' | 'maxPrice' | 'completed' | 'notFirstFloor' | 'reservable';
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
  priceFrom: number;
  pricePerSqmFrom: number;
  availableUnits: number;
  minRooms: number;
  maxRooms: number;
  marketTypes: MarketType[];
  reservable: boolean;
};

export type CatalogResponse = {
  items: ComplexSummary[];
  total: number;
  parsedFilters: ParsedFilter[];
  unsupportedCriteria: string[];
};

export type CatalogQuery = {
  market?: 'all' | 'primary' | 'secondary';
  q?: string;
  rooms?: number;
  status?: 'completed' | 'under_construction';
  seller?: SellerType;
  minPrice?: number;
  maxPrice?: number;
  verified?: boolean;
  reservable?: boolean;
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'newest';
  limit?: number;
};

export type ComplexRecord = Omit<
  ComplexSummary,
  'priceFrom' | 'pricePerSqmFrom' | 'availableUnits' | 'minRooms' | 'maxRooms' | 'marketTypes' | 'reservable'
>;

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
};

export type ComplexDetail = {
  summary: ComplexSummary;
  description: string;
  gallery: string[];
  listings: ComplexListing[];
};

export function formatPriceMillions(priceUzs: number) {
  const millions = priceUzs / 1_000_000;
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: millions % 1 === 0 ? 0 : 1 }).format(millions)} млн`;
}

export function formatPricePerSqm(priceUzs: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(priceUzs / 1_000_000)} млн / м²`;
}

export function marketLabel(marketTypes: MarketType[]) {
  const hasPrimary = marketTypes.includes('PRIMARY_DEVELOPER');
  const hasSecondary = marketTypes.some((type) => type !== 'PRIMARY_DEVELOPER');
  if (hasPrimary && hasSecondary) return 'Оба рынка';
  return hasPrimary ? 'Первичный' : 'Вторичный';
}
