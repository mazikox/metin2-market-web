interface HeroProps { serverName: string; compact?: boolean }

export function Hero({ serverName, compact = false }: HeroProps) {
  return (
    <section className={compact ? 'hero hero--overview' : 'hero'}>
      <div className="shell hero-grid">
        <div>
          <div className="eyebrow">Rynek Metin2 · {serverName} · aktywne skany map</div>
          <h1 className="hero-title">Rynek Metin2,<br />uporządkowany.</h1>
        </div>
        <p className="intro">Wyszukuj przedmioty, porównuj ceny i sprawdzaj bonusy ofert z aktywnych skanów map.</p>
      </div>
    </section>
  )
}
