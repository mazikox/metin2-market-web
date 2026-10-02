export const GAME_SERVERS = [
  { id: 'pandora', name: 'Pandora' },
  { id: 'elder', name: 'Elder' },
  { id: 'beavium', name: 'Beavium' },
] as const

export type GameServerId = (typeof GAME_SERVERS)[number]['id']

export function getSelectedServer() {
  if (typeof window === 'undefined') return GAME_SERVERS[0]
  const selected = new URLSearchParams(window.location.search).get('server')
  return GAME_SERVERS.find((server) => server.id === selected) ?? GAME_SERVERS[0]
}

export function hasSelectedServer() {
  if (typeof window === 'undefined') return false
  const selected = new URLSearchParams(window.location.search).get('server')
  return GAME_SERVERS.some((server) => server.id === selected)
}

export function getServerUrl(serverId: GameServerId) {
  if (typeof window === 'undefined') return `/?server=${serverId}`
  const url = new URL(window.location.href)
  url.pathname = '/'
  url.searchParams.set('server', serverId)
  return url.pathname + url.search + url.hash
}
