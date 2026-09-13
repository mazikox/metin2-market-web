import { useMemo, useState } from 'react'
import type { MarketOffer } from '../types'
import { formatNumber, formatObservedAt, formatYang, formatCoordinates } from '../format'
import { sortOffers, type OfferSort } from '../sortOffers'
import { getSoulStones } from '../soulStones'
import { ChevronIcon, RefreshIcon, StoreIcon } from './Icons'
import { ItemIcon } from './ItemIcon'

interface OffersProps {
  items: MarketOffer[]
  loading: boolean
  error: string | null
  page: number
  size: number
  totalElements: number
  onPageChange: (page: number) => void
  onRetry: () => void
}

function offerShopLabel(offer: MarketOffer) {
  if (!offer.shop) return 'Nieznany sklep'
  return offer.shop.title || offer.shop.ownerName || (offer.shop.vid ? `Sklep #${offer.shop.vid}` : 'Nieznany sklep')
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  const candidates = [0, page - 1, page, page + 1, totalPages - 1]
  const pages = [...new Set(candidates.filter((value) => value >= 0 && value < totalPages))].sort((a, b) => a - b)

  return (
    <nav className="pagination" aria-label="Strony ofert">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 0} aria-label="Poprzednia strona"><ChevronIcon direction="left" /></button>
      <div className="pagination__pages">
        {pages.map((value, index) => (
          <span key={value} className="pagination__slot">
            {index > 0 && pages[index - 1] !== value - 1 && <span className="pagination__ellipsis">…</span>}
            <button type="button" className={value === page ? 'is-current' : ''} onClick={() => onPageChange(value)} aria-current={value === page ? 'page' : undefined}>{value + 1}</button>
          </span>
        ))}
      </div>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} aria-label="Następna strona"><ChevronIcon /></button>
    </nav>
  )
}

function OfferSkeleton() {
  return <div className="offer-row offer-row--skeleton"><span /><span /><span /><span /></div>
}

