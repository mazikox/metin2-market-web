import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from './api'
import type { ItemStatistic, ItemSuggestion, MarketOffer } from './types'
import { Offers } from './components/Offers'
import { SearchBox } from './components/SearchBox'
import { SelectedItem } from './components/SelectedItem'
import { Statistics } from './components/Statistics'

const PAGE_SIZE = 20

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
}

export default function App() {
  const [selected, setSelected] = useState<ItemSuggestion | null>(null)
  const [page, setPage] = useState(0)
  const [offers, setOffers] = useState<MarketOffer[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [offersLoading, setOffersLoading] = useState(false)
  const [offersError, setOffersError] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<ItemStatistic[]>([])
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [statisticsError, setStatisticsError] = useState<string | null>(null)
  const [offersReload, setOffersReload] = useState(0)
  const [statisticsReload, setStatisticsReload] = useState(0)

  const vnums = useMemo(() => {
    if (!selected) return []
    return selected.kind === 'ITEM' && selected.vnum !== null ? [selected.vnum] : selected.memberVnums
  }, [selected])
  const vnumKey = vnums.join(',')

  const chooseItem = useCallback((suggestion: ItemSuggestion) => {
    setSelected(suggestion)
    setPage(0)
  }, [])

  const clearItem = useCallback(() => {
    setSelected(null)
    setPage(0)
    setOffers([])
    setStatistics([])
    setOffersError(null)
    setStatisticsError(null)
  }, [])

  useEffect(() => {
    if (!vnumKey) return
    const controller = new AbortController()
    setOffersLoading(true)
    setOffersError(null)
    api.offers(vnums, page, PAGE_SIZE, controller.signal)
      .then((data) => {
        setOffers(data.items)
        setTotalElements(data.totalElements)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setOffersError(errorMessage(error))
        setOffers([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setOffersLoading(false)
      })
    return () => controller.abort()
    // vnumKey is the stable selection identity; vnums is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vnumKey, page, offersReload])

  useEffect(() => {
    if (!vnumKey) return
    const controller = new AbortController()
    setStatisticsLoading(true)
    setStatisticsError(null)
    api.statistics(vnums, controller.signal)
      .then((data) => setStatistics(data.items))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatisticsError(errorMessage(error))
        setStatistics([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatisticsLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vnumKey, statisticsReload])

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    window.requestAnimationFrame(() => document.getElementById('offers-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Metin Market — strona główna">
          <span className="brand__mark">M</span>
          <span>Metin <strong>Market</strong></span>
        </a>
        <span className="topbar__status">Rynek Metin2</span>
      </header>

      <main id="top">
        <section className="search-workspace" aria-label="Wyszukiwanie rynku">
          <h1>Wyszukiwarka rynku</h1>
          <SearchBox selected={selected} onSelect={chooseItem} onClear={clearItem} />
        </section>

        {selected && (
          <div className="results">
            <div className="overview-grid">
              <SelectedItem item={selected} />
              <Statistics items={statistics} loading={statisticsLoading} error={statisticsError} onRetry={() => setStatisticsReload((value) => value + 1)} />
            </div>
            <Offers
              key={vnumKey}
              items={offers}
              loading={offersLoading}
              error={offersError}
              page={page}
              size={PAGE_SIZE}
              totalElements={totalElements}
              onPageChange={handlePageChange}
              onRetry={() => setOffersReload((value) => value + 1)}
            />
          </div>
        )}
      </main>

      <footer>Ceny z zaobserwowanych ofert · dostępność może się zmienić</footer>
    </div>
  )
}
