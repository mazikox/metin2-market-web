import { useEffect, useState } from 'react'
import type { GameServerId } from './servers'

export interface FavoriteSearch {
  query: string
  vnums: number[]
}

export function favoriteQueryKey(query: string) {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl')
}

function readFavorites(value: string | null): FavoriteSearch[] {
  try {
    const parsed: unknown = JSON.parse(value ?? '[]')
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    return parsed.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || !('query' in entry) || typeof entry.query !== 'string') return []
      const query = entry.query.trim().replace(/\s+/g, ' ')
      const key = favoriteQueryKey(query)
      if (!key || seen.has(key)) return []
      seen.add(key)
      const vnums = 'vnums' in entry && Array.isArray(entry.vnums)
        ? entry.vnums.filter((vnum: unknown): vnum is number => typeof vnum === 'number' && Number.isSafeInteger(vnum) && vnum > 0)
        : []
      return [{ query, vnums: [...new Set(vnums)] }]
    })
  } catch {
    return []
  }
}

export function useFavorites(serverId: GameServerId) {
  const storageKey = `metin-market:favorites:${serverId}:v1`
  const [favorites, setFavorites] = useState<FavoriteSearch[]>(() => {
    try {
      return readFavorites(window.localStorage.getItem(storageKey))
    } catch {
      return []
    }
  })
  const [announcement, setAnnouncement] = useState('')
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        setFavorites(readFavorites(event.newValue))
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [storageKey])

  const updateFavorites = (next: FavoriteSearch[], message: string) => {
    setFavorites(next)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      setStorageError(false)
      setAnnouncement(message)
    } catch {
      setStorageError(true)
      setAnnouncement('Przeglądarka nie pozwala zapisać ulubionych. Zmiany będą dostępne tylko do odświeżenia strony.')
    }
  }

  const removeFavorite = (query: string) => {
    updateFavorites(
      favorites.filter((favorite) => favoriteQueryKey(favorite.query) !== favoriteQueryKey(query)),
      `Usunięto „${query}” z ulubionych.`,
    )
  }

  const toggleFavorite = (query: string, vnums: number[]) => {
    const normalized = query.trim().replace(/\s+/g, ' ')
    if (!normalized) return
    if (favorites.some((favorite) => favoriteQueryKey(favorite.query) === favoriteQueryKey(normalized))) {
      removeFavorite(normalized)
    } else {
      updateFavorites([...favorites, { query: normalized, vnums }], `Dodano „${normalized}” do ulubionych.`)
    }
  }

  return { favorites, toggleFavorite, removeFavorite, announcement, storageError }
}
