import { useEffect, useRef } from 'react'
import type { MarketOffer } from '../types'
import { formatCoordinates, formatFull, formatObservedAt, iconPath, shortMap } from '../format'
import { getSoulStones } from '../soulStones'
import { ObjectFrame } from './ObjectFrame'
import { BaseItemStats } from './BaseItemStats'

interface ItemDrawerProps {
  item: MarketOffer | null
  onClose: () => void
}

export function ItemDrawer({ item, onClose }: ItemDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!item) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const background = [...document.querySelectorAll<HTMLElement>('header.site-header, #main-content, .site-footer')]
      .map(element => ({ element, inert: element.inert }))
    background.forEach(({ element }) => { element.inert = true })
    drawerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const controls = [...(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary, [tabindex="0"]') || [])]
        .filter(element => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      background.forEach(({ element, inert }) => { element.inert = inert })
      previousFocus?.focus()
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [item, onClose])

  if (!item) {
    return <div className="drawer-backdrop" aria-hidden="true" />
  }

  const quantity = item.totalQuantity ?? item.quantity ?? 1
  const soulStones = getSoulStones(item.sockets || [])

  return (
    <div
      className="drawer-backdrop open"
      role="dialog"
      aria-modal="true"
      aria-label="Szczegóły oferty"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="drawer" id="drawer" ref={drawerRef}>
        <div className="drawer-top">
          <div className="eyebrow">Szczegóły oferty</div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Zamknij szczegóły"
          >
            ×
          </button>
        </div>

        <div className="drawer-content">
          <ObjectFrame
            vnum={item.vnum}
            itemName={item.itemName}
            className="drawer-object"
          />
          <div className="eyebrow">VNUM {item.vnum}</div>
          <h3>{item.itemName}</h3>
          <div className="price" style={{ margin: '18px 0 4px', fontSize: '26px' }}>
            {formatFull(item.unitPrice)} Yang
          </div>
          <div className="meta" style={{ marginBottom: '24px' }}>
            cena za sztukę · ilość {quantity}
          </div>

          {soulStones.length > 0 && (
            <div style={{ marginBottom: '22px' }}>
              <div className="eyebrow" style={{ marginBottom: '8px' }}>Kamienie Duszy</div>
              <div className="soul-stones-row">
                {soulStones.map((stone) => (
                  <span
                    key={`${stone.socketIndex}-${stone.vnum}`}
                    className="soul-stone-pill"
                    title={`${stone.name} +${stone.level}`}
                  >
                    <img
                      src={iconPath(stone.iconVnum)}
                      alt={stone.name}
                      loading="lazy"
                    />
                    <span>
                      {stone.name} <strong>+{stone.level}</strong>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="drawer-bonuses">
            {(item.attributes && item.attributes.length > 0) ? (
              item.attributes.map((attr, idx) => (
                <div key={`${attr.code}-${idx}`} className="drawer-bonus">
                  <span>{attr.name}</span>
                  <strong>{attr.displayValue ? attr.displayValue : '✓'}</strong>
                </div>
              ))
            ) : (
              <div className="caption">Brak bonusów w danych.</div>
            )}
          </div>

          <BaseItemStats metadata={item.metadata} />

          <div className="detail-row">
            <span>Sklep</span>
            <strong>{item.shop?.title || '—'}</strong>
          </div>
          <div className="detail-row">
            <span>Właściciel</span>
            <span>{item.shop?.ownerName || '—'}</span>
          </div>
          <div className="detail-row">
            <span>Lokalizacja</span>
            <span>
              {shortMap(item.shop?.mapId)}
              {item.shop?.channel != null ? ` · CH ${item.shop.channel}` : ''}
            </span>
          </div>
          <div className="detail-row">
            <span>Koordynaty</span>
            <span>{formatCoordinates(item.shop?.x, item.shop?.y, item.shop?.z)}</span>
          </div>
          <div className="detail-row">
            <span>Data</span>
            <span>{formatObservedAt(item.observedAt)}</span>
          </div>
          <div className="detail-row">
            <span>Listing ID</span>
            <span>{item.listingId}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
