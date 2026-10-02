import { GAME_SERVERS, getServerUrl } from './servers'

export default function ServerLanding() {
  return (
    <>
      <a className="skip-link" href="#main-content">Przejdź do wyboru serwera</a>
      <header className="site-header landing-header">
        <div className="shell landing-topbar">
          <a href="/" className="brand" aria-label="Metin2 Bazar, strona główna">
            <img src="/favicon.png" alt="" className="brand-logo" width="26" height="26" />
            METIN2 <span>BAZAR</span>
          </a>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="shell server-landing">
        <div className="server-landing__heading">
          <p className="eyebrow">Wybierz rynek</p>
          <h1>Na którym serwerze grasz?</h1>
        </div>
        <div className="server-cards" aria-label="Wybierz serwer">
          {GAME_SERVERS.map((server, index) => (
            <a className="server-card" href={getServerUrl(server.id)} key={server.id} aria-label={server.name + ', przejdź do rynku'}>
              <span className="server-card__letter" aria-hidden="true">{server.name.charAt(0)}</span>
              <span className="server-card__content">
                <span className="server-card__number">0{index + 1} <span aria-hidden="true">·</span> SERWER</span>
                <span className="server-card__name">{server.name}</span>
                <span className="server-card__bottom">
                  <span className="server-card__market">Rynek {server.name}</span>
                  <span className="server-card__action">
                    <span>Wejdź</span>
                    <span className="server-card__arrow" aria-hidden="true">→</span>
                  </span>
                </span>
              </span>
            </a>
          ))}
        </div>
      </main>
    </>
  )
}
