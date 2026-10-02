import { useEffect, useRef } from 'react'
import type { ItemStatistic } from '../types'
import { MarketAnalytics } from './MarketAnalytics'

interface AnalyticsDrawerProps {
  isOpen: boolean
  onClose: () => void
  stat: ItemStatistic | null
}

export function AnalyticsDrawer({ isOpen, onClose, stat }: AnalyticsDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const background = [...document.querySelectorAll<HTMLElement>('header.site-header, #main-content, .site-footer')]
      .map((element) => ({ element, inert: element.inert }))
    background.forEach(({ element }) => {
      element.inert = true
    })

    drawerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return

      const controls = [
        ...(drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), summary, [tabindex="0"]'
        ) || []),
      ].filter((element) => element.getClientRects().length > 0)

      const first = controls[0]
      const last = controls[controls.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      background.forEach(({ element, inert }) => {
        element.inert = inert
      })
      previousFocus?.focus()
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !stat) {
    return <div className="drawer-backdrop" aria-hidden="true" />
  }

  return (
    <div
      className="drawer-backdrop open"
      role="dialog"
      aria-modal="true"
      aria-label={`Szczegółowa analityka rynku dla ${stat.itemName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="drawer drawer--wide" id="analytics-drawer" ref={drawerRef}>
        <div className="drawer-top">
          <div className="eyebrow">Szczegółowa analiza rynku</div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Zamknij analitykę"
          >
            ×
          </button>
        </div>

        <div className="analytics-drawer-body">
          <MarketAnalytics stat={stat} />
        </div>
      </section>
    </div>
  )
}
