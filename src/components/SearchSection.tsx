import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ItemSuggestion } from '../types'
import type { GameServerId } from '../servers'
import { favoriteQueryKey, useFavorites } from '../useFavorites'
import { Favorites } from './Favorites'
import { StarIcon } from './Icons'

interface SearchSectionProps {
  serverId: GameServerId
  query: string
  queryVnums: number[]
  suggestions: ItemSuggestion[]
  onSearch: (newQuery: string, vnums?: number[]) => void
  onOverview: () => void
  onSelectSuggestion: (suggestion: ItemSuggestion) => void
  onQueryChange: (val: string) => void
}

interface QuickSearchItem {
  label: string
  query: string
}

const HARD_SERVER_QUICK_SEARCHES: QuickSearchItem[] = [
  { label: 'FMS', query: 'Miecz Pełni Księżyca' },
  { label: 'Ostrze Z Czerw. Stali', query: 'Ostrze z Czerwonej Stali' },
  { label: 'Zaczarowanie', query: 'Zaczarowanie Przedmiotu' },
  { label: 'Bodzio', query: 'Zwój Błogosławieństwa' },
  { label: 'Kamień Duchowy', query: 'Kamień Duchowy' },
  { label: 'Rada', query: 'Rada Pustelnika' },
  { label: 'Egzo', query: 'Zwój Egzorcyzmu' },
  { label: 'Kupon SM', query: 'Kupon SM' },
  { label: 'Przegląd rynku', query: '' },
]

const PANDORA_QUICK_SEARCHES: QuickSearchItem[] = [
  { label: 'Zatruty miecz', query: 'Zatruty miecz' },
  { label: 'FMS', query: 'FMS' },
  { label: 'Kamień', query: 'Kamień' },
  { label: 'Naszyjnik', query: 'Naszyjnik' },
  { label: 'Przegląd rynku', query: '' },
]

const QUICK_SEARCHES_BY_SERVER: Record<GameServerId, QuickSearchItem[]> = {
  pandora: PANDORA_QUICK_SEARCHES,
  elder: HARD_SERVER_QUICK_SEARCHES,
  beavium: HARD_SERVER_QUICK_SEARCHES,
}

export function SearchSection({
  serverId,
  query,
  queryVnums,
  suggestions,
  onSearch,
  onOverview,
  onSelectSuggestion,
  onQueryChange,
}: SearchSectionProps) {
  const quickSearches = QUICK_SEARCHES_BY_SERVER[serverId] ?? HARD_SERVER_QUICK_SEARCHES
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { favorites, toggleFavorite, removeFavorite, announcement, storageError } = useFavorites(serverId)
  const isFavorite = favorites.some((favorite) => favoriteQueryKey(favorite.query) === favoriteQueryKey(query))
  const favoriteAction = isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setOpen(false)
    onSearch(query)
  }

  const handleInputChange = (val: string) => {
    onQueryChange(val)
    if (val.trim()) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  const handleQuickClick = (q: string) => {
    setOpen(false)
    if (!q) onOverview()
    else onSearch(q)
  }

  return (
    <section className="search-section">
      <div className="shell search-wrap" ref={wrapRef}>
        <form className="search-panel" id="market" onSubmit={handleSubmit} autoComplete="off">
          <div className="search-input-wrap">
            <input
              id="searchInput"
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (query.trim() && suggestions.length > 0) setOpen(true)
              }}
              placeholder="Szukaj przedmiotu, np. Zatruty miecz…"
              aria-label="Nazwa przedmiotu"
            />

            {query.trim() && (
              <button
                type="button"
                className="search-favorite"
                aria-label={favoriteAction + ': ' + query.trim()}
                aria-pressed={isFavorite}
                title={favoriteAction}
                onClick={() => {
                  setOpen(false)
                  toggleFavorite(query, queryVnums)
                }}
              >
                <StarIcon filled={isFavorite} />
              </button>
            )}

            {open && suggestions.length > 0 && (
              <div className="suggestions" role="listbox" aria-label="Sugestie wyszukiwania">
                {suggestions.map((s, idx) => (
                  <button
                    key={`${s.name}-${s.vnum ?? idx}`}
                    type="button"
                    className="suggestion-item"
                    onClick={() => {
                      setOpen(false)
                      onSelectSuggestion(s)
                    }}
                  >
                    <span className="suggestion-type">
                      {s.kind === 'UPGRADE_FAMILY' ? 'Seria' : 'Przedmiot'}
                    </span>
                    <span className="suggestion-name">{s.name}</span>
                    <span className="suggestion-code">
                      {s.kind === 'ITEM'
                        ? `VNUM ${s.vnum ?? '—'}`
                        : `${s.memberVnums?.length || 0} wariantów`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="search-submit">
            Szukaj
          </button>
        </form>

        <div className="quick-row">
          <span className="quick-label">Szybki wybór:</span>
          {quickSearches.map((item) => (
            <button
              key={item.label}
              type="button"
              className={'quick-btn' + (favoriteQueryKey(item.query) === favoriteQueryKey(query) ? ' quick-btn--active' : '')}
              aria-pressed={favoriteQueryKey(item.query) === favoriteQueryKey(query)}
              onClick={() => handleQuickClick(item.query)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Favorites
          favorites={favorites}
          query={query}
          onSelect={(favorite) => {
            setOpen(false)
            onSearch(favorite.query, favorite.vnums)
          }}
          onRemove={removeFavorite}
        />
        <span className={storageError ? 'favorites-storage-note' : 'visually-hidden'} role="status">{announcement}</span>
      </div>
    </section>
  )
}
