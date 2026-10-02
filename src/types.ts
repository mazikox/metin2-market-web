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
