import { GAME_SERVERS, getServerUrl } from '../servers'
import type { GameServerId } from '../servers'

export type ApiStatus = 'checking' | 'online' | 'offline'

interface HeaderProps { apiStatus: ApiStatus; currentServer: GameServerId }

export function Header({ apiStatus, currentServer }: HeaderProps) {
  const statusText = apiStatus === 'checking'
    ? 'Łączenie z API…'
    : apiStatus === 'online' ? 'API online' : 'API niedostępne'
  const statusClass = apiStatus === 'checking'
    ? 'status-dot--checking'
    : apiStatus === 'offline' ? 'status-dot--offline' : ''
  return (
    <header className="site-header">
      <div className="shell topbar">
        <a href="#" className="brand" aria-label="Metin Market — powrót do góry">
          <img src="/favicon.png" alt="" className="brand-logo" width="26" height="26" />
          METIN <span>MARKET</span>
        </a>
        <label className="server-switcher">
          <span>Serwer</span>
          <select aria-label="Wybierz serwer" value={currentServer} onChange={(event) => window.location.assign(getServerUrl(event.target.value as GameServerId))}>
            {GAME_SERVERS.map((server) => <option key={server.id} value={server.id}>{server.name}</option>)}
          </select>
        </label>
        <nav className="main-nav" aria-label="Główna nawigacja">
          <a href="#market" className="active">Rynek</a><a href="#catalog">Przedmioty</a><a href="#about">O danych</a>
        </nav>
        <div className="status-badge" aria-live="polite">
          <i className={'status-dot ' + statusClass} aria-hidden="true" />
          <span>{statusText}</span>
        </div>
      </div>
    </header>
  )
}
