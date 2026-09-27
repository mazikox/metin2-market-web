import { formatCompact, formatFull } from '../format'

export interface AggregatedStats {
  minimumPrice: number | null
  medianPrice: number | null
  meanPrice: number | null
  contributingShopCount: number | null
  totalQuantity: number | null
}

interface MarketAsideProps {
  selectionTitle: string
  selectionSubtitle: string
  stats: AggregatedStats | null
}

export function MarketAside({
  selectionTitle,
  selectionSubtitle,
  stats,
}: MarketAsideProps) {
  return (
    <aside className="market-aside">
      <div className="aside-block">
        <h3 className="aside-title">Wybrany przedmiot</h3>
        <div className="caption">{selectionSubtitle}</div>
        <div className="selection-chip">{selectionTitle}</div>
      </div>

      <div className="aside-block">
        <h3 className="aside-title">Statystyki ceny</h3>
        <div className="stat-label">minimum za sztukę</div>
        <div className="stat-feature">{stats ? formatCompact(stats.minimumPrice) : '—'}</div>
        <div className="stat-label">Yang</div>

        <div className="stats-grid">
          <div>
            <div className="stat-value">{stats ? formatCompact(stats.medianPrice) : '—'}</div>
            <div className="stat-label">mediana</div>
          </div>
          <div>
            <div className="stat-value">{stats ? formatCompact(stats.meanPrice) : '—'}</div>
            <div className="stat-label">średnia</div>
          </div>
          <div>
            <div className="stat-value">{stats ? formatFull(stats.contributingShopCount) : '—'}</div>
            <div className="stat-label">sklepów</div>
          </div>
          <div>
            <div className="stat-value">{stats ? formatFull(stats.totalQuantity) : '—'}</div>
            <div className="stat-label">sztuk</div>
          </div>
        </div>
      </div>

      <div className="aside-block">
        <h3 className="aside-title">Jak interpretować wyniki</h3>
        <p className="caption">
          Serwis pokazuje zapis rynku z konkretnego momentu. Możesz porównywać ceny,
          ilości i bonusy, ale widoczna oferta nie musi nadal znajdować się w sklepie.
        </p>
      </div>
    </aside>
  )
}
