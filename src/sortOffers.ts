import type { MarketOffer } from './types'

export type OfferSort = 'default' | 'unitPrice:asc' | 'unitPrice:desc' | 'totalQuantity:asc' | 'totalQuantity:desc' | 'observedAt:asc' | 'observedAt:desc'

// Deliberately page-local. Never change the server's pagination or default order.
export function sortOffers(items: MarketOffer[], sort: OfferSort): MarketOffer[] {
  if (sort === 'default') return items
  const [field, direction] = sort.split(':')
  const value = (offer: MarketOffer) => field === 'observedAt'
    ? Date.parse(offer.observedAt) || 0
    : field === 'unitPrice' ? offer.unitPrice : offer.totalQuantity
  return [...items].sort((a, b) => (value(a) - value(b)) * (direction === 'asc' ? 1 : -1))
}
