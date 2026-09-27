import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ItemSuggestion } from '../types'

interface SearchSectionProps {
  query: string
  suggestions: ItemSuggestion[]
  onSearch: (newQuery: string, vnums?: number[]) => void
  onSelectSuggestion: (suggestion: ItemSuggestion) => void
  onQueryChange: (val: string) => void
}

const QUICK_SEARCHES = [
  { label: 'Zatruty miecz', query: 'Zatruty miecz' },
  { label: 'FMS', query: 'FMS' },
  { label: 'Kamień', query: 'Kamień' },
  { label: 'Naszyjnik', query: 'Naszyjnik' },
  { label: 'Ostatni skan', query: '' },
]

export function SearchSection({
  query,
  suggestions,
  onSearch,
  onSelectSuggestion,
  onQueryChange,
}: SearchSectionProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

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
    onSearch(q)
  }

  return (
    <section className="search-section" id="catalog">
      <div className="shell search-wrap" ref={wrapRef}>
        <form className="search-panel" onSubmit={handleSubmit} autoComplete="off">
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
          <span>Szybki wybór:</span>
          {QUICK_SEARCHES.map((item) => (
            <button
              key={item.label}
              type="button"
              className="quick-btn"
              onClick={() => handleQuickClick(item.query)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
