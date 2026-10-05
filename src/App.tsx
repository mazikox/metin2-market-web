import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, serverApis } from './api'
import type { ItemStatistic, ItemSuggestion, MarketOffer, PopularItem, OfferSort, BonusFilter, ItemFilters } from './types'
import { Header, type ApiStatus } from './components/Header'
import { Hero } from './components/Hero'
import { MarketOverview } from './components/MarketOverview'
import { SearchSection } from './components/SearchSection'
import { MarketFilters } from './components/MarketFilters'
import { ListingItem } from './components/ListingItem'
import { MarketAside } from './components/MarketAside'
import { AnalyticsDrawer } from './components/AnalyticsDrawer'
import { Manifesto } from './components/Manifesto'
import { Footer } from './components/Footer'
import { ItemDrawer } from './components/ItemDrawer'
import { getSelectedServer } from './servers'
import site from './site.json'

const PAGE_SIZE = 8
type ActiveSection = 'market' | 'catalog' | 'about' | null

export default function App() {
  const server = getSelectedServer()
  const api = serverApis[server.id]
  const initialQuery = ''
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [query, setQuery] = useState(initialQuery)
  const [inputQuery, setInputQuery] = useState(initialQuery)
  const [vnums, setVnums] = useState<number[]>([])
  const [activeSuggestion, setActiveSuggestion] = useState<ItemSuggestion | null>(null)
  const [page, setPage] = useState(0)
  const [maps, setMaps] = useState<string[]>([])
  const [bonuses, setBonuses] = useState<BonusFilter[]>([])
  const [itemFilters, setItemFilters] = useState<ItemFilters>({})
  const hasItemFilters = Boolean(itemFilters.category || itemFilters.minLevel != null || itemFilters.maxLevel != null)
  const isOverview = !query.trim() && vnums.length === 0 && bonuses.length === 0 && !hasItemFilters && maps.length === 0
  // Tokens identify only an action/request and live in this mounted component.
  const [searchId, setSearchId] = useState<string>()
  const [sort, setSort] = useState<OfferSort>('priceAsc')
  const requestId = useMemo(() => crypto.randomUUID(), [page, searchId, sort, bonuses, itemFilters, maps])
  const [rawItems, setRawItems] = useState<MarketOffer[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)
  const [stat, setStat] = useState<ItemStatistic | null>(null)
  const [familyStats, setFamilyStats] = useState<ItemStatistic[] | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([])
  const [activeDrawerItem, setActiveDrawerItem] = useState<MarketOffer | null>(null)
  const [activeSection, setActiveSection] = useState<ActiveSection>(null)

  const suggestTimerRef = useRef<number | null>(null)
  const suggestionControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const title = `Rynek Metin2 ${server.name} | ${site.name}`
    const description = `Porównuj ceny, bonusy i lokalizacje przedmiotów na serwerze ${server.name}. Przeglądaj oferty z opublikowanych skanów rynku Metin2.`
    const canonical = site.url + '/?server=' + server.id
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    // Keep the canonical in the shared HTML aligned with the selected server.
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

  // Use the current market request as the source of API status.
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
    setStat(null)
    setFamilyStats(null)

    try {
      const data = await api.offers({
        query: currentQuery,
        vnums: currentVnums,
        page: currentPage,
        size: PAGE_SIZE,
        sort,
        bonuses,
        itemFilters,
        maps,
        requestId,
        searchId,
      }, signal)
      if (signal.aborted) return

      const items = data.items || []
      setApiStatus('online')
      setMarketError(null)
      setRawItems(items)
      setTotalElements(data.totalElements ?? items.length)
      setLoading(false)

      const statsVnums = currentVnums.length > 0
        ? currentVnums
        : [...new Set(items.map((i) => i.vnum))].slice(0, 50)

      if (statsVnums.length > 0) {
        setStatsLoading(true)
        try {
          const statsData = await api.statistics(statsVnums, signal, maps)
          if (signal.aborted) return
          const rows = statsData.items || []
          if (rows.length === 1) {
            setStat(rows[0])
            setFamilyStats(null)
          } else if (rows.length > 1) {
            setFamilyStats(rows)
            if (currentVnums.length === 1) {
              setStat(rows.find((r) => r.vnum === currentVnums[0]) || rows[0])
            } else {
              setStat(null)
            }
          } else {
            setStat(null)
            setFamilyStats(null)
          }
        } catch {
          if (signal.aborted) return
          setStat(null)
          setFamilyStats(null)
        } finally {
          if (!signal.aborted) setStatsLoading(false)
        }
      } else {
        setStat(null)
        setFamilyStats(null)
      }
    } catch (error) {
      if (signal.aborted) return
      setApiStatus('offline')
      setMarketError(error instanceof ApiError
        ? error.message
        : 'Nie udało się pobrać ofert. Spróbuj ponownie.')
      setRawItems([])
      setTotalElements(0)
      setStat(null)
      setFamilyStats(null)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [api, requestId, searchId, sort, bonuses, itemFilters, maps])

  useEffect(() => {
    if (isOverview) {
      setRawItems([])
      setTotalElements(0)
      setStat(null)
      setFamilyStats(null)
      setLoading(false)
      setIsAnalyticsOpen(false)
      setActiveDrawerItem(null)
      return
    }
    const controller = new AbortController()
    void loadData(query, vnums, page, controller.signal)
    return () => controller.abort()
  }, [query, vnums, page, isOverview, loadData, retryVersion])

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

  const handleSelectPopularItem = (item: PopularItem) => {
    setSort('priceAsc')
    setBonuses([])
    setItemFilters({})
    setMaps([])
    handleSearchSubmit(item.itemName, [item.vnum])
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

  const handleSelectLevel = (levelVnum: number, levelName: string) => {
    setSearchId(crypto.randomUUID())
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    suggestionControllerRef.current?.abort()
    setSuggestions([])
    setInputQuery(levelName)
    setQuery(levelName)
    setVnums([levelVnum])
    setActiveSuggestion(null)
    setPage(0)
  }

  const displayedItems = rawItems

  const isUpgradeFamily = activeSuggestion?.kind === 'UPGRADE_FAMILY' || (vnums.length > 1)
  const maxPage = Math.ceil(totalElements / PAGE_SIZE) - 1
  const closeDrawer = useCallback(() => setActiveDrawerItem(null), [])
  const closeAnalytics = useCallback(() => setIsAnalyticsOpen(false), [])

  return (
    <>
      <a className="skip-link" href="#main-content">Przejdź do treści</a>
      <Header apiStatus={apiStatus} currentServer={server.id} activeSection={activeSection} />

      <main id="main-content" tabIndex={-1}>
        <Hero serverName={server.name} compact={isOverview} />

        <SearchSection
          serverId={server.id}
          query={inputQuery}
          queryVnums={inputQuery === query ? vnums : []}
          suggestions={suggestions}
          onSearch={handleSearchSubmit}
          onOverview={() => { setBonuses([]); setItemFilters({}); setMaps([]); handleSearchSubmit('') }}
          onSelectSuggestion={handleSelectSuggestion}
          onQueryChange={handleQueryChange}
        />

        <div className="shell">
          <MarketFilters serverId={server.id} bonuses={bonuses} itemFilters={itemFilters} maps={maps}
            onApply={(nextBonuses, nextItems, nextMaps) => {
              setBonuses(nextBonuses); setItemFilters(nextItems); setMaps(nextMaps)
              handleSearchSubmit(inputQuery, inputQuery === query ? vnums : [])
            }}
            onClear={() => {
              setBonuses([]); setItemFilters({}); setMaps([])
              setPage(0); setSearchId(crypto.randomUUID())
            }} />
        </div>

        {isOverview ? (
          <MarketOverview serverId={server.id} onSelectItem={handleSelectPopularItem} onStatusChange={setApiStatus} />
        ) : (
        <section className="shell" id="catalog">
          <div className="section-head">
            <h2 className="section-title">
              Oferty / <span>{query || 'aktywne skany'}</span>
            </h2>
            <button type="button" className="market-return" onClick={() => { setBonuses([]); setItemFilters({}); setMaps([]); handleSearchSubmit('') }}>← Przegląd rynku</button>
          </div>

          <div className="market-layout">
            <div className={`results-pane ${loading ? 'results-pane--loading' : ''}`} aria-busy={loading}>
              <div className="toolbar">
                <div className="filters">
                  <label className="field">
                    Sortowanie wszystkich ofert
                    <select
                      className="custom-select"
                      value={sort}
                      onChange={(e) => {
                        setSort(e.target.value as OfferSort)
                        setPage(0)
                      }}
                    >
                      <option value="priceAsc">Najtańsze / szt.</option>
                      <option value="priceDesc">Najdroższe / szt.</option>
                      <option value="quantity">Największa ilość</option>
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
                (bonuses.length > 0 || hasItemFilters || maps.length > 0) ? `Oferty z wybranymi filtrami. Statystyki cen obejmują wszystkie bonusy przedmiotu${maps.length ? ' z wybranych map' : ''}.` : vnums.length > 0
                  ? `Filtr VNUM: ${vnums.join(', ')}.`
                  : 'Wyniki dopasowane po nazwie przedmiotu.'
              }
              stat={stat}
              familyStats={familyStats}
              isUpgradeFamily={isUpgradeFamily}
              onSelectLevel={handleSelectLevel}
              onOpenAnalytics={() => setIsAnalyticsOpen(true)}
            />
          </div>
        </section>
        )}

        <Manifesto />
      </main>

      <Footer />

      <ItemDrawer
        item={activeDrawerItem}
        onClose={closeDrawer}
      />

      <AnalyticsDrawer
        isOpen={isAnalyticsOpen && stat != null}
        onClose={closeAnalytics}
        stat={stat}
      />
    </>
  )
}
