import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { serverApis } from './api'
import type { ItemSuggestion, MarketOffer } from './types'
import { mockItems, mockSuggestions } from './mockData'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { SearchSection } from './components/SearchSection'
import { ListingItem } from './components/ListingItem'
import { MarketAside, type AggregatedStats } from './components/MarketAside'
import { Manifesto } from './components/Manifesto'
import { Footer } from './components/Footer'
import { ItemDrawer } from './components/ItemDrawer'
import { Toast } from './components/Toast'
import { shortMap } from './format'
import { getSelectedServer } from './servers'

const PAGE_SIZE = 8

export default function App() {
  const server = getSelectedServer()
  const api = serverApis[server.id]
  const [isLive, setIsLive] = useState<boolean>(true)
  const [query, setQuery] = useState(server.id === 'pandora' ? 'Zatruty miecz' : '')
  const [vnums, setVnums] = useState<number[]>(server.id === 'pandora' ? [180, 181, 182, 183, 184, 185, 186, 187, 188, 189] : [])
  const [activeSuggestion, setActiveSuggestion] = useState<ItemSuggestion | null>(server.id === 'pandora' ? mockSuggestions[0] : null)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<'api' | 'priceDesc' | 'quantity'>('api')
  const [mapFilter, setMapFilter] = useState('')
  const [rawItems, setRawItems] = useState<MarketOffer[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<AggregatedStats | null>(null)
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>(server.id === 'pandora' ? mockSuggestions : [])
  const [activeDrawerItem, setActiveDrawerItem] = useState<MarketOffer | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toastTimerRef = useRef<number | null>(null)
  const suggestTimerRef = useRef<number | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3000)
  }, [])

  useEffect(() => {
    document.title = 'Metin Market — ' + server.name
  }, [server.name])

  // Probe API connection on startup
  useEffect(() => {
    let active = true
    api.probe(1500).then((live) => {
      if (!active) return
      setIsLive(live)
      if (!live) {
        showToast('API niedostępne — pokazuję dane demonstracyjne.')
      }
    })
    return () => {
      active = false
    }
  }, [showToast])

  // Compute local fallback statistics
  const computeLocalStats = useCallback((items: MarketOffer[]): AggregatedStats | null => {
    const prices = items
      .map((i) => Number(i.unitPrice))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)

    if (!prices.length) return null

    const mid = Math.floor(prices.length / 2)
    const median = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2

    return {
      minimumPrice: prices[0],
      meanPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      medianPrice: median,
      contributingShopCount: new Set(items.map((i) => i.shop?.vid || i.shop?.title)).size,
      totalQuantity: items.reduce((s, i) => s + (Number(i.totalQuantity) || Number(i.quantity) || 0), 0),
    }
  }, [])

  // Load items
  const loadData = useCallback(async (currentQuery: string, currentVnums: number[], currentPage: number) => {
    setLoading(true)
    try {
      let data: { items: MarketOffer[]; totalElements: number }

      try {
        data = await api.offers({
          query: currentQuery,
          vnums: currentVnums,
          page: currentPage,
          size: PAGE_SIZE,
        })
        setIsLive(true)
      } catch {
        setIsLive(false)
        const q = currentQuery.toLocaleLowerCase('pl').trim()
        let filtered = server.id === 'pandora' ? mockItems.filter(
          (i) => !q || i.itemName.toLocaleLowerCase('pl').includes(q)
        ) : []
        if (currentVnums.length > 0) {
          filtered = filtered.filter((i) => currentVnums.includes(i.vnum))
        }
        data = {
          items: filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
          totalElements: filtered.length,
        }
      }

      const items = data.items || []
      setRawItems(items)
      setTotalElements(data.totalElements ?? items.length)

      // Fetch or compute statistics
      const statsVnums = currentVnums.length > 0
        ? currentVnums
        : [...new Set(items.map((i) => i.vnum))].slice(0, 100)

      if (statsVnums.length > 0) {
        try {
          const statsData = await api.statistics(statsVnums)
          const rows = statsData.items || []
          if (rows.length === 1) {
            const r = rows[0]
            setStats({
              minimumPrice: r.minimumPrice,
              meanPrice: r.meanPrice,
              medianPrice: r.medianPrice,
              contributingShopCount: r.contributingShopCount,
              totalQuantity: r.totalQuantity,
            })
          } else if (rows.length > 1) {
            const mins = rows.map((r) => Number(r.minimumPrice)).filter(Number.isFinite)
            const means = rows.map((r) => Number(r.meanPrice)).filter(Number.isFinite)
            const medians = rows.map((r) => Number(r.medianPrice)).filter(Number.isFinite)
            setStats({
              minimumPrice: Math.min(...mins),
              meanPrice: means.reduce((a, b) => a + b, 0) / means.length,
              medianPrice: medians.sort((a, b) => a - b)[Math.floor(medians.length / 2)],
              contributingShopCount: rows.reduce((s, r) => s + Number(r.contributingShopCount || 0), 0),
              totalQuantity: rows.reduce((s, r) => s + Number(r.totalQuantity || 0), 0),
            })
          } else {
            setStats(computeLocalStats(items))
          }
        } catch {
          setStats(computeLocalStats(items))
        }
      } else {
        setStats(computeLocalStats(items))
      }
    } finally {
      setLoading(false)
    }
  }, [computeLocalStats])

  useEffect(() => {
    loadData(query, vnums, page)
  }, [query, vnums, page, loadData])

  // Fetch suggestions
  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)

    if (!val.trim()) {
      setSuggestions([])
      return
    }

    suggestTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await api.suggestions(val.trim())
        if (res.suggestions && res.suggestions.length > 0) {
          setSuggestions(res.suggestions)
          return
        }
      } catch {
        // fallback to mock suggestions
      }
      const lq = val.toLocaleLowerCase('pl')
      const local = server.id === 'pandora' ? mockSuggestions.filter((s) => s.name.toLocaleLowerCase('pl').includes(lq)) : []
      setSuggestions(local)
    }, 220)
  }

  const handleSearchSubmit = (newQuery: string) => {
    setQuery(newQuery)
    setVnums([])
    setActiveSuggestion(null)
    setPage(0)
  }

  const handleSelectSuggestion = (s: ItemSuggestion) => {
    setActiveSuggestion(s)
    const normalizedName = s.kind === 'UPGRADE_FAMILY' ? s.name.replace(/\s\+0-9$/, '') : s.name
    setQuery(normalizedName)
    setVnums(s.kind === 'UPGRADE_FAMILY' ? s.memberVnums || [] : s.vnum != null ? [s.vnum] : [])
    setPage(0)
  }

  // Filter and sort items
  const displayedItems = useMemo(() => {
    let list = [...rawItems]
    if (mapFilter) {
      list = list.filter((i) => (i.shop?.mapId || '') === mapFilter)
    }
    if (sort === 'priceDesc') {
      list.sort((a, b) => b.unitPrice - a.unitPrice)
    } else if (sort === 'quantity') {
      list.sort((a, b) => (b.totalQuantity || b.quantity) - (a.totalQuantity || a.quantity))
    }
    return list
  }, [rawItems, mapFilter, sort])

  // Available map options
  const availableMaps = useMemo(() => {
    return [...new Set(rawItems.map((i) => i.shop?.mapId).filter(Boolean) as string[])]
  }, [rawItems])

  const maxPage = Math.ceil(totalElements / PAGE_SIZE) - 1

  return (
    <>
      <Header isLive={isLive} currentServer={server.id} />

      <main>
        <Hero serverName={server.name} />

        <SearchSection
          query={query}
          suggestions={suggestions}
          onSearch={handleSearchSubmit}
          onSelectSuggestion={handleSelectSuggestion}
          onQueryChange={handleQueryChange}
        />

        <section className="shell" id="market">
          <div className="section-head">
            <h2 className="section-title">
              Oferty / <span>{query || 'ostatni skan'}</span>
            </h2>
            <div className="section-note">dane z najnowszego opublikowanego skanu</div>
          </div>

          <div className="market-layout">
            <div className={`results-pane ${loading ? 'results-pane--loading' : ''}`}>
              <div className="toolbar">
                <div className="filters">
                  <label className="field">
                    Sortowanie
                    <select
                      className="custom-select"
                      value={sort}
                      onChange={(e) => setSort(e.target.value as 'api' | 'priceDesc' | 'quantity')}
                    >
                      <option value="api">Najtańsze / szt.</option>
                      <option value="priceDesc">Najdroższe / szt.</option>
                      <option value="quantity">Największa ilość</option>
                    </select>
                  </label>

                  <label className="field">
                    Mapa
                    <select
                      className="custom-select"
                      value={mapFilter}
                      onChange={(e) => setMapFilter(e.target.value)}
                    >
                      <option value="">Wszystkie</option>
                      {availableMaps.map((mapId) => (
                        <option key={mapId} value={mapId}>
                          {shortMap(mapId)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="count">{totalElements} wyników</div>
              </div>

              {displayedItems.length > 0 ? (
                displayedItems.map((item) => (
                  <ListingItem
                    key={`${item.listingId}-${item.vnum}`}
                    item={item}
                    onOpenDetails={(i) => setActiveDrawerItem(i)}
                  />
                ))
              ) : (
                <div className="empty">Brak ofert dla wybranego zapytania.</div>
              )}

              <div className="pager">
                <div className="page-buttons">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    aria-label="Poprzednia strona"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={page >= maxPage || (page + 1) * PAGE_SIZE >= totalElements}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Następna strona"
                  >
                    →
                  </button>
                </div>
                <div className="count">
                  strona <span>{page + 1}</span>
                </div>
              </div>
            </div>

            <MarketAside
              selectionTitle={activeSuggestion?.name || query || 'Wszystkie przedmioty'}
              selectionSubtitle={
                vnums.length > 0
                  ? `Filtr VNUM: ${vnums.join(', ')}.`
                  : 'Wyniki dopasowane po nazwie przedmiotu.'
              }
              stats={stats}
            />
          </div>
        </section>

        <Manifesto />
      </main>

      <Footer />

      <ItemDrawer
        item={activeDrawerItem}
        onClose={() => setActiveDrawerItem(null)}
      />

      <Toast message={toastMessage} />
    </>
  )
}
