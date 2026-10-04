import type { MarketOffer } from '../types'
import { formatCompact, formatObservedAt, iconPath, shortMap } from '../format'
import { getSoulStones } from '../soulStones'
import { ObjectFrame } from './ObjectFrame'
import { ArrowRightIcon } from './Icons'

interface ListingItemProps {
  item: MarketOffer
  onOpenDetails: (item: MarketOffer) => void
}

export function ListingItem({ item, onOpenDetails }: ListingItemProps) {
  const quantity = item.totalQuantity ?? item.quantity ?? 1
  const totalPrice = item.totalPrice ?? item.price ?? item.unitPrice * quantity
  const soulStones = getSoulStones(item.sockets || [])

  return (
    <article className="listing">
      <ObjectFrame vnum={item.vnum} itemName={item.itemName} />

      <div>
        <button
          type="button"
          className="item-name"
          onClick={() => onOpenDetails(item)}
        >
          {item.itemName}
        </button>
        <div className="meta">
          VNUM {item.vnum} · {quantity} szt. w tej ofercie
          {item.listingCount > 1 ? ` · ${item.listingCount} wpisy` : ''}
        </div>

        {soulStones.length > 0 && (
          <div className="soul-stones-row" aria-label="Wbudowane Kamienie Duszy">
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
                  {stone.name.replace(/^Kamień Duszy\s*/, 'KD ')}
                  <strong>+{stone.level}</strong>
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="bonus-list">
          {(item.attributes || []).slice(0, 4).map((attr, idx) => (
            <span key={`${attr.code}-${idx}`} className="bonus">
              {attr.name} {attr.displayValue ? attr.displayValue : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="price-block">
        <div className="price">{formatCompact(item.unitPrice)}</div>
        <div className="price-sub">Yang / szt. · razem {formatCompact(totalPrice)}</div>
      </div>

      <div className="shop">
        <div className="shop-name">
          {item.shop?.title || item.shop?.ownerName || 'Sklep bez nazwy'}
        </div>
        <div className="meta">
          {shortMap(item.shop?.mapId)}
          {item.shop?.channel != null ? ` · CH ${item.shop.channel}` : ''}
        </div>
      </div>

      <div className="time">
        <div className="observed">{formatObservedAt(item.observedAt)}</div>
      </div>

      <button
        type="button"
        className="open-detail"
        onClick={() => onOpenDetails(item)}
      >
        <span>Szczegóły</span>
        <ArrowRightIcon className="open-detail__arrow" />
      </button>
    </article>
  )
}
