import type { OffersResponse, StatisticsResponse, SuggestionsResponse } from './types'

const urlParamApi = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('api') : null
const CONFIGURED_API_URL = (urlParamApi || import.meta.env.VITE_API_BASE_URL || 'https://api.mazikox.pl').replace(/\/$/, '')
// In Vite dev, proxy '/backend' avoids CORS and origin rejection on local dev
const API_BASE_URL = import.meta.env.DEV && !urlParamApi ? '/backend' : CONFIGURED_API_URL

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, signal?: AbortSignal, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController()
  const combinedSignal = signal
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  if (combinedSignal) {
    combinedSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.')
  } finally {
    clearTimeout(timer)
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

export const api = {
  baseUrl: API_BASE_URL,

  async probe(timeoutMs = 1800): Promise<boolean> {
    try {
      await request<OffersResponse>('/api/v1/items?query=&page=0&size=1', undefined, timeoutMs)
      return true
    } catch {
      return false
    }
  },

  suggestions(query: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ query: query.trim() })
    return request<SuggestionsResponse>(`/api/v1/items/suggestions?${params}`, signal, 4000)
  },

  offers(options: { query?: string; vnums?: number[]; page: number; size: number }, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (options.query) params.set('query', options.query.trim())
    if (options.vnums && options.vnums.length > 0) {
      options.vnums.forEach((v) => params.append('vnum', String(v)))
    }
    params.set('page', String(options.page))
    params.set('size', String(options.size))
    return request<OffersResponse>(`/api/v1/items?${params}`, signal, 5000)
  },

  statistics(vnums: number[], signal?: AbortSignal) {
    const params = new URLSearchParams()
    vnums.forEach((vnum) => params.append('vnum', String(vnum)))
    return request<StatisticsResponse>(`/api/v1/items/statistics?${params}`, signal, 5000)
  },
}
