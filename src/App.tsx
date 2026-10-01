import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, serverApis } from './api'
import type { ItemSuggestion, MarketOffer } from './types'
import { Header, type ApiStatus } from './components/Header'
import { Hero } from './components/Hero'
import { SearchSection } from './components/SearchSection'
import { ListingItem } from './components/ListingItem'
import { MarketAside, type AggregatedStats } from './components/MarketAside'
import { Manifesto } from './components/Manifesto'
import { Footer } from './components/Footer'
import { ItemDrawer } from './components/ItemDrawer'
import { shortMap } from './format'
import { getSelectedServer } from './servers'
import site from './site.json'

const PAGE_SIZE = 8
type ActiveSection = 'market' | 'catalog' | 'about' | null

export default function App() {
  const server = getSelectedServer()
  const api = serverApis[server.id]
  const initialQuery = server.id === 'pandora' ? 'Zatruty miecz' : ''
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [query, setQuery] = useState(initialQuery)
  const [inputQuery, setInputQuery] = useState(initialQuery)
  const [vnums, setVnums] = useState<number[]>(server.id === 'pandora' ? [180, 181, 182, 183, 184, 185, 186, 187, 188, 189] : [])
  const [activeSuggestion, setActiveSuggestion] = useState<ItemSuggestion | null>(null)
  const [page, setPage] = useState(0)
  // Tokens identify only an action/request and live in this mounted component.
  const [searchId, setSearchId] = useState<string>()
  const requestId = useMemo(() => crypto.randomUUID(), [page, searchId])
  const [sort, setSort] = useState<'api' | 'priceDesc' | 'quantity'>('api')
  const [mapFilter, setMapFilter] = useState('')
  const [rawItems, setRawItems] = useState<MarketOffer[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)
  const [stats, setStats] = useState<AggregatedStats | null>(null)
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([])
  const [activeDrawerItem, setActiveDrawerItem] = useState<MarketOffer | null>(null)
  const [activeSection, setActiveSection] = useState<ActiveSection>(null)

  const suggestTimerRef = useRef<number | null>(null)
  const suggestionControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const title = `Rynek Metin2 ${server.name} — ${site.name}`
    const description = `Porównuj ceny, bonusy i lokalizacje przedmiotów na serwerze ${server.name}. Przeglądaj oferty z opublikowanych skanów rynku Metin2.`
    const canonical = site.url + (server.id === 'pandora' ? '/' : '/?server=' + server.id)
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    // The shared HTML cannot know which server query is requested.
    // Inject one canonical instead of changing a conflicting value in the HTML.
    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.rel = 'canonical'
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.href = canonical
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical)
  }, [server.name, server.id])

  useEffect(() => {
    let frame = 0
    const updateActiveSection = () => {
      frame = 0
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight
      const reachedAnchor = (id: string) => {
        const anchor = document.getElementById(id)
        if (!anchor) return false
        const margin = Number.parseFloat(getComputedStyle(anchor).scrollMarginTop) || 0
        const targetScrollY = Math.min(maxScrollY, anchor.getBoundingClientRect().top + window.scrollY - margin)
        return window.scrollY > 0 && window.scrollY >= targetScrollY - 1
      }
      const atBottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2

      setActiveSection(atBottom || reachedAnchor('about') ? 'about' : reachedAnchor('catalog') ? 'catalog' : reachedAnchor('market') ? 'market' : null)
    }
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
      suggestionControllerRef.current?.abort()
    }
  }, [])

  // Compute local statistics when the statistics endpoint is unavailable.
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

  // Use the actual offers request as the source of API status.
  const loadData = useCallback(async (
    currentQuery: string,
    currentVnums: number[],
    currentPage: number,
    signal: AbortSignal,
  ) => {
    setLoading(true)
    setMarketError(null)
    setRawItems([])
    setTotalElements(0)
    setStats(null)
    try {
      const data = await api.offers({
        query: currentQuery,
        vnums: currentVnums,
        page: currentPage,
        size: PAGE_SIZE,
        requestId,
        searchId,
      }, signal)
      if (signal.aborted) return

      const items = data.items || []
      setApiStatus('online')
      setMarketError(null)
      setRawItems(items)
      setTotalElements(data.totalElements ?? items.length)
      // Offers are ready to use; optional statistics must not keep the results blocked.
      setStats(computeLocalStats(items))
      setLoading(false)

      const statsVnums = currentVnums.length > 0
        ? currentVnums
        : [...new Set(items.map((i) => i.vnum))].slice(0, 100)

      if (statsVnums.length > 0) {
        try {
          const statsData = await api.statistics(statsVnums, signal)
          if (signal.aborted) return
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
          if (signal.aborted) return
          setStats(computeLocalStats(items))
        }
      } else {
        setStats(computeLocalStats(items))
      }
    } catch (error) {
      if (signal.aborted) return
      setApiStatus('offline')
      setMarketError(error instanceof ApiError
        ? error.message
        : 'Nie udało się pobrać ofert. Spróbuj ponownie.')
      setRawItems([])
      setTotalElements(0)
      setStats(null)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [api, computeLocalStats, requestId, searchId])

  useEffect(() => {
    const controller = new AbortController()
    void loadData(query, vnums, page, controller.signal)
    return () => controller.abort()
  }, [query, vnums, page, loadData, retryVersion])

  // Load server suggestions without reusing stale responses or demo data.
  const handleQueryChange = (val: string) => {
    setInputQuery(val)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    suggestionControllerRef.current?.abort()

    if (!val.trim()) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    suggestionControllerRef.current = controller
    suggestTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await api.suggestions(val.trim(), controller.signal)
        if (!controller.signal.aborted) setSuggestions(res.suggestions || [])
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      }
    }, 220)
  }

  const handleSearchSubmit = (newQuery: string, savedVnums: number[] = []) => {
    setSearchId(crypto.randomUUID())
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    suggestionControllerRef.current?.abort()
    setSuggestions([])
    setInputQuery(newQuery)
    setQuery(newQuery)
    setVnums(savedVnums)
    setActiveSuggestion(null)
    setPage(0)
  }

  const handleSelectSuggestion = (s: ItemSuggestion) => {
    setSearchId(crypto.randomUUID())
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    suggestionControllerRef.current?.abort()
    setSuggestions([])
    setActiveSuggestion(s)
    const normalizedName = s.kind === 'UPGRADE_FAMILY' ? s.name.replace(/\s\+0-9$/, '') : s.name
    setInputQuery(normalizedName)
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
  const closeDrawer = useCallback(() => setActiveDrawerItem(null), [])

  return (
    <>
      <a className="skip-link" href="#main-content">Przejdź do treści</a>
      <Header apiStatus={apiStatus} currentServer={server.id} activeSection={activeSection} />

      <main id="main-content" tabIndex={-1}>
        <Hero serverName={server.name} />

        <SearchSection
          serverId={server.id}
          query={inputQuery}
          queryVnums={inputQuery === query ? vnums : []}
          suggestions={suggestions}
          onSearch={handleSearchSubmit}
          onSelectSuggestion={handleSelectSuggestion}
          onQueryChange={handleQueryChange}
        />

        <section className="shell" id="catalog">
          <div className="section-head">
            <h2 className="section-title">
              Oferty / <span>{query || 'ostatni skan'}</span>
            </h2>
            <div className="section-note">dane z najnowszego opublikowanego skanu</div>
          </div>

          <div className="market-layout">
            <div className={`results-pane ${loading ? 'results-pane--loading' : ''}`} aria-busy={loading}>
              <div className="toolbar">
                <div className="filters">
                  <label className="field">
                    Sortowanie tej strony
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
                    Mapa na tej stronie
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

              {loading ? (
                <div className="empty" role="status">Pobieranie ofert…</div>
              ) : marketError ? (
                <div className="empty api-error" role="alert">
                  <p>{marketError}</p>
                  <button
                    type="button"
                    className="api-retry"
                    onClick={() => setRetryVersion((version) => version + 1)}
                    disabled={loading}
                  >
                    {loading ? 'Łączenie…' : 'Spróbuj ponownie'}
                  </button>
                </div>
              ) : displayedItems.length > 0 ? (
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
        onClose={closeDrawer}
      />

    </>
  )
}
