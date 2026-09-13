import type { ItemStatistic } from '../types'
import { formatNumber, formatYang } from '../format'
import { RefreshIcon } from './Icons'

interface StatisticsProps {
  items: ItemStatistic[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function Statistics({ items, loading, error, onRetry }: StatisticsProps) {
  return <section className="statistics" aria-label="Statystyki cen">
    {loading && <div className="inline-state" role="status"><span className="spinner" /> Pobieranie statystyk…</div>}
    {!loading && error && <div className="inline-state" role="alert"><p>{error}</p><button className="button" onClick={onRetry}><RefreshIcon /> Ponów</button></div>}
    {!loading && !error && !items.length && <p className="inline-state">Brak statystyk dla tego przedmiotu.</p>}
    {!loading && !error && items.map(stat => <article className="stat-line" key={stat.vnum}>
      <div className="stat-identity"><strong>{stat.itemName}</strong><span>VNUM {stat.vnum}</span></div>
      <dl>
        <div className="stat-min"><dt>Minimum</dt><dd>{formatYang(stat.minimumPrice)}</dd></div>
        <div><dt>Mediana</dt><dd>{formatYang(stat.medianPrice)}</dd></div>
        <div><dt>Średnia</dt><dd>{formatYang(stat.meanPrice)}</dd></div>
        <div className="stat-sample"><dt>Próba rynku</dt><dd>{formatNumber(stat.contributingShopCount)} {stat.contributingShopCount === 1 ? 'sklep' : 'sklepów'}<small>{formatNumber(stat.rawOfferCount)} {stat.rawOfferCount === 1 ? 'oferta' : 'ofert'} · {formatNumber(stat.totalQuantity)} szt.</small></dd></div>
      </dl>
    </article>)}
  </section>
}
