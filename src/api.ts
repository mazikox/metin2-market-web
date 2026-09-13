import type { OffersResponse, StatisticsResponse, SuggestionsResponse } from './types'

const CONFIGURED_API_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.mazikox.pl').replace(/\/$/, '')
// The live API intentionally rejects localhost origins. Vite proxies only in dev;
// production still calls the configured public URL directly.
const API_BASE_URL = import.meta.env.DEV ? '/backend' : CONFIGURED_API_URL

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.')
  }

  if (!response.ok) {
    throw new ApiError(
      response.status >= 500
        ? 'Serwer chwilowo nie odpowiada. Spróbuj ponownie za moment.'
        : 'Nie udało się pobrać danych.',
      response.status,
    )
  }

  return response.json() as Promise<T>
}

function vnumParams(vnums: number[]): URLSearchParams {
  const params = new URLSearchParams()
  vnums.forEach((vnum) => params.append('vnum', String(vnum)))
  return params
}

export const api = {
  suggestions(query: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ query })
    return request<SuggestionsResponse>(`/api/v1/items/suggestions?${params}`, signal)
  },

  offers(vnums: number[], page: number, size: number, signal?: AbortSignal) {
    const params = vnumParams(vnums)
    params.set('page', String(page))
    params.set('size', String(size))
    return request<OffersResponse>(`/api/v1/items?${params}`, signal)
  },

  statistics(vnums: number[], signal?: AbortSignal) {
    return request<StatisticsResponse>(`/api/v1/items/statistics?${vnumParams(vnums)}`, signal)
  },
}