export function Offers({ items, loading, error, page, size, totalElements, onPageChange, onRetry }: OffersProps) {
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const [sort, setSort] = useState<OfferSort>('default')
  const sortedItems = useMemo(() => sortOffers(items, sort), [items, sort])
  const sortHeader = (field: 'unitPrice' | 'totalQuantity' | 'observedAt', label: string) => (
    <button type="button" className={sort.startsWith(field) ? 'sort-active' : ''}
      onClick={() => setSort(`${field}:${sort === `${field}:asc` ? 'desc' : 'asc'}` as OfferSort)}
      aria-label={`${label}: sortuj ${sort === `${field}:asc` ? 'malejąco' : 'rosnąco'} na tej stronie`}>
      {label} <span aria-hidden="true">{sort.startsWith(field) ? (sort.endsWith('asc') ? '↑' : '↓') : '↕'}</span>
    </button>
  )

  return (
    <section className="offers-section" aria-labelledby="offers-title">
      <div className="section-heading offers-heading">
        <div>
          <h2 id="offers-title">Oferty rynkowe</h2>
        </div>
        {!loading && !error && <span className="result-count">{formatNumber(totalElements)} {totalElements === 1 ? 'oferta' : 'ofert'}</span>}
      </div>
      <div className="offer-controls">
        <label>Sortuj <select aria-label="Sortowanie ofert" value={sort} onChange={event => setSort(event.target.value as OfferSort)}>
          <option value="default">Domyślnie · najtańsze</option>
          <option value="unitPrice:asc">Cena / szt. ↑</option><option value="unitPrice:desc">Cena / szt. ↓</option>
          <option value="totalQuantity:desc">Ilość ↓</option><option value="totalQuantity:asc">Ilość ↑</option>
          <option value="observedAt:desc">Ostatnio widziane</option><option value="observedAt:asc">Najdawniej widziane</option>
        </select></label>
        <span role="status">{sort === 'default' ? 'Kolejność rynku · najtańsze najpierw' : 'Sortowanie tylko na bieżącej stronie'}</span>
      </div>

      {loading && <div className="offers-list" aria-busy="true"><OfferSkeleton /><OfferSkeleton /><OfferSkeleton /><OfferSkeleton /></div>}
      {!loading && error && (
        <div className="state-card state-card--error">
          <div className="state-card__icon">!</div>
          <h3>Nie udało się pobrać ofert</h3>
          <p>{error}</p>
          <button className="button" type="button" onClick={onRetry}><RefreshIcon /> Spróbuj ponownie</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="state-card">
          <StoreIcon className="state-card__store" />
          <h3>Brak aktywnych ofert</h3>
          <p>Ten przedmiot nie jest obecnie widoczny na obserwowanych rynkach.</p>
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="offers-list">
            <div className="offers-list__header">
              <span>Przedmiot</span>{sortHeader('unitPrice', 'Cena / szt.')}<span>Bonusy</span>{sortHeader('totalQuantity', 'Ilość / suma')}<span>Sklep / lokalizacja</span>{sortHeader('observedAt', 'Widziano')}
            </div>
            {sortedItems.map((offer) => {
              const soulStones = getSoulStones(offer.sockets)
              return (
              <article className="offer-row" key={`${offer.listingId}-${offer.observedAt}`}>
                <div className="offer-item">
                  <ItemIcon vnum={offer.vnum} alt={offer.itemName} size="medium" />
                  <div><h3>{offer.itemName}</h3><span>VNUM {offer.vnum}</span></div>
                </div>

                <div className="offer-price"><strong>{formatYang(offer.unitPrice)}</strong><span>/ szt.</span></div>

                <div className="offer-bonuses">
                  {soulStones.length > 0 && (
                    <div className="soul-stones" aria-label="Osadzone Kamienie Duszy">
                      {soulStones.map((stone) => (
                        <span className="soul-stone" key={`${stone.socketIndex}-${stone.vnum}`} title={`VNUM ${stone.vnum}`}>
                          <ItemIcon vnum={stone.iconVnum} alt={stone.name} size="stone" />
                          <span>{stone.name}<strong>+{stone.level}</strong></span>
                        </span>
                      ))}
                    </div>
                  )}
                  {offer.attributes.length ? offer.attributes.map((attribute) => (
                    <span className={`bonus ${attribute.value < 0 ? 'bonus--negative' : ''}`} key={`${attribute.slotIndex}-${attribute.type}`}>
                      <span>{attribute.name}</span><strong>{attribute.displayValue}</strong>
                    </span>
                  )) : <span className="muted">Brak bonusów</span>}
                  {offer.sockets.length > 0 && (
                    <details className="sockets">
                      <summary>Dane techniczne slotów ({offer.sockets.length})</summary>
                      <div>{offer.sockets.map((socket) => <code key={socket.socketIndex}>#{socket.socketIndex + 1}: {socket.value}</code>)}</div>
                    </details>
                  )}
                </div>

                <div className="offer-quantity">
                  <span>{formatNumber(offer.totalQuantity)} szt.</span>
                  {(offer.totalQuantity > 1 || offer.totalPrice !== offer.unitPrice) && <small>{formatYang(offer.totalPrice)} łącznie</small>}
                  {offer.listingCount > 1 && <small>{formatNumber(offer.listingCount)} {offer.listingCount < 5 ? 'identyczne oferty' : 'identycznych ofert'}</small>}
                </div>

                <div className="offer-shop">
                  <strong>{offerShopLabel(offer)}</strong>
                  <span className="coordinates">{formatCoordinates(offer.shop?.x, offer.shop?.y) ?? 'Brak współrzędnych'}{offer.shop?.channel != null && ` · CH ${offer.shop.channel}`}</span>
                  {offer.shop?.mapId && <span className="map-name" title={offer.shop.mapId}>{offer.shop.mapId}</span>}
                </div>
                <time className="offer-time" dateTime={offer.observedAt}><span className="mobile-label">Widziano </span>{formatObservedAt(offer.observedAt)}</time>
              </article>
              )
            })}
          </div>
          <div className="pagination-wrap">
            <span>Strona {page + 1} z {totalPages}</span>
            <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        </>
      )}
    </section>
  )
}
