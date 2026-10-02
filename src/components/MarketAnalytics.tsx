import { useState } from 'react'
import type { ItemStatistic, HistogramBin, DepthPoint } from '../types'
import { formatCompact, formatFull, formatYang } from '../format'

export const SMALL_SAMPLE_THRESHOLD = 10

interface MarketAnalyticsProps {
  stat: ItemStatistic | null
  loading?: boolean
}

type AnalyticsTab = 'histogram' | 'depth' | 'table'

export function MarketAnalytics({ stat, loading }: MarketAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('histogram')
  const [hoveredBinIndex, setHoveredBinIndex] = useState<number | null>(null)
  const [hoveredDepthIndex, setHoveredDepthIndex] = useState<number | null>(null)

  if (loading) {
    return (
      <section className="market-analytics market-analytics--loading" aria-label="Analiza rynku w trakcie ładowania">
        <div className="analytics-loading">
          <span className="spinner" /> Pobieranie analityki rynku…
        </div>
      </section>
    )
  }

  if (!stat) {
    return null
  }

  const isSmallSample = stat.contributingShopCount < SMALL_SAMPLE_THRESHOLD
  const histogram = stat.histogram || []
  const depth = stat.depth || []
  const buyerRef = stat.buyerReference
  const percentiles = stat.percentiles
  const outliers = stat.outliers

  // Maximum values for SVG scaling
  const maxBinCount = histogram.length > 0 ? Math.max(...histogram.map((b) => b.shopCount), 1) : 1
  const maxDepthQty = depth.length > 0 ? Math.max(...depth.map((d) => d.cumulativeQuantity), 1) : 1

  return (
    <section className="market-analytics" aria-label={`Analiza rynku dla ${stat.itemName}`}>
      <div className="analytics-header">
        <div className="analytics-title-group">
          <h3 className="analytics-heading">
            Rozkład cen i głębokość rynku / <span>{stat.itemName}</span>
          </h3>
          <p className="analytics-subtitle">
            Ceny wystawienia z najnowszego opublikowanego skanu (1 unikalny sklep = 1 głos w rozkładzie cen)
          </p>
        </div>

        {isSmallSample && (
          <div className="sample-badge sample-badge--warning" role="note">
            Mała próba rynku ({stat.contributingShopCount} {stat.contributingShopCount === 1 ? 'sklep' : 'sklepy'}) — wskaźnik P20 ma charakter orientacyjny
          </div>
        )}

        <div className="analytics-tabs" role="tablist" aria-label="Widoki analizy">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'histogram'}
            className={`analytics-tab-btn ${activeTab === 'histogram' ? 'active' : ''}`}
            onClick={() => setActiveTab('histogram')}
          >
            Rozkład cen (histogram)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'depth'}
            className={`analytics-tab-btn ${activeTab === 'depth' ? 'active' : ''}`}
            onClick={() => setActiveTab('depth')}
          >
            Głębokość rynku (podaż)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'table'}
            className={`analytics-tab-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            Tabela poziomów cen
          </button>
        </div>
      </div>

      <div className="analytics-body">
        {/* ================= HISTOGRAM TAB ================= */}
        {activeTab === 'histogram' && (
          <div className="analytics-view" role="tabpanel" aria-label="Histogram rozkładu cen">
            <div className="analytics-kpis">
              <div className="kpi-card">
                <span className="kpi-label">Atrakcyjna cena (P20)</span>
                <span className="kpi-value">{buyerRef ? formatCompact(buyerRef.price) : '—'} Yang</span>
                <span className="kpi-sub">
                  {buyerRef ? `${buyerRef.shopsAtOrBelow} z ${stat.contributingShopCount} sklepów oferuje za tyle lub taniej` : '—'}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Typowy zakres (P25–P75)</span>
                <span className="kpi-value">
                  {percentiles ? `${formatCompact(percentiles.p25)} – ${formatCompact(percentiles.p75)}` : '—'} Yang
                </span>
                <span className="kpi-sub">Środkowe 50% najtańszych ofert sklepów</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Średnia ucinana (10%)</span>
                <span className="kpi-value">{stat.trimmedMeanPrice ? formatCompact(stat.trimmedMeanPrice) : formatCompact(stat.meanPrice)} Yang</span>
                <span className="kpi-sub">Odporna na skrajnie wysokie oferty</span>
              </div>
              {outliers && outliers.totalCount > 0 && (
                <div className="kpi-card kpi-card--outlier">
                  <span className="kpi-label">Odstające ceny</span>
                  <span className="kpi-value">{outliers.totalCount}</span>
                  <span className="kpi-sub">
                    {outliers.upperCount > 0 ? `${outliers.upperCount} skrajnie drogich` : ''}
                    {outliers.lowerCount > 0 ? ` · ${outliers.lowerCount} skrajnie tanich` : ''}
                  </span>
                </div>
              )}
            </div>

            {histogram.length === 0 ? (
              <div className="chart-empty">Brak danych do wygenerowania rozkładu cen.</div>
            ) : (
              <div className="chart-container">
                <div className="chart-svg-wrap">
                  <svg
                    viewBox="0 0 700 240"
                    className="analytics-svg"
                    role="img"
                    aria-label="Wykres słupkowy rozkładu najtańszych cen w poszczególnych sklepach"
                  >
                    {/* Background grid lines */}
                    <line x1="60" y1="30" x2="680" y2="30" stroke="var(--line)" strokeDasharray="3 3" />
                    <line x1="60" y1="110" x2="680" y2="110" stroke="var(--line)" strokeDasharray="3 3" />
                    <line x1="60" y1="190" x2="680" y2="190" stroke="var(--line-strong)" />

                    {/* Y-axis labels */}
                    <text x="50" y="34" className="chart-axis-text" textAnchor="end">
                      {maxBinCount}
                    </text>
                    <text x="50" y="114" className="chart-axis-text" textAnchor="end">
                      {Math.round(maxBinCount / 2)}
                    </text>
                    <text x="50" y="194" className="chart-axis-text" textAnchor="end">
                      0
                    </text>
                    <text x="25" y="110" className="chart-axis-title" textAnchor="middle" transform="rotate(-90, 25, 110)">
                      Liczba sklepów
                    </text>

                    {/* Bars */}
                    {histogram.map((bin: HistogramBin, index: number) => {
                      const barAreaWidth = 620
                      const barSlot = barAreaWidth / histogram.length
                      const barWidth = Math.max(14, barSlot - 10)
                      const x = 60 + index * barSlot + (barSlot - barWidth) / 2
                      const barHeight = maxBinCount > 0 ? (bin.shopCount / maxBinCount) * 155 : 0
                      const y = 190 - barHeight
                      const isHovered = hoveredBinIndex === index

                      return (
                        <g
                          key={index}
                          tabIndex={0}
                          role="graphics-symbol"
                          aria-label={`Przedział ${formatCompact(bin.fromPrice)} do ${formatCompact(bin.toPrice)} Yang: ${bin.shopCount} sklepów`}
                          onMouseEnter={() => setHoveredBinIndex(index)}
                          onMouseLeave={() => setHoveredBinIndex(null)}
                          onFocus={() => setHoveredBinIndex(index)}
                          onBlur={() => setHoveredBinIndex(null)}
                          className="histogram-bar-group"
                        >
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={Math.max(barHeight, 2)}
                            rx="3"
                            className={`histogram-bar ${isHovered ? 'histogram-bar--hover' : ''}`}
                          />
                          {bin.shopCount > 0 && (
                            <text
                              x={x + barWidth / 2}
                              y={Math.max(y - 6, 20)}
                              className="histogram-bar-count"
                              textAnchor="middle"
                            >
                              {bin.shopCount}
                            </text>
                          )}
                          <text
                            x={x + barWidth / 2}
                            y="208"
                            className="histogram-bar-label"
                            textAnchor="middle"
                          >
                            {formatCompact(bin.fromPrice)}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>

                {hoveredBinIndex != null && histogram[hoveredBinIndex] && (
                  <div className="chart-tooltip-info">
                    Przedział cenowy: <strong>{formatYang(histogram[hoveredBinIndex].fromPrice)} – {formatYang(histogram[hoveredBinIndex].toPrice)}</strong>
                    {' · '}
                    Liczba sklepów w przedziale: <strong>{histogram[hoveredBinIndex].shopCount}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= MARKET DEPTH TAB ================= */}
        {activeTab === 'depth' && (
          <div className="analytics-view" role="tabpanel" aria-label="Wykres głębokości rynku">
            <div className="analytics-kpis">
              <div className="kpi-card">
                <span className="kpi-label">Dostępne do atrakcyjnej ceny (P20)</span>
                <span className="kpi-value">{buyerRef ? formatFull(buyerRef.quantityAtOrBelow) : '—'} szt.</span>
                <span className="kpi-sub">w {buyerRef ? buyerRef.shopsAtOrBelow : '—'} sklepach do {buyerRef ? formatCompact(buyerRef.price) : '—'} Yang</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Całkowita podaż rynku</span>
                <span className="kpi-value">{formatFull(stat.totalQuantity)} szt.</span>
                <span className="kpi-sub">{stat.contributingShopCount} unikalnych sklepów</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Liczba poziomów cenowych</span>
                <span className="kpi-value">{depth.length}</span>
                <span className="kpi-sub">od {formatCompact(stat.minimumPrice)} Yang</span>
              </div>
            </div>

            {depth.length === 0 ? (
              <div className="chart-empty">Brak danych głębokości rynku.</div>
            ) : (
              <div className="chart-container">
                <div className="chart-svg-wrap">
                  <svg
                    viewBox="0 0 700 240"
                    className="analytics-svg"
                    role="img"
                    aria-label="Wykres skumulowanej podaży ilości sztuk względem ceny jednostkowej"
                  >
                    {/* Grid lines */}
                    <line x1="60" y1="30" x2="680" y2="30" stroke="var(--line)" strokeDasharray="3 3" />
                    <line x1="60" y1="110" x2="680" y2="110" stroke="var(--line)" strokeDasharray="3 3" />
                    <line x1="60" y1="190" x2="680" y2="190" stroke="var(--line-strong)" />

                    {/* Y-axis labels */}
                    <text x="50" y="34" className="chart-axis-text" textAnchor="end">
                      {maxDepthQty} szt.
                    </text>
                    <text x="50" y="114" className="chart-axis-text" textAnchor="end">
                      {Math.round(maxDepthQty / 2)}
                    </text>
                    <text x="50" y="194" className="chart-axis-text" textAnchor="end">
                      0
                    </text>

                    {/* Depth Step Line / Area */}
                    {(() => {
                      const chartW = 620
                      const points = depth.map((d: DepthPoint, idx: number) => {
                        const x = 60 + (idx / Math.max(1, depth.length - 1)) * chartW
                        const y = 190 - (d.cumulativeQuantity / maxDepthQty) * 155
                        return { x, y, d, idx }
                      })

                      const pathD = points.length === 1
                        ? `M 60 190 L 60 ${points[0].y} L 680 ${points[0].y} L 680 190 Z`
                        : `M 60 190 ` +
                          points.map((p, i) => (i === 0 ? `L ${p.x} ${p.y}` : `H ${p.x} V ${p.y}`)).join(' ') +
                          ` H 680 V 190 Z`

                      const strokeD = points.length === 1
                        ? `M 60 ${points[0].y} L 680 ${points[0].y}`
                        : `M ${points[0].x} ${points[0].y} ` +
                          points.slice(1).map((p) => `H ${p.x} V ${p.y}`).join(' ')

                      return (
                        <>
                          <path d={pathD} className="depth-area" />
                          <path d={strokeD} className="depth-line" />
                          {points.map((p) => {
                            const isBuyerRef = buyerRef && p.d.price === buyerRef.price
                            const isHovered = hoveredDepthIndex === p.idx
                            return (
                              <g
                                key={p.idx}
                                tabIndex={0}
                                role="graphics-symbol"
                                aria-label={`Cena: ${formatYang(p.d.price)}, skumulowana ilość: ${p.d.cumulativeQuantity} sztuk`}
                                onMouseEnter={() => setHoveredDepthIndex(p.idx)}
                                onMouseLeave={() => setHoveredDepthIndex(null)}
                                onFocus={() => setHoveredDepthIndex(p.idx)}
                                onBlur={() => setHoveredDepthIndex(null)}
                                className="depth-point-group"
                              >
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={isHovered ? 6 : isBuyerRef ? 5 : 3.5}
                                  className={`depth-dot ${isBuyerRef ? 'depth-dot--buyer' : ''} ${isHovered ? 'depth-dot--hover' : ''}`}
                                />
                                <text
                                  x={p.x}
                                  y="208"
                                  className="histogram-bar-label"
                                  textAnchor="middle"
                                >
                                  {formatCompact(p.d.price)}
                                </text>
                              </g>
                            )
                          })}
                        </>
                      )
                    })()}
                  </svg>
                </div>

                {hoveredDepthIndex != null && depth[hoveredDepthIndex] && (
                  <div className="chart-tooltip-info">
                    Cena: <strong>{formatYang(depth[hoveredDepthIndex].price)}</strong>
                    {' · '}
                    Dostępne po tej cenie: <strong>{depth[hoveredDepthIndex].quantityAtPrice} szt.</strong> ({depth[hoveredDepthIndex].shopCountAtPrice} {depth[hoveredDepthIndex].shopCountAtPrice === 1 ? 'sklep' : 'sklepów'})
                    {' · '}
                    Łącznie do tej ceny: <strong>{depth[hoveredDepthIndex].cumulativeQuantity} szt.</strong> ({depth[hoveredDepthIndex].cumulativeShopCount} {depth[hoveredDepthIndex].cumulativeShopCount === 1 ? 'sklep' : 'sklepów'})
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= DATA TABLE TAB ================= */}
        {activeTab === 'table' && (
          <div className="analytics-view" role="tabpanel" aria-label="Tabela poziomów cenowych i podaży">
            <div className="table-responsive">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th scope="col">Cena jedn. (Yang)</th>
                    <th scope="col">Ilość w cenie</th>
                    <th scope="col">Sklepy w cenie</th>
                    <th scope="col">Suma sztuk (narastająco)</th>
                    <th scope="col">Suma sklepów</th>
                  </tr>
                </thead>
                <tbody>
                  {depth.map((d: DepthPoint, index: number) => {
                    const isBuyerRef = buyerRef && d.price === buyerRef.price
                    return (
                      <tr key={index} className={isBuyerRef ? 'table-row--highlight' : ''}>
                        <td>
                          <strong>{formatYang(d.price)}</strong>
                          {isBuyerRef && <span className="row-badge">P20 · Atrakcyjna</span>}
                        </td>
                        <td>{formatFull(d.quantityAtPrice)} szt.</td>
                        <td>{formatFull(d.shopCountAtPrice)}</td>
                        <td>
                          <strong>{formatFull(d.cumulativeQuantity)} szt.</strong>
                        </td>
                        <td>{formatFull(d.cumulativeShopCount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
