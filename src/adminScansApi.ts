import type { GameServerId } from './servers'
export type Scan = { id: number; sourceId: string; sourceRunId: string; startedAt: string; endedAt: string | null; state: number; publishable: boolean; channel: number | null; expectedObservations: number | null; observations: number; listings: number; eligible: boolean }
export type MapSelection = { mapId: string; enabled: boolean; selectedScanId: number | null; activeScanId: number | null; scans: Scan[] }
export type ScanReport = { server: GameServerId; maps: MapSelection[] }
export type Selection = Pick<MapSelection, 'mapId' | 'enabled' | 'selectedScanId'>
export async function fetchAdminScans(server: GameServerId, signal: AbortSignal, selections?: Selection[]): Promise<ScanReport> {
  const response = await fetch(`/backend/api/v1/admin/servers/${server}/scans`, {
    method: selections ? 'PUT' : 'GET', credentials: 'same-origin', cache: 'no-store', signal,
    ...(selections ? { headers: { 'Content-Type': 'application/json', 'X-Admin-Action': 'scan-selection' }, body: JSON.stringify({ maps: selections }) } : {}),
  })
  if (!response.ok) throw new Error(response.status === 401 ? 'Zaloguj się tak samo jak w panelu statystyk.'
    : response.status === 409 ? 'Wybrany skan nie jest już gotowy do publikacji lub należy do innej mapy. Odśwież dane.'
    : response.status === 403 ? 'Brak uprawnień do zmiany ustawień skanów.' : 'Nie udało się pobrać lub zapisać ustawień skanów.')
  return await response.json() as ScanReport
}
