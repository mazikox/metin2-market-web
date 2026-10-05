import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { serverApis } from '../api'
import { marketMapLabel } from '../format'
import type { GameServerId } from '../servers'
import type { BonusFilter, BonusOption, CategoryOptions, ItemFilters, MarketMapOption } from '../types'

type Tab = 'bonuses' | 'category' | 'maps'
type Row = { id: string; type: string; minimum: string }
const emptyRow = (): Row => ({ id: crypto.randomUUID(), type: '', minimum: '' })
interface Props {
  serverId: GameServerId; bonuses: BonusFilter[]; itemFilters: ItemFilters; maps: string[]
  onApply: (bonuses: BonusFilter[], items: ItemFilters, maps: string[]) => void; onClear: () => void
}
export function MarketFilters({ serverId, bonuses, itemFilters, maps, onApply, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('bonuses')
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [category, setCategory] = useState('')
  const [minLevel, setMinLevel] = useState('')
  const [maxLevel, setMaxLevel] = useState('')
  const [selectedMaps, setSelectedMaps] = useState<string[]>([])
  const [bonusOptions, setBonusOptions] = useState<BonusOption[]>([])
  const [categories, setCategories] = useState<CategoryOptions | null>(null)
  const [mapOptions, setMapOptions] = useState<MarketMapOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadErrors, setLoadErrors] = useState<Tab[]>([])
  const [validation, setValidation] = useState('')
  const [retry, setRetry] = useState(0)
  const activeCount = bonuses.length + Number(!!itemFilters.category) + Number(itemFilters.minLevel != null || itemFilters.maxLevel != null) + maps.length
  useEffect(() => {
    setRows(bonuses.length ? bonuses.map(b => ({ id: crypto.randomUUID(), type: String(b.type), minimum: b.minimum == null ? '' : String(b.minimum) })) : [emptyRow()])
    setCategory(itemFilters.category || ''); setMinLevel(itemFilters.minLevel == null ? '' : String(itemFilters.minLevel)); setMaxLevel(itemFilters.maxLevel == null ? '' : String(itemFilters.maxLevel))
    setSelectedMaps(maps); setValidation('')
  }, [bonuses, itemFilters, maps])
  useEffect(() => {
    if (!open) return
    const controller = new AbortController(); setLoading(true); setLoadErrors([])
    void Promise.allSettled([serverApis[serverId].bonusOptions(controller.signal), serverApis[serverId].categoryOptions(controller.signal), serverApis[serverId].mapOptions(controller.signal)]).then(([b, c, m]) => {
      if (controller.signal.aborted) return
      const errors: Tab[] = []
      if (b.status === 'fulfilled') setBonusOptions([...b.value].sort((a, z) => a.name.localeCompare(z.name, 'pl'))); else errors.push('bonuses')
      if (c.status === 'fulfilled') setCategories(c.value); else errors.push('category')
      if (m.status === 'fulfilled') setMapOptions(m.value); else errors.push('maps')
      setLoadErrors(errors); setLoading(false)
    })
    return () => controller.abort()
  }, [serverId, open, retry])
  const update = (id: string, patch: Partial<Row>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row))
  const submit = (event: FormEvent) => {
    event.preventDefault(); setValidation('')
    const selectedRows = rows.filter(row => row.type || row.minimum)
    const nextBonuses: BonusFilter[] = []
    for (const row of selectedRows) {
      const minimum = row.minimum === '' ? undefined : Number(row.minimum)
      if (!row.type || (minimum != null && (!Number.isInteger(minimum) || minimum < -2147483648 || minimum > 2147483647))) {
        setTab('bonuses'); setValidation('Wybierz bonus i wpisz całkowite minimum lub pozostaw je puste.'); return
      }
      if (nextBonuses.some(b => b.type === Number(row.type))) { setTab('bonuses'); setValidation('Każdy bonus można dodać tylko raz.'); return }
      nextBonuses.push({ type: Number(row.type), ...(minimum == null ? {} : { minimum }) })
    }
    const min = minLevel === '' ? undefined : Number(minLevel), max = maxLevel === '' ? undefined : Number(maxLevel)
    if ([min, max].some(n => n != null && (!Number.isInteger(n) || n < 0 || n > 2147483647)) || (min != null && max != null && min > max)) {
      setTab('category'); setValidation('Podaj poprawny zakres poziomu: od nie może być większe niż do.'); return
    }
    onApply(nextBonuses, { ...(category ? { category } : {}), ...(min == null ? {} : { minLevel: min }), ...(max == null ? {} : { maxLevel: max }) }, selectedMaps)
  }
  const clear = () => { setRows([emptyRow()]); setCategory(''); setMinLevel(''); setMaxLevel(''); setSelectedMaps([]); setValidation(''); onClear() }
  const labels: Record<Tab, string> = { bonuses: 'Bonusy', category: 'Kategoria i poziom', maps: 'Mapy' }
  const tabKeys: Tab[] = ['bonuses', 'category', 'maps']
  const tabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: Tab) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (tabKeys.indexOf(current) + (event.key === 'ArrowRight' ? 1 : 2)) % 3
    setTab(tabKeys[index]); (event.currentTarget.parentElement?.querySelectorAll('button')[index] as HTMLButtonElement | undefined)?.focus()
  }
  return <div className="bonus-filters">
    <div className="bonus-filters__toggle-row"><button type="button" className="bonus-filters__toggle" aria-expanded={open} aria-controls="market-filter-panel" onClick={() => setOpen(!open)}>Filtry {activeCount > 0 && <span className="bonus-filters__count">{activeCount}</span>}<span aria-hidden="true">{open ? '−' : '+'}</span></button>{activeCount > 0 && <button type="button" className="bonus-filters__clear" onClick={clear}>Wyczyść filtry</button>}</div>
    {open && <form id="market-filter-panel" className="bonus-filters__panel" onSubmit={submit} noValidate>
      <div className="market-filter-tabs" role="tablist" aria-label="Rodzaj filtrów">{(['bonuses','category','maps'] as const).map(key => <button type="button" role="tab" id={`filter-tab-${key}`} key={key} tabIndex={tab === key ? 0 : -1} onKeyDown={e => tabKeyDown(e, key)} aria-selected={tab === key} aria-controls={`filter-section-${key}`} onClick={() => setTab(key)}>{labels[key]}</button>)}</div>
      <p className="bonus-filters__hint">Warunki z wszystkich zakładek łączą się. Ustaw je, a następnie zastosuj filtry.</p>
      {validation && <p className="bonus-filters__error" role="alert">{validation}</p>}
      {loading ? <p className="caption" role="status">Pobieranie opcji filtrów…</p> : <>
        {loadErrors.includes(tab) ? <p role="alert" className="bonus-filters__error">Nie udało się pobrać opcji. <button type="button" onClick={() => setRetry(n => n + 1)}>Spróbuj ponownie</button></p> : <>
          <div role="tabpanel" id="filter-section-bonuses" aria-labelledby="filter-tab-bonuses" hidden={tab !== 'bonuses'}>
            <p className="bonus-filters__hint">Szukamy dodatkowych bonusów konkretnej oferty. Podstawowe właściwości przedmiotu są pomijane.</p>
            {bonusOptions.length === 0 && <p className="caption">W aktywnych skanach nie ma dodatkowych bonusów.</p>}
            {rows.map((row, index) => <div className="bonus-filter-row" key={row.id}>
              <label className="field">Bonus {index + 1}<select className="custom-select" value={row.type} onChange={e => update(row.id, { type: e.target.value })}><option value="">Wybierz bonus</option>{row.type && !bonusOptions.some(o => String(o.type) === row.type) && <option value={row.type}>Bonus #{row.type}</option>}{bonusOptions.map(o => <option value={o.type} key={o.type} disabled={rows.some(r => r.id !== row.id && r.type === String(o.type))}>{o.name}</option>)}</select></label>
              <label className="field">Minimum {bonusOptions.find(o => String(o.type) === row.type)?.unit}<input type="number" step="1" value={row.minimum} placeholder="Dowolna wartość" onChange={e => update(row.id, { minimum: e.target.value })} /></label>
              <button type="button" className="bonus-filter-row__remove" aria-label={`Usuń bonus ${index + 1}`} onClick={() => setRows(current => current.length === 1 ? [emptyRow()] : current.filter(r => r.id !== row.id))}>×</button>
            </div>)}
            <div className="bonus-filters__actions"><button type="button" className="bonus-filters__add" disabled={rows.length >= 7 || rows.length >= bonusOptions.length} onClick={() => setRows(current => [...current, emptyRow()])}>+ Dodaj bonus</button><span className="bonus-filters__presence">Puste minimum = dowolna wartość bonusu.</span></div>
          </div>
          <div role="tabpanel" id="filter-section-category" aria-labelledby="filter-tab-category" hidden={tab !== 'category'}>
            {!categories?.available && <p className="caption">Dla tego serwera nie wgrano katalogu właściwości przedmiotów.</p>}
            <div className="category-filters__fields"><label className="field">Kategoria<select className="custom-select" value={category} disabled={!categories?.available} onChange={e => setCategory(e.target.value)}><option value="">Wszystkie kategorie</option>{categories?.categories.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}</select></label><label className="field">Poziom od<input type="number" min="0" step="1" placeholder="Bez minimum" disabled={!categories?.available} value={minLevel} onChange={e => setMinLevel(e.target.value)} /></label><label className="field">Poziom do<input type="number" min="0" step="1" placeholder="Bez maksimum" disabled={!categories?.available} value={maxLevel} onChange={e => setMaxLevel(e.target.value)} /></label></div>
            <p className="bonus-filters__hint">Zakres dotyczy wymaganego poziomu przedmiotu. Obie granice są wliczane.</p>
          </div>
          <div role="tabpanel" id="filter-section-maps" aria-labelledby="filter-tab-maps" hidden={tab !== 'maps'}>
            <p className="bonus-filters__hint">Zaznacz mapy, z których chcesz zobaczyć oferty. Brak zaznaczenia oznacza wszystkie aktywne mapy.</p>
            <div className="market-map-options">{mapOptions.map(m => <label key={m.mapId}><input type="checkbox" checked={selectedMaps.includes(m.mapId)} onChange={e => setSelectedMaps(current => e.target.checked ? [...current, m.mapId] : current.filter(id => id !== m.mapId))} />{marketMapLabel(m.mapId)}</label>)}</div>
            {selectedMaps.filter(id => !mapOptions.some(m => m.mapId === id)).map(id => <label className="market-map-unavailable" key={id}><input type="checkbox" checked onChange={() => setSelectedMaps(current => current.filter(m => m !== id))} />{marketMapLabel(id)} — mapa nieaktywna</label>)}
            {mapOptions.length === 0 && <p className="caption">Nie ma aktywnych skanów map na tym serwerze.</p>}
          </div>
        </>}
      </>}
      <div className="bonus-filters__actions market-filter-apply"><button className="bonus-filters__apply" type="submit" disabled={loading}>Zastosuj filtry</button><button className="bonus-filters__clear" type="button" onClick={clear}>Wyczyść wszystkie</button></div>
    </form>}
    {activeCount > 0 && <p className="bonus-filters__summary">Aktywne: {[bonuses.map(b => `${bonusOptions.find(o => o.type === b.type)?.name || `Bonus #${b.type}`}${b.minimum == null ? '' : ` ≥ ${b.minimum}${bonusOptions.find(o => o.type === b.type)?.unit || ''}`}`).join(', '), itemFilters.category ? categories?.categories.find(c => c.value === itemFilters.category)?.name || 'Wybrana kategoria' : '', itemFilters.minLevel != null || itemFilters.maxLevel != null ? itemFilters.minLevel != null && itemFilters.maxLevel != null ? `Poziom ${itemFilters.minLevel}–${itemFilters.maxLevel}` : itemFilters.minLevel != null ? `Poziom od ${itemFilters.minLevel}` : `Poziom do ${itemFilters.maxLevel}` : '', maps.map(marketMapLabel).join(', ')].filter(Boolean).join(' · ')}</p>}
  </div>
}
