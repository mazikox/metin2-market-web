import { useEffect } from 'react'
import { GAME_SERVERS, getServerUrl } from './servers'
import { Footer } from './components/Footer'
import site from './site.json'

export default function ServerLanding() {
  useEffect(() => {
    const title = `${site.name} | ceny i oferty z rynków Metin2`
    const description = site.description
    const canonical = site.url + '/'
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.rel = 'canonical'
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.href = canonical
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical)
  }, [])

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
      <Footer />
    </>
  )
}
