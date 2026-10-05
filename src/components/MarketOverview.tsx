import { useEffect, useMemo, useState } from 'react'
import { ApiError, serverApis } from '../api'
import type { GameServerId } from '../servers'
import type { MarketOverviewResponse, MarketOverviewSort, PopularItem } from '../types'
import type { ApiStatus } from './Header'
import { formatNumber, formatYang } from '../format'
import { ItemIcon } from './ItemIcon'
import { ArrowRightIcon, RefreshIcon, StoreIcon } from './Icons'

interface MarketOverviewProps {
  serverId: GameServerId
  onSelectItem: (item: PopularItem) => void
  onStatusChange: (status: ApiStatus) => void
}

function formatScanDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Nieznana data skanu'
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'short', timeZone: 'Europe/Warsaw',
  }).format(date)
}

export function MarketOverview({ serverId, onSelectItem, onStatusChange }: MarketOverviewProps) {
  const [overview, setOverview] = useState<MarketOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)
  const [sort, setSort] = useState<MarketOverviewSort>('shops')
  const requestId = useMemo(() => crypto.randomUUID(), [sort])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setOverview(null)
    void serverApis[serverId].overview(controller.signal, requestId, sort).then(data => {
      if (controller.signal.aborted) return
      setOverview(data)
      onStatusChange('online')
    }).catch(error => {
      if (controller.signal.aborted) return
      setError(error instanceof ApiError ? error.message : 'Nie udało się pobrać przeglądu rynku.')
      onStatusChange('offline')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [serverId, retryVersion, onStatusChange, requestId, sort])

  return (
    <section className="shell market-overview" id="catalog" aria-labelledby="overview-title" aria-busy={loading}>
      <div className="section-head overview-heading">
        <div>
          <div className="eyebrow">Przegląd rynku</div>
          <h2 className="section-title" id="overview-title">{sort === 'shops' ? 'Najczęściej spotykane' : 'Najwięcej sztuk'} <span>w sklepach</span></h2>
          <p className="overview-description">{sort === 'shops' ? 'Przedmioty dostępne w największej liczbie sklepów.' : 'Przedmioty o największej łącznej liczbie sztuk we wszystkich sklepach.'} Wybierz przedmiot, aby porównać jego oferty.</p>
        </div>
        {!loading && !error && overview?.scanId != null && (
          <div className="overview-scan">
            <span><StoreIcon /> {formatNumber(overview.observedShopCount)} obserwowanych sklepów</span>
            {overview.scanEndedAt && <span>Ostatni skan <time dateTime={overview.scanEndedAt}>{formatScanDate(overview.scanEndedAt)}</time></span>}
          </div>
        )}
      </div>

      <div className="overview-tabs" role="tablist" aria-label="Ranking przedmiotów">
        {(['shops', 'quantity'] as const).map(option => (
          <button type="button" role="tab" key={option} id={`overview-tab-${option}`}
            aria-selected={sort === option} aria-controls="overview-panel" tabIndex={sort === option ? 0 : -1}
            onClick={() => setSort(option)} onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 'shops' : event.key === 'End' ? 'quantity' : sort === 'shops' ? 'quantity' : 'shops'
              setSort(next)
              event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#overview-tab-${next}`)?.focus()
            }}>
            {option === 'shops' ? 'Najwięcej sklepów' : 'Najwięcej sztuk'}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="overview-panel" aria-labelledby={`overview-tab-${sort}`}>
      {loading ? (
        <>
          <span className="visually-hidden" role="status">Pobieranie przeglądu rynku…</span>
          <div className="popular-grid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <div className="popular-card popular-card--skeleton" key={index}><span /><span /><span /></div>)}
          </div>
        </>
      ) : error ? (
        <div className="empty api-error" role="alert">
          <p>{error}</p>
          <button type="button" className="api-retry" onClick={() => setRetryVersion(version => version + 1)}><RefreshIcon /> Spróbuj ponownie</button>
        </div>
      ) : !overview?.items.length ? (
        <div className="overview-empty" role="status">
          <StoreIcon />
          <h3>Rynek czeka na nowe dane</h3>
          <p>Przedmioty pojawią się tutaj po opublikowaniu skanu sklepów tego serwera.</p>
        </div>
      ) : (
        <div className="popular-grid">
          {overview.items.map((item, index) => (
            <button type="button" className="popular-card" key={`${item.vnum}-${item.itemName}`}
              onClick={() => onSelectItem(item)} aria-label={`Zobacz oferty: ${item.itemName}`}>
              <span className="popular-card__top">
                <span className="popular-card__icon"><ItemIcon vnum={item.vnum} alt="" size="large" /></span>
                <span className="popular-card__rank">#{index + 1}</span>
              </span>
              <span className="popular-card__name">{item.itemName}</span>
              <span className="popular-card__price"><span>od </span>{formatYang(item.minimumPrice)}<small>za sztukę</small></span>
              <span className="popular-card__details">
                <span><StoreIcon /> {formatNumber(item.shopCount)} {item.shopCount === 1 ? 'sklep' : item.shopCount % 10 >= 2 && item.shopCount % 10 <= 4 && (item.shopCount % 100 < 12 || item.shopCount % 100 > 14) ? 'sklepy' : 'sklepów'}</span>
                <span className={sort === 'quantity' ? 'popular-card__quantity--active' : undefined}>{formatNumber(item.totalQuantity)} szt.</span>
              </span>
              <span className="popular-card__action">Porównaj oferty <ArrowRightIcon /></span>
            </button>
          ))}
        </div>
      )}
      {!loading && !error && Boolean(overview?.items.length) && <p className="overview-note">Kolejność według {sort === 'shops' ? 'liczby sklepów' : 'łącznej liczby sztuk'} w ostatnim opublikowanym skanie. Dostępność ofert może się zmieniać.</p>}
      </div>
    </section>
  )
}
