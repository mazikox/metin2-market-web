export type SuggestionKind = 'ITEM' | 'UPGRADE_FAMILY'

export interface ItemSuggestion {
  kind: SuggestionKind
  name: string
  vnum: number | null
  memberVnums: number[]
  memberNames: string[]
}

export interface SuggestionsResponse {
  totalMatches: number
  suggestions: ItemSuggestion[]
}

export interface ItemAttribute {
  slotIndex: number
  type: number
  code: string
  name: string
  value: number
  displayValue: string
}

export interface ItemSocket {
  socketIndex: number
  value: number
}

export interface ShopInfo {
  vid: number | null
  title: string | null
  ownerName: string | null
  mapId: string | null
  channel: number | string | null
  x: number | null
  y: number | null
  z: number | null
}

export interface ItemMetadata {
  vnum: number
  name: string
  type: number
  subtype: number
  size: number
  antiFlags: number
  requiredLevel: number
  defense: number
  minAttack: number
  maxAttack: number
  minMagicAttack: number
  maxMagicAttack: number
  socketCount: number
  builtInBonuses: ItemAttribute[]
}

export interface MarketOffer {
  listingId: number
  vnum: number
  itemName: string
  quantity: number
  price: number
  unitPrice: number
  totalQuantity: number
  totalPrice: number
  listingCount: number
  attributes: ItemAttribute[]
  sockets: ItemSocket[]
  shop: ShopInfo | null
  observedAt: string
  metadata?: ItemMetadata | null
}

export interface OffersResponse {
  items: MarketOffer[]
  page: number
  size: number
  totalElements: number
}

export interface PricePercentiles {
  p10: number
  p20: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface OutlierSummary {
  lowerCount: number
  upperCount: number
  totalCount: number
}

export interface BuyerReference {
  percentile: number
  price: number
  shopsAtOrBelow: number
  quantityAtOrBelow: number
}

export interface HistogramBin {
  fromPrice: number
  toPrice: number
  shopCount: number
}

export interface DepthPoint {
  price: number
  quantityAtPrice: number
  cumulativeQuantity: number
  shopCountAtPrice: number
  cumulativeShopCount: number
}

export interface ItemStatistic {
  vnum: number
  itemName: string
  minimumPrice: number
  meanPrice: number
  trimmedMeanPrice?: number
  medianPrice: number
  percentiles?: PricePercentiles
  iqr?: number
  relativeIqr?: number
  contributingShopCount: number
  rawOfferCount: number
  totalQuantity: number
  totalPriceLevelCount?: number
  outliers?: OutlierSummary
  buyerReference?: BuyerReference
  histogram?: HistogramBin[]
  depth?: DepthPoint[]
}

export interface StatisticsResponse {
  items: ItemStatistic[]
}

export interface PopularItem {
  vnum: number
  itemName: string
  shopCount: number
  totalQuantity: number
  minimumPrice: number
}

export interface MarketOverviewResponse {
  scanId: number | null
  scanEndedAt: string | null
  observedShopCount: number
  items: PopularItem[]
}

export type MarketOverviewSort = 'shops' | 'quantity'

export type OfferSort = 'priceAsc' | 'priceDesc' | 'quantity'


export interface BonusFilter {
  type: number
  minimum?: number
}

export interface BonusOption {
  type: number
  code: string
  name: string
  unit: string
}


export interface ItemFilters {
  category?: string
  minLevel?: number
  maxLevel?: number
}
export interface CategoryOptions {
  available: boolean
  categories: { value: string; name: string }[]
}
