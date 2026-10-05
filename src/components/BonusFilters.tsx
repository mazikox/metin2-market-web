import { useEffect, useState, type FormEvent } from 'react'
import type { BonusFilter, BonusOption } from '../types'
import type { GameServerId } from '../servers'
import { serverApis } from '../api'

interface Props {
  serverId: GameServerId
  filters: BonusFilter[]
  onApply: (filters: BonusFilter[]) => void
  onClear: () => void
}
interface Draft { id: string; type: string; minimum: string }
const emptyRow = (): Draft => ({ id: crypto.randomUUID(), type: '', minimum: '' })

export function BonusFilters({ serverId, filters, onApply, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Draft[]>([emptyRow()])
  const [options, setOptions] = useState<BonusOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    setRows(filters.length ? filters.map(f => ({ id: crypto.randomUUID(), type: String(f.type),
      minimum: f.minimum == null ? '' : String(f.minimum) })) : [emptyRow()])
  }, [filters])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    serverApis[serverId].bonusOptions(controller.signal).then(data => {
      if (!controller.signal.aborted) setOptions([...data].sort((a, b) => a.name.localeCompare(b.name, 'pl') || a.type - b.type))
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [serverId, open, retry])

  function updateRow(id: string, patch: Partial<Draft>) {
    setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row))
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onApply(rows.filter(r => r.type).map(r => ({ type: Number(r.type),
      ...(r.minimum.trim() === '' ? {} : { minimum: Number(r.minimum) }) })))
  }
  function clear() {
    setRows([emptyRow()])
    onClear()
  }

  return (
    <div className="bonus-filters">
      <div className="bonus-filters__toggle-row">
        <button type="button" className="bonus-filters__toggle" aria-expanded={open}
          aria-controls="bonus-filter-panel" onClick={() => setOpen(!open)}>
          Filtry bonusów {filters.length > 0 && <span className="bonus-filters__count">{filters.length}</span>}
          <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        {filters.length > 0 && <button type="button" className="bonus-filters__clear" onClick={clear}>Wyczyść filtry</button>}
      </div>
      {open && (
        <form id="bonus-filter-panel" className="bonus-filters__panel" onSubmit={submit}>
          <p className="bonus-filters__hint">Oferta musi spełniać wszystkie warunki. Szukamy tylko dodatkowych bonusów, bez podstawowych właściwości przedmiotu.</p>
          {loading ? <p className="caption" role="status">Pobieranie bonusów…</p> : error ? (
            <div role="alert" className="bonus-filters__error">Nie udało się pobrać bonusów.
              <button type="button" onClick={() => setRetry(v => v + 1)}>Spróbuj ponownie</button>
            </div>
          ) : options.length === 0 ? <p className="caption">W ostatnim opublikowanym skanie nie ma dodatkowych bonusów.</p> : (
            <>
              {rows.map((row, index) => {
                const option = options.find(o => String(o.type) === row.type)
                return (
                  <div className="bonus-filter-row" key={row.id}>
                    <label className="bonus-filter-row__name">Bonus {index + 1}
                      <select value={row.type} required onChange={e => updateRow(row.id, { type: e.target.value })}>
                        <option value="">Wybierz bonus</option>
                        {options.filter(o => String(o.type) === row.type || !rows.some(r => r.type === String(o.type))).map(o => (
                          <option key={o.type} value={o.type}>{o.name}{o.unit ? ` (${o.unit})` : ''}</option>
                        ))}
                      </select>
                    </label>
                    <label className="bonus-filter-row__minimum">Minimum {option?.unit && `(${option.unit})`}
                      <input type="number" step="1" min="-2147483648" max="2147483647" value={row.minimum}
                        placeholder="Dowolna wartość" aria-label={`Minimalna wartość bonusu ${index + 1}`}
                        onChange={e => updateRow(row.id, { minimum: e.target.value })} />
                    </label>
                    <button type="button" className="bonus-filter-row__remove" aria-label={`Usuń bonus ${index + 1}`}
                      onClick={() => setRows(current => current.filter(r => r.id !== row.id))}>×</button>
                  </div>
                )
              })}
              <div className="bonus-filters__actions">
                <button type="button" className="bonus-filters__add" disabled={rows.length >= 7 || rows.length >= options.length}
                  onClick={() => setRows(current => [...current, emptyRow()])}>+ Dodaj bonus</button>
                <span className="bonus-filters__presence">Puste minimum = dowolna wartość bonusu.</span>
                <button type="submit" className="bonus-filters__apply">Zastosuj filtry</button>
              </div>
            </>
          )}
        </form>
      )}
      {!open && filters.length > 0 && <p className="bonus-filters__summary">
        {filters.map(f => {
          const option = options.find(o => o.type === f.type)
          return `${option?.name || `Bonus #${f.type}`}${f.minimum == null ? '' : ` ≥ ${f.minimum}${option?.unit || ''}`}`
        }).join(' · ')}
      </p>}
    </div>
  )
}
