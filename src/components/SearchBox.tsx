import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../api'
import type { ItemSuggestion } from '../types'
import { CloseIcon, SearchIcon } from './Icons'
import { ItemIcon } from './ItemIcon'

interface SearchBoxProps {
  selected: ItemSuggestion | null
  onSelect: (suggestion: ItemSuggestion) => void
  onClear: () => void
}

function HighlightMatch({ name, query }: { name: string; query: string }) {
  const index = name.toLocaleLowerCase('pl').indexOf(query.trim().toLocaleLowerCase('pl'))
  if (index < 0) return <>{name}</>
  const end = index + query.trim().length
  return <>{name.slice(0, index)}<mark>{name.slice(index, end)}</mark>{name.slice(end)}</>
}

export function SearchBox({ selected, onSelect, onClear }: SearchBoxProps) {
  const [query, setQuery] = useState(selected?.name ?? '')
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([])
  const [totalMatches, setTotalMatches] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const requestId = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (selected) setQuery(selected.name)
  }, [selected])

  useEffect(() => {
    const currentRequest = ++requestId.current
    const trimmed = query.trim()
    if (trimmed.length < 2 || selected?.name === query) {
      setSuggestions([])
      setTotalMatches(0)
      setLoading(false)
      setError(false)
      return
    }

    const controller = new AbortController()
    setSuggestions([])
    setActiveIndex(-1)
    setLoading(true)
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(false)
      try {
        const data = await api.suggestions(trimmed, controller.signal)
        if (controller.signal.aborted || currentRequest !== requestId.current) return
        setTotalMatches(data.totalMatches)
        setSuggestions(data.totalMatches <= 20 ? data.suggestions : [])
        setActiveIndex(data.totalMatches <= 20 && data.suggestions.length ? 0 : -1)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        if (!controller.signal.aborted && currentRequest === requestId.current) {
          setError(true)
          setSuggestions([])
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false)
      }
    }, 280)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, selected])

  useEffect(() => {
    if (isOpen && activeIndex >= 0) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, isOpen, listId])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const choose = (suggestion: ItemSuggestion) => {
    setQuery(suggestion.name)
    setIsOpen(false)
    setActiveIndex(-1)
    onSelect(suggestion)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }
    if (loading || suggestions.length === 0) return
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex(event.key === 'ArrowDown' ? 0 : suggestions.length - 1)
      return
    }
    if (!isOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      choose(suggestions[activeIndex])
    }
  }

  const showPanel = isOpen && query.trim().length >= 2 && selected?.name !== query

  return (
    <div className="search" ref={rootRef}>
      <SearchIcon className="search__icon" />
      <input
        type="text"
        role="combobox"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setSuggestions([])
          setActiveIndex(-1)
          setIsOpen(true)
          if (selected) onClear()
        }}
        onFocus={() => query.trim().length >= 2 && selected?.name !== query && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Wpisz nazwę przedmiotu, np. Zatruty miecz…"
        aria-label="Szukaj przedmiotu"
        aria-autocomplete="list"
        aria-controls={showPanel ? listId : undefined}
        aria-expanded={showPanel}
        aria-activedescendant={showPanel && !loading && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        onBlur={(event) => { if (!rootRef.current?.contains(event.relatedTarget)) setIsOpen(false) }}
        autoComplete="off"
      />
      {query && (
        <button
          className="search__clear"
          type="button"
          aria-label="Wyczyść wyszukiwanie"
          onClick={() => {
            setQuery('')
            setIsOpen(false)
            onClear()
          }}
        >
          <CloseIcon />
        </button>
      )}

      {showPanel && (
        <div className="search-results" id={listId} role="listbox">
          {loading && <div className="search-results__message"><span className="spinner" /> Szukam przedmiotów…</div>}
          {!loading && error && <div className="search-results__message search-results__message--error">Nie udało się pobrać podpowiedzi. Spróbuj ponownie.</div>}
          {!loading && !error && totalMatches > 20 && (
            <div className="search-results__message">Znaleziono {totalMatches} wyników. Wpisz dokładniejszą nazwę.</div>
          )}
          {!loading && !error && totalMatches <= 20 && suggestions.length === 0 && (
            <div className="search-results__message">Brak pasujących przedmiotów.</div>
          )}
          {!loading && !error && suggestions.map((suggestion, index) => {
            const representativeVnum = suggestion.vnum ?? suggestion.memberVnums[0]
            return (
              <button
                key={`${suggestion.kind}-${suggestion.name}-${representativeVnum}`}
                id={`${listId}-${index}`}
                className={`suggestion ${index === activeIndex ? 'suggestion--active' : ''}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(suggestion)}
              >
                <ItemIcon vnum={representativeVnum} alt="" size="small" />
                <span className="suggestion__copy">
                  <strong><HighlightMatch name={suggestion.name} query={query} /></strong>
                  <span>{suggestion.kind === 'UPGRADE_FAMILY' ? `Poziomy ulepszenia: ${suggestion.memberVnums.length}` : `VNUM ${suggestion.vnum}`}</span>
                </span>
                <span className="suggestion__kind">{suggestion.kind === 'UPGRADE_FAMILY' ? 'Rodzina' : 'Przedmiot'}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
