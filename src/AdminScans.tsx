import { useEffect, useRef, useState } from 'react'
import { GAME_SERVERS, type GameServerId } from './servers'
import { formatNumber, marketMapLabel } from './format'
import { fetchAdminScans, type ScanReport, type Selection, type Scan } from './adminScansApi'

const date = (value: string | null) => value ? new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeZone: 'Europe/Warsaw' }).format(new Date(value)) : 'Brak daty zakończenia'
const pick = (data: ScanReport): Selection[] => data.maps.map(({ mapId, enabled, selectedScanId }) => ({ mapId, enabled, selectedScanId }))
const stateLabel = (scan: Scan) => scan.eligible ? 'Gotowy' : scan.expectedObservations != null && scan.observations !== scan.expectedObservations ? 'Import niekompletny' : !scan.publishable ? 'Nieopublikowany' : 'Skan niezakończony'

export default function AdminScans() {
  const [server, setServer] = useState<GameServerId>('beavium')
  const [data, setData] = useState<ScanReport>()
  const [draft, setDraft] = useState<Selection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [version, setVersion] = useState(0)
  const saveRequest = useRef<AbortController>()
  useEffect(() => {
    document.title = 'Zarządzanie skanami | Metin2 Bazar'
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex,nofollow'; document.head.append(robots)
    return () => { robots.remove(); saveRequest.current?.abort() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setMessage(''); setData(undefined); setDraft([])
    void fetchAdminScans(server, controller.signal).then(report => {
      if (!controller.signal.aborted) { setData(report); setDraft(pick(report)) }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [server, version])
  const change = (mapId: string, patch: Partial<Selection>) => { setMessage(''); setDraft(current => current.map(m => m.mapId === mapId ? { ...m, ...patch } : m)) }
  const dirty = !!data && JSON.stringify(draft) !== JSON.stringify(pick(data))
  const save = async () => {
    const controller = new AbortController(); saveRequest.current = controller
    setSaving(true); setError(''); setMessage('')
    try {
      const report = await fetchAdminScans(server, controller.signal, draft)
      if (!controller.signal.aborted) { setData(report); setDraft(pick(report)); setMessage('Zapisano. Rynek korzysta już z wybranych map i skanów.') }
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Nie udało się zapisać ustawień.') }
    finally { if (!controller.signal.aborted) setSaving(false) }
  }
  return <><header className="info-header"><div className="shell"><a className="brand" href="/">METIN2 <span>BAZAR</span></a><nav className="admin-nav" aria-label="Panel administracyjny"><a href="/admin/stats">Statystyki</a><a href="/admin/scans" aria-current="page">Skany</a></nav></div></header>
    <main className="shell admin-stats admin-scans" id="main-content" tabIndex={-1}>
      <p className="eyebrow">Prywatny panel</p><h1>Zarządzanie skanami</h1>
      <p>Rynek łączy oferty z włączonych map. Każda mapa może automatycznie korzystać z najnowszego skanu lub z wybranego przez Ciebie skanu.</p>
      <div className="scan-toolbar"><label className="field">Serwer<select className="custom-select" value={server} disabled={saving} onChange={e => setServer(e.target.value as GameServerId)}>{GAME_SERVERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="scan-button" type="button" disabled={loading || saving} onClick={() => setVersion(v => v + 1)}>Odśwież dane</button><a href={`/?server=${server}#market`}>Zobacz rynek ↗</a></div>
      {loading && <p role="status">Pobieranie skanów…</p>}{error && <p className="scan-error" role="alert">{error}</p>}{message && <p className="scan-success" role="status">{message}</p>}
      {data && <form onSubmit={e => { e.preventDefault(); void save() }}>
        <div className="scan-map-grid">{data.maps.map(map => {
          const selection = draft.find(m => m.mapId === map.mapId)!
          const active = map.scans.find(s => s.id === map.activeScanId)
          return <section className={`scan-map-card${selection.enabled ? '' : ' is-disabled'}`} key={map.mapId} aria-label={marketMapLabel(map.mapId)}>
            <div className="scan-map-heading"><div><h2>{marketMapLabel(map.mapId)}</h2><code>{map.mapId}</code></div><label className="scan-switch"><input type="checkbox" checked={selection.enabled} disabled={saving} onChange={e => change(map.mapId, { enabled: e.target.checked })} />Pokaż na rynku</label></div>
            <p className="scan-current">{!map.enabled ? 'Obecnie wyłączona' : active ? <>Na rynku: skan #{active.id} · {date(active.endedAt)}</> : 'Brak aktywnego skanu'}</p>
            <label className="field">Wyświetlany skan<select className="custom-select" value={selection.selectedScanId ?? 'auto'} disabled={saving} onChange={e => change(map.mapId, { selectedScanId: e.target.value === 'auto' ? null : Number(e.target.value) })}>
              <option value="auto">Automatycznie — najnowszy gotowy skan</option>{map.scans.map(s => <option key={s.id} value={s.id} disabled={!s.eligible}>#{s.id} · {date(s.endedAt)} · {formatNumber(s.listings)} ofert{!s.eligible ? ` · ${stateLabel(s)}` : ''}</option>)}</select></label>
            <p className="scan-hint">{selection.selectedScanId == null ? 'Nowy kompletny import z tej mapy zastąpi poprzedni skan.' : 'Nowe importy nie zmienią przypiętego skanu.'} {!selection.enabled && 'Mapa pozostanie ukryta także po kolejnych importach.'}</p>
            <details className="scan-history"><summary>Historia skanów ({map.scans.length})</summary><div className="admin-table"><table><thead><tr><th>Skan</th><th>Data</th><th>Obserwacje</th><th>Oferty</th><th>Status</th></tr></thead><tbody>{map.scans.map(s => <tr key={s.id}><td title={`${s.sourceId} / ${s.sourceRunId}`}>#{s.id}{s.id === map.activeScanId && ' · aktywny'}</td><td>{date(s.endedAt)}</td><td>{formatNumber(s.observations)}{s.expectedObservations != null && ` / ${formatNumber(s.expectedObservations)}`}</td><td>{formatNumber(s.listings)}</td><td>{stateLabel(s)}</td></tr>)}</tbody></table>{!map.scans.length && <p>Nie zaimportowano jeszcze skanu tej mapy.</p>}</div></details>
          </section>
        })}</div>
        <div className="scan-save-bar"><button className="scan-button scan-button-primary" type="submit" disabled={!dirty || saving}>{saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}</button><span>{dirty ? 'Masz niezapisane zmiany.' : 'Ustawienia są zapisane.'}</span></div>
      </form>}
    </main></>
}
