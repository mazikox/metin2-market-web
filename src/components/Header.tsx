interface HeaderProps {
  isLive: boolean
}

export function Header({ isLive }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="shell topbar">
        <a href="#" className="brand" aria-label="Metin Market — powrót do góry">
          <img src="/favicon.png" alt="" className="brand-logo" width="26" height="26" />
          METIN <span>MARKET</span>
        </a>
        <nav className="main-nav" aria-label="Główna nawigacja">
          <a href="#market" className="active">Rynek</a>
          <a href="#catalog">Przedmioty</a>
          <a href="#about">O danych</a>
        </nav>
        <div className="status-badge" aria-live="polite">
          <i
            className={`status-dot ${isLive ? '' : 'status-dot--demo'}`}
            aria-hidden="true"
          />
          <span>{isLive ? 'API online' : 'Tryb demonstracyjny'}</span>
        </div>
      </div>
    </header>
  )
}
