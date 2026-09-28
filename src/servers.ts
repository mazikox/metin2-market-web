export const GAME_SERVERS = [
  { id: 'pandora', name: 'Pandora' },
  { id: 'elder', name: 'Elder' },
  { id: 'beavium', name: 'Beavium' },
] as const

export type GameServerId = (typeof GAME_SERVERS)[number]['id']

export function getSelectedServer() {
  const selected = new URLSearchParams(window.location.search).get('server')
  return GAME_SERVERS.find((server) => server.id === selected) ?? GAME_SERVERS[0]
}

export function getServerUrl(serverId: GameServerId) {
  const url = new URL(window.location.href)
  if (serverId === 'pandora') url.searchParams.delete('server')
  else url.searchParams.set('server', serverId)
  return url.pathname + url.search + url.hash
}
