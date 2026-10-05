import { useEffect, useState, type FormEvent } from 'react'
import type { CategoryOptions, ItemFilters } from '../types'
import type { GameServerId } from '../servers'
import { serverApis } from '../api'

interface Props {
  serverId: GameServerId
  filters: ItemFilters
  onApply: (filters: ItemFilters) => void
  onClear: () => void
}

export function CategoryFilters({ serverId, filters, onApply, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<CategoryOptions | null>(null)
  const [category, setCategory] = useState('')
  const [minLevel, setMinLevel] = useState('')
  const [maxLevel, setMaxLevel] = useState('')
  const [error, setError] = useState(false)
  const [rangeError, setRangeError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    setCategory(filters.category || '')
    setMinLevel(filters.minLevel == null ? '' : String(filters.minLevel))
    setMaxLevel(filters.maxLevel == null ? '' : String(filters.maxLevel))
    setRangeError(false)
  }, [filters])
  useEffect(() => {
    const controller = new AbortController()
    setOptions(null)
    setError(false)
    serverApis[serverId].categoryOptions(controller.signal).then(data => {
      if (!controller.signal.aborted) setOptions(data)
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [serverId, retry])
  const active = Boolean(filters.category || filters.minLevel != null || filters.maxLevel != null)
  const activeCount = Number(Boolean(filters.category)) + Number(filters.minLevel != null || filters.maxLevel != null)
  const summary = [
    filters.category ? options?.categories.find(c => c.value === filters.category)?.name || filters.category : '',
    filters.minLevel != null && filters.maxLevel != null ? `Poziom ${filters.minLevel}–${filters.maxLevel}`
      : filters.minLevel != null ? `Poziom od ${filters.minLevel}`
      : filters.maxLevel != null ? `Poziom do ${filters.maxLevel}` : '',
  ].filter(Boolean).join(' · ')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (minLevel !== '' && maxLevel !== '' && Number(minLevel) > Number(maxLevel)) {
      setRangeError(true)
      return
    }
    setRangeError(false)
    onApply({ ...(category ? { category } : {}),
      ...(minLevel === '' ? {} : { minLevel: Number(minLevel) }),
      ...(maxLevel === '' ? {} : { maxLevel: Number(maxLevel) }) })
  }
  return (
    <div className="category-filters">
      <div className="category-filters__heading">
        <button type="button" className="bonus-filters__toggle" aria-expanded={open}
          aria-controls="category-filter-panel" onClick={() => setOpen(!open)}>
          Kategoria i wymagany poziom
          {active && <span className="bonus-filters__count">{activeCount}</span>}
          <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        {active && <button type="button" className="bonus-filters__clear" onClick={onClear}>Wyczyść kategorię i poziom</button>}
      </div>
      {open && <form id="category-filter-panel" className="bonus-filters__panel" aria-label="Kategoria i wymagany poziom" onSubmit={submit}>
      {error ? <div className="bonus-filters__error" role="alert">Nie udało się pobrać kategorii.
        <button type="button" onClick={() => setRetry(v => v + 1)}>Spróbuj ponownie</button></div>
      : !options ? <p className="caption" role="status">Pobieranie kategorii…</p>
      : !options.available ? <p className="caption">Brak danych o kategorii i wymaganym poziomie dla tego serwera.</p>
      : <>
        <div className="category-filters__fields">
          <label>Kategoria
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Wszystkie kategorie</option>
              {options.categories.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
            </select>
          </label>
          <label>Poziom od
            <input type="number" step="1" min="0" max="2147483647" value={minLevel} placeholder="Bez minimum"
              onChange={e => { setMinLevel(e.target.value); setRangeError(false) }} aria-invalid={rangeError || undefined}
              aria-describedby={rangeError ? 'level-range-error' : undefined} />
          </label>
          <label>Poziom do
            <input type="number" step="1" min="0" max="2147483647" value={maxLevel} placeholder="Bez maksimum"
              onChange={e => { setMaxLevel(e.target.value); setRangeError(false) }} aria-invalid={rangeError || undefined}
              aria-describedby={rangeError ? 'level-range-error' : undefined} />
          </label>
          <button type="submit" className="bonus-filters__apply">Zastosuj</button>
        </div>
        {rangeError && <p className="category-filters__range-error" id="level-range-error" role="alert">Poziom „od” nie może być większy niż poziom „do”.</p>}
        <p className="category-filters__note">Puste pola poziomu oznaczają brak ograniczenia. Możesz połączyć te warunki z nazwą i bonusami.</p>
      </>}
      </form>}
      {!open && active && <p className="bonus-filters__summary">{summary}</p>}
    </div>
  )
}
