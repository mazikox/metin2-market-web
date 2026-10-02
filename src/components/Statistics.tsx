import type { ItemStatistic } from '../types'
import { formatCompact, formatNumber, formatYang } from '../format'
import { RefreshIcon } from './Icons'

interface StatisticsProps {
  items: ItemStatistic[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function Statistics({ items, loading, error, onRetry }: StatisticsProps) {
  return (
    <section className="statistics" aria-label="Statystyki cen">
      {loading && (
        <div className="inline-state" role="status">
          <span className="spinner" /> Pobieranie statystyk…
        </div>
      )}
      {!loading && error && (
        <div className="inline-state" role="alert">
          <p>{error}</p>
          <button className="button" onClick={onRetry}>
            <RefreshIcon /> Ponów
          </button>
        </div>
      )}
      {!loading && !error && !items.length && (
        <p className="inline-state">Brak statystyk dla tego przedmiotu.</p>
      )}
      {!loading && !error && items.map((stat) => {
        const buyerRef = stat.buyerReference
        const percentiles = stat.percentiles
        return (
          <article className="stat-line" key={stat.vnum}>
            <div className="stat-identity">
              <strong>{stat.itemName}</strong>
              <span>VNUM {stat.vnum}</span>
            </div>
            <dl>
              {buyerRef && (
                <div className="stat-buyer">
                  <dt>Atrakcyjna (P20)</dt>
                  <dd>
                    {formatYang(buyerRef.price)}
                    <small>{buyerRef.shopsAtOrBelow} z {stat.contributingShopCount} skl. · {buyerRef.quantityAtOrBelow} szt.</small>
                  </dd>
                </div>
              )}
              <div className="stat-min">
                <dt>Minimum</dt>
                <dd>{formatYang(stat.minimumPrice)}</dd>
              </div>
              <div>
                <dt>Mediana (P50)</dt>
                <dd>{formatYang(stat.medianPrice)}</dd>
              </div>
              {percentiles && (
                <div>
                  <dt>Typowy zakres (P25–P75)</dt>
                  <dd>{formatCompact(percentiles.p25)} – {formatCompact(percentiles.p75)} Yang</dd>
                </div>
              )}
              <div className="stat-sample">
                <dt>Próba rynku</dt>
                <dd>
                  {formatNumber(stat.contributingShopCount)} {stat.contributingShopCount === 1 ? 'sklep' : 'sklepów'}
                  <small>{formatNumber(stat.rawOfferCount)} {stat.rawOfferCount === 1 ? 'oferta' : 'ofert'} · {formatNumber(stat.totalQuantity)} szt.</small>
                </dd>
              </div>
            </dl>
          </article>
        )
      })}
    </section>
  )
}
