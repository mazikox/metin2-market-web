import type { ItemMetadata } from '../types'

function attackRange(min: number, max: number) {
  if (max <= 0 || min < 0 || min > max) return null
  return min === max ? String(max) : `${min}–${max}`
}

export function BaseItemStats({ metadata }: { metadata?: ItemMetadata | null }) {
  if (!metadata) return null
  const attack = attackRange(metadata.minAttack, metadata.maxAttack)
  const magicAttack = attackRange(metadata.minMagicAttack, metadata.maxMagicAttack)
  const rows = [
    ...(metadata.requiredLevel > 0 ? [{ label: 'Wymagany poziom', value: String(metadata.requiredLevel) }] : []),
    ...(metadata.defense > 0 ? [{ label: 'Obrona', value: String(metadata.defense) }] : []),
    ...(attack ? [{ label: 'Wartość ataku', value: attack }] : []),
    ...(magicAttack ? [{ label: 'Wartość magicznego ataku', value: magicAttack }] : []),
    ...metadata.builtInBonuses.map(bonus => ({
      label: bonus.name || `Bonus #${bonus.type}`,
      value: bonus.displayValue || String(bonus.value),
    })),
  ]
  if (!rows.length) return null

  return (
    <section className="base-item-stats" aria-label="Podstawowe właściwości przedmiotu">
      <h4>Podstawowe właściwości</h4>
      <dl>
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
