import site from '../site.json'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-intro">
          <a className="brand" href="/">METIN2 <span>BAZAR</span></a>
          <p>Ceny, bonusy i sklepy. Rynek Metin2 w jednym miejscu.</p>
          <span className="footer-caption">Niezależny katalog dla graczy.</span>
        </div>
        {site.footerGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
          </nav>
        ))}
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>Oferty pochodzą ze skanów. Dostępność sprawdzisz w grze.</span>
      </div>
    </footer>
  )
}
