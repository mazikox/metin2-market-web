const numberFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatNumber = (value: number) => numberFormatter.format(value)

export const formatYang = (value: number) => `${numberFormatter.format(Math.round(value))} Yang`

export const formatObservedAt = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Brak danych' : dateFormatter.format(date)
}

export const iconPath = (vnum: number) => `/items/${String(vnum).padStart(5, '0')}.png`

// Assumption: 100 world units = one game coordinate. No map offsets are known.
// Keep this conversion isolated until an authoritative mapping is available.
export function formatCoordinates(x: number | null | undefined, y: number | null | undefined) {
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return null
  return `${Math.floor(x / 100)}, ${Math.floor(y / 100)}`
}

export const friendlyMapName = (mapId: string | null) => {
  if (!mapId) return null
  return mapId.replace(/^metin2_map_/, '').replaceAll('_', ' ')
}
