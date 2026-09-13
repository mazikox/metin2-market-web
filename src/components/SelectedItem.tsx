import type { ItemSuggestion } from '../types'
import { ItemIcon } from './ItemIcon'

export function SelectedItem({ item }: { item: ItemSuggestion }) {
  const vnums = item.kind === 'ITEM' && item.vnum !== null ? [item.vnum] : item.memberVnums
  return <section className="selected-item" aria-labelledby="selected-title">
    <ItemIcon vnum={vnums[0]} alt="" />
    <div><h2 id="selected-title">{item.name}</h2>
      <p>{item.kind === 'UPGRADE_FAMILY' ? 'Rodzina ulepszeń · ' : ''}VNUM {vnums.join(', ')}</p>
    </div>
    {item.kind === 'UPGRADE_FAMILY' && <span className="family-note">Statystyki osobno dla każdego poziomu</span>}
  </section>
}
