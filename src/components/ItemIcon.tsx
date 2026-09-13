import { useEffect, useState } from 'react'
import { iconPath } from '../format'
import { PackageIcon } from './Icons'

interface ItemIconProps {
  vnum: number
  alt: string
  size?: 'stone' | 'small' | 'medium' | 'large'
}

export function ItemIcon({ vnum, alt, size = 'medium' }: ItemIconProps) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [vnum])

  return (
    <span className={`item-icon item-icon--${size}`}>
      {failed ? (
        <PackageIcon className="item-icon__fallback" aria-label={`Brak ikony: ${alt}`} />
      ) : (
        <img src={iconPath(vnum)} alt={alt} onError={() => setFailed(true)} loading="lazy" />
      )}
    </span>
  )
}
