const numberFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 })

export const formatFull = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return numberFormatter.format(Math.round(Number(value)))
}

export const formatNumber = (value: number) => formatFull(value)
export const formatYang = (value: number) => `${formatFull(value)} Yang`

export const formatCompact = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (Math.abs(n) >= 1e9) {
    return (n / 1e9).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' mld'
  }
  if (Math.abs(n) >= 1e6) {
    return (n / 1e6).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' mln'
  }
  return numberFormatter.format(Math.round(n))
}

export const formatObservedAt = (value: string | null | undefined): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const iconPath = (vnum: number): string => `/items/${String(vnum).padStart(5, '0')}.png`

export const editionFromName = (name = ''): string => {
  const match = name.match(/\+(\d+)$/)
  return match ? match[1] : '·'
}

export const shortMap = (mapId: string | null | undefined): string => {
  if (!mapId) return '—'
  const known: Record<string, string> = {
    metin2_map_a1_summer: 'Joan',
    metin2_map_a1: 'Joan',
    metin2_map_b1: 'Bokjung',
    metin2_map_c1: 'Pyungmoo',
  }
  return known[mapId] || mapId.replace(/^metin2_map_/, '').replaceAll('_', ' ')
}

export function formatCoordinates(
  x: number | null | undefined,
  y: number | null | undefined,
  z?: number | null | undefined
): string {
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return '—'
  const parts = [Math.round(x), Math.round(y)]
  if (z != null && Number.isFinite(z) && z !== 0) parts.push(Math.round(z))
  return parts.join(', ')
}
