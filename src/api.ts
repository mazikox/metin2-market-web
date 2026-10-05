import type { CategoryOptions, ItemFilters, BonusFilter, BonusOption, OfferSort, MarketOverviewSort, MarketOverviewResponse, OffersResponse, StatisticsResponse, SuggestionsResponse } from './types'
import type { GameServerId } from './servers'

const urlParamApi = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('api') : null
const CONFIGURED_API_URL = (urlParamApi || import.meta.env.VITE_API_BASE_URL || '/backend').replace(/\/$/, '')
const API_BASE_URL = import.meta.env.DEV && !urlParamApi ? '/backend' : CONFIGURED_API_URL

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); this.name = 'ApiError' }
}

async function request<T>(path: string, signal?: AbortSignal, timeoutMs = 8000, catalogHeaders: Record<string, string> = {}): Promise<T> {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled', 'AbortError')

  const controller = new AbortController()
  const handleAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', handleAbort, { once: true })
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(API_BASE_URL + path, {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...catalogHeaders },
    })
    if (!response.ok) {
      throw new ApiError(response.status >= 500
        ? 'Serwer chwilowo nie odpowiada. Spróbuj ponownie za moment.'
        : 'Nie udało się pobrać danych.', response.status)
    }
    // Receiving HTTP headers does not mean the JSON body has finished downloading.
    // Keep both the timeout and caller cancellation active until the body is read.
    const data = await response.json()
    if (controller.signal.aborted) throw controller.signal.reason
    return data as T
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error
    if (timedOut) throw new ApiError('Serwer nie przesłał pełnej odpowiedzi na czas. Spróbuj ponownie.')
    if (error instanceof ApiError) throw error
    if (error instanceof SyntaxError) throw new ApiError('Serwer zwrócił nieprawidłową odpowiedź. Spróbuj ponownie.')
    throw new ApiError('Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', handleAbort)
  }
}

function createServerApi(server: GameServerId) {
  const itemsPath = '/api/v1/servers/' + server + '/items'
  return {
    baseUrl: API_BASE_URL,
    overview(signal?: AbortSignal, requestId?: string, sort: MarketOverviewSort = 'shops') {
      const headers: Record<string, string> = {}
      if (requestId) headers['X-Catalog-Request'] = requestId
      const params = new URLSearchParams({ limit: '8', sort })
      return request<MarketOverviewResponse>(itemsPath + '/overview?' + params, signal, 8000, headers)
    },
    categoryOptions(signal?: AbortSignal) {
      return request<CategoryOptions>(itemsPath + '/category-options', signal, 8000)
    },
    bonusOptions(signal?: AbortSignal) {
      return request<BonusOption[]>(itemsPath + '/bonus-options', signal, 8000)
    },
    suggestions(query: string, signal?: AbortSignal) {
      const params = new URLSearchParams({ query: query.trim() })
      return request<SuggestionsResponse>(itemsPath + '/suggestions?' + params, signal, 4000)
    },
    offers(options: { query?: string; vnums?: number[]; page: number; size: number; sort?: OfferSort; bonuses?: BonusFilter[]; itemFilters?: ItemFilters; requestId?: string; searchId?: string }, signal?: AbortSignal) {
      const params = new URLSearchParams()
      if (options.query) params.set('query', options.query.trim())
      if (options.vnums?.length) options.vnums.forEach((v) => params.append('vnum', String(v)))
      params.set('page', String(options.page)); params.set('size', String(options.size))
      params.set('sort', options.sort ?? 'priceAsc')
      options.bonuses?.forEach(bonus => params.append('bonus', bonus.minimum == null
        ? String(bonus.type) : `${bonus.type}:${bonus.minimum}`))
      if (options.itemFilters?.category) params.set('category', options.itemFilters.category)
      if (options.itemFilters?.minLevel != null) params.set('minLevel', String(options.itemFilters.minLevel))
      if (options.itemFilters?.maxLevel != null) params.set('maxLevel', String(options.itemFilters.maxLevel))
      const headers: Record<string, string> = {}
      if (options.requestId) headers['X-Catalog-Request'] = options.requestId
      if (options.searchId) headers['X-Catalog-Search'] = options.searchId
      return request<OffersResponse>(itemsPath + '?' + params, signal, 5000, headers)
    },
    statistics(vnums: number[], signal?: AbortSignal) {
      const params = new URLSearchParams()
      vnums.forEach((vnum) => params.append('vnum', String(vnum)))
      return request<StatisticsResponse>(itemsPath + '/statistics?' + params, signal, 5000)
    },
  }
}

export const serverApis: Record<GameServerId, ReturnType<typeof createServerApi>> = {
  pandora: createServerApi('pandora'), elder: createServerApi('elder'), beavium: createServerApi('beavium'),
}
