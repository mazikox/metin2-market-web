import { useEffect, useState } from 'react'

type Row = { day: string; server: string; uniques: number; searches: number; results: number; searches_per_user: number | null }
type Item = { day?: string; server: string; item_name: string; searches: number }
type Report = { today: string; timezone: string; enabled: boolean; daily: Row[]; popular: Item[]; itemsByDay: Item[] }
const serverName = (id: string) => ({ all: 'Wszystkie', pandora: 'Pandora', elder: 'Elder', beavium: 'Beavium' }[id] || id)

export default function AdminStats() {
  const [days, setDays] = useState(14)
  const [limit, setLimit] = useState(20)
  const [data, setData] = useState<Report>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    document.title = 'Statystyki katalogu | Metin2 Bazar'
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex,nofollow'; document.head.append(robots)
    return () => robots.remove()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setData(undefined)
    void fetch(`/backend/api/v1/admin/stats?days=${days}&limit=${limit}`, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 401 ? 'Wymagane logowanie przez Caddy.' : 'Nie udało się pobrać statystyk.')
        return await response.json() as Report
      }).then(report => { if (!controller.signal.aborted) setData(report) })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [days, limit])
  const today = data?.daily.find(row => row.day === data.today && row.server === 'all')
  const table = (rows: Row[]) => <div className="admin-table"><table><thead><tr><th>Dzień</th><th>Serwer</th><th>Użytkownicy ≈</th><th>Wyszukiwania</th><th>Pobrania</th><th>Wyszukiwania / użytk.</th></tr></thead><tbody>{rows.map(row => <tr key={row.day + row.server}><td>{row.day}</td><td>{serverName(row.server)}</td><td>{row.uniques}</td><td>{row.searches}</td><td>{row.results}</td><td>{row.searches_per_user ?? 0}</td></tr>)}</tbody></table>{!rows.length && <p>Brak aktywności w tym okresie.</p>}</div>
  const items = (rows: Item[], daily = false) => <div className="admin-table"><table><thead><tr>{daily && <th>Dzień</th>}<th>Serwer</th><th>Przedmiot / rodzina</th><th>Wyszukiwania</th></tr></thead><tbody>{rows.map(row => <tr key={(row.day || '') + row.server + row.item_name}>{daily && <td>{row.day}</td>}<td>{serverName(row.server)}</td><td>{row.item_name}</td><td>{row.searches}</td></tr>)}</tbody></table>{!rows.length && <p>Brak wyszukiwań rozpoznanych przedmiotów.</p>}</div>
  return <><header className="info-header"><div className="shell"><a className="brand" href="/">METIN2 <span>BAZAR</span></a><a href="/">Wróć do rynku ↗</a></div></header><main id="main-content" tabIndex={-1} className="shell admin-stats"><p className="eyebrow">Prywatny panel</p><h1>Statystyki katalogu</h1><p>Dni według czasu w Polsce. Użytkownicy to przybliżona liczba różnych IP pobierających wyniki. Wspólne IP i zmiany adresu wpływają na wynik.</p><div className="filters"><label className="field">Okres<select className="custom-select" value={days} onChange={e => setDays(Number(e.target.value))}>{[1, 7, 14, 30, 90, 366].map(n => <option key={n} value={n}>{n === 1 ? '1 dzień' : `${n} dni`}</option>)}</select></label><label className="field">Popularne przedmioty<select className="custom-select" value={limit} onChange={e => setLimit(Number(e.target.value))}><option value={10}>Top 10</option><option value={20}>Top 20</option></select></label></div>{loading && <p role="status">Pobieranie statystyk…</p>}{error && <p role="alert">{error}</p>}{data && <>{!data.enabled && <p role="status">Zbieranie statystyk jest wyłączone.</p>}<h2>Dzisiaj · {data.today}</h2><div className="admin-cards">{[['Użytkownicy ≈', today?.uniques], ['Wyszukiwania', today?.searches], ['Pobrania wyników', today?.results], ['Wyszukiwania / użytkownika', today?.searches_per_user]].map(([label, value]) => <div key={String(label)}><strong>{value ?? 0}</strong><span>{label}</span></div>)}</div><h2>Aktywność serwerów dzisiaj</h2>{table(data.daily.filter(row => row.day === data.today && row.server !== 'all'))}<h2>Historia dni</h2>{table(data.daily)}<h2>Popularne przedmioty · ostatnie {days} dni</h2><p>Grupujemy warianty ulepszeń. Ranking obejmuje nazwy z katalogu wybrane przez VNUM lub dokładnie dopasowaną nazwę; krótkie i nierozpoznane zapytania zwiększają tylko ogólny licznik wyszukiwań.</p>{items(data.popular)}<h2>Popularność według dni i serwerów</h2>{items(data.itemsByDay, true)}</>}</main></>
}
