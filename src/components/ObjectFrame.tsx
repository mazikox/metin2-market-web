import { useEffect, useState } from 'react'
import { editionFromName, iconPath } from '../format'

interface ObjectFrameProps {
  vnum?: number
  itemName?: string
  className?: string
}

export function ObjectFrame({ vnum, itemName = '', className = 'object-frame' }: ObjectFrameProps) {
  const edition = editionFromName(itemName)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
  const [triedBase, setTriedBase] = useState(false)

  useEffect(() => {
    if (vnum != null) {
      setImgSrc(iconPath(vnum))
      setHasError(false)
      setTriedBase(false)
    } else {
      setImgSrc(null)
      setHasError(true)
    }
  }, [vnum])

  const handleError = () => {
    if (vnum != null && !triedBase && vnum % 10 !== 0) {
      // Metin2 upgrade series (+0 to +9) share the base icon (e.g. 180 for 181..189)
      const baseVnum = vnum - (vnum % 10)
      setTriedBase(true)
      setImgSrc(iconPath(baseVnum))
    } else {
      setHasError(true)
    }
  }

  const isDrawer = className.includes('drawer-object')
  const isFallback = hasError || !imgSrc

  return (
    <div
      className={`${className}${isFallback ? ' ' + (isDrawer ? 'drawer-object--fallback' : 'object-frame--fallback') : ''}`}
      aria-label={itemName}
      title={isFallback ? `${itemName || 'Przedmiot'} (brak ikony)` : undefined}
    >
      {!hasError && imgSrc ? (
        <img
          src={imgSrc}
          alt={itemName}
          onError={handleError}
          className={isDrawer ? 'drawer-object__img' : 'object-frame__img'}
          loading="lazy"
        />
      ) : (
        <div className="object-fallback" aria-hidden="true">
          <svg viewBox="0 0 80 120">
            <path
              d="M55 8 44 72 36 83 29 76 40 65 55 8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="m28 74 17 17M22 90l20-20M20 87l-7 17M15 102l8 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
          </svg>
          <span className="object-fallback__badge" title="Brak ikony przedmiotu">?</span>
        </div>
      )}

      {edition !== '·' && <span className="edition">+{edition}</span>}
    </div>
  )
}
