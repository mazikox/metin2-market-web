import { GAME_SERVERS, getServerUrl } from '../servers'
import type { GameServerId } from '../servers'

export type ApiStatus = 'checking' | 'online' | 'offline'

interface HeaderProps {
  apiStatus: ApiStatus
  currentServer: GameServerId
  activeSection: 'market' | 'catalog' | 'about' | null
}

export function Header({ apiStatus, currentServer, activeSection }: HeaderProps) {
  const statusText = apiStatus === 'checking'
    ? 'Łączenie z API…'
    : apiStatus === 'online' ? 'API online' : 'API niedostępne'
  const statusClass = apiStatus === 'checking'
    ? 'status-dot--checking'
    : apiStatus === 'offline' ? 'status-dot--offline' : ''
  return (
    <header className="site-header">
      <div className="shell topbar">
        <a href="/" className="brand" aria-label="Metin2 Bazar, strona główna">
          <img src="/favicon.png" alt="" className="brand-logo" width="26" height="26" />
          METIN2 <span>BAZAR</span>
        </a>
        <label className="server-switcher">
          <span>Serwer</span>
          <select aria-label="Wybierz serwer" value={currentServer} onChange={(event) => window.location.assign(getServerUrl(event.target.value as GameServerId))}>
            {GAME_SERVERS.map((server) => <option key={server.id} value={server.id}>{server.name}</option>)}
          </select>
        </label>
        <nav className="main-nav" aria-label="Główna nawigacja">
          <a href="#market" className={activeSection === 'market' ? 'active' : undefined} aria-current={activeSection === 'market' ? 'location' : undefined}>Rynek</a>
          <a href="#catalog" className={activeSection === 'catalog' ? 'active' : undefined} aria-current={activeSection === 'catalog' ? 'location' : undefined}>Przedmioty</a>
          <a href="#about" className={activeSection === 'about' ? 'active' : undefined} aria-current={activeSection === 'about' ? 'location' : undefined}>O danych</a>
        </nav>
        <details className="mobile-menu">
          <summary>Menu</summary>
          <nav aria-label="Nawigacja mobilna">
            <a href="#market" onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}>Rynek</a>
            <a href="#catalog" onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}>Przedmioty</a>
            <a href="#about" onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}>O danych</a>
            <a href="/jak-korzystac/">Jak korzystać</a>
            <a href="/o-projekcie/">O projekcie</a>
          </nav>
        </details>
        <div className="status-badge" aria-live="polite">
          <i className={'status-dot ' + statusClass} aria-hidden="true" />
          <span>{statusText}</span>
        </div>
      </div>
    </header>
  )
}
