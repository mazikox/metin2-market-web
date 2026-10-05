import { formatCompact, formatFull } from '../format'
import type { ItemStatistic } from '../types'

export const SMALL_SAMPLE_THRESHOLD = 10

interface MarketAsideProps {
  selectionTitle: string
  selectionSubtitle: string
  stat: ItemStatistic | null
  familyStats?: ItemStatistic[] | null
  isUpgradeFamily?: boolean
  onSelectLevel?: (vnum: number, name: string) => void
  onOpenAnalytics?: () => void
}

export function MarketAside({
  selectionTitle,
  selectionSubtitle,
  stat,
  familyStats,
  isUpgradeFamily,
  onSelectLevel,
  onOpenAnalytics,
}: MarketAsideProps) {
  const isSmallSample = stat ? stat.contributingShopCount < SMALL_SAMPLE_THRESHOLD : false
  const buyerRef = stat?.buyerReference
  const percentiles = stat?.percentiles
  const outliers = stat?.outliers
  const isFamilyMultiSelection = Boolean(isUpgradeFamily && familyStats && familyStats.length > 1)
  const hasAnalyticsData = Boolean(stat && !isFamilyMultiSelection)

  return (
    <aside className="market-aside" aria-label="Podsumowanie statystyk rynku">
      <div className="aside-block">
        <h3 className="aside-title">Wybrany przedmiot</h3>
        <div className="caption">{selectionSubtitle}</div>
        <div className="selection-chip">{selectionTitle}</div>
      </div>

      {/* When upgrade family is selected with multiple items */}
      {isFamilyMultiSelection && familyStats ? (
        <div className="aside-block">
          <h3 className="aside-title">Ceny wg poziomu ulepszenia</h3>
          <p className="caption">
            Dla rodziny ulepszeń (+0...+9) ceny różnią się zależnie od poziomu. Wybierz konkretny poziom, aby zobaczyć jego szczegółową analitykę i rozkład cen.
          </p>
          <div className="family-breakdown">
            {familyStats.map((item) => (
              <button
                key={item.vnum}
                type="button"
                className="family-level-card"
                onClick={() => onSelectLevel?.(item.vnum, item.itemName)}
              >
                <div className="family-level-name">{item.itemName}</div>
                <div className="family-level-price">od {formatCompact(item.minimumPrice)} Yang</div>
                <div className="family-level-shops">{item.contributingShopCount} {item.contributingShopCount === 1 ? 'sklep' : 'sklepów'} · {item.totalQuantity} szt.</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="aside-block">
          <h3 className="aside-title">Statystyki ceny</h3>

          {/* ATRAKCYJNA CENA (P20 benchmark) */}
          <div className="stat-hero-block">
            <div className="stat-label">Atrakcyjna cena (P20)</div>
            <div className="stat-feature">
              {buyerRef ? formatCompact(buyerRef.price) : stat ? formatCompact(stat.minimumPrice) : '—'}
            </div>
            <div className="stat-hero-note">
              {buyerRef && stat
                ? `P20 · ${buyerRef.shopsAtOrBelow} z ${stat.contributingShopCount} sklepów ma tę cenę lub niższą`
                : 'Yang za sztukę'}
            </div>
          </div>

          {isSmallSample && stat && (
            <div className="aside-warning" role="note">
              Mała próba rynku ({stat.contributingShopCount} {stat.contributingShopCount === 1 ? 'sklep' : 'sklepy'})
            </div>
          )}

          <div className="stats-grid">
            <div>
              <div className="stat-value">{stat ? formatCompact(stat.minimumPrice) : '—'}</div>
              <div className="stat-label">najniższa</div>
            </div>

            <div>
              <div className="stat-value">{stat ? formatCompact(stat.medianPrice) : '—'}</div>
              <div className="stat-label">typowa (mediana)</div>
            </div>

            <div>
              <div className="stat-value">
                {percentiles ? `${formatCompact(percentiles.p25)} – ${formatCompact(percentiles.p75)}` : '—'}
              </div>
              <div className="stat-label">typowy zakres (P25–P75)</div>
            </div>

            <div>
              <div className="stat-value">
                {buyerRef ? `${buyerRef.shopsAtOrBelow} skl. · ${buyerRef.quantityAtOrBelow} szt.` : '—'}
              </div>
              <div className="stat-label">do atrakcyjnej ceny</div>
            </div>

            <div>
              <div className="stat-value">
                {stat ? `${formatFull(stat.contributingShopCount)} skl. · ${formatFull(stat.totalQuantity)} szt.` : '—'}
              </div>
              <div className="stat-label">rynek (sklepy · sztuki)</div>
            </div>

            <div>
              <div className="stat-value">{outliers ? outliers.totalCount : '—'}</div>
              <div className="stat-label">odstające ceny</div>
            </div>
          </div>
        </div>
      )}

      {/* Szczegółowa analityka trigger button placed right above 'Jak interpretować wyniki' */}
      {hasAnalyticsData && (
        <div className="aside-block">
          <h3 className="aside-title">Szczegółowa analityka</h3>
          <button
            type="button"
            className="aside-analytics-trigger"
            onClick={onOpenAnalytics}
            aria-haspopup="dialog"
          >
            <div className="aside-analytics-trigger__content">
              <span className="aside-analytics-trigger__title">Rozkład i głębokość rynku</span>
              <span className="aside-analytics-trigger__desc">
                Histogram · Wykres podaży · Tabela cen
              </span>
            </div>
            <div className="aside-analytics-trigger__arrow" aria-hidden="true">
              →
            </div>
          </button>
        </div>
      )}

      <div className="aside-block">
        <h3 className="aside-title">Jak interpretować wyniki</h3>
        <p className="caption">
          Ceny pochodzą z aktywnych skanów wybranych map i stanowią ceny wystawienia. Serwis nie gromadzi historii transakcji, a oferta mogła zostać sprzedana.
        </p>
      </div>
    </aside>
  )
}
