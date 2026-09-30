import { favoriteQueryKey, type FavoriteSearch } from '../useFavorites'
import { CloseIcon } from './Icons'

interface FavoritesProps {
  favorites: FavoriteSearch[]
  query: string
  onSelect: (favorite: FavoriteSearch) => void
  onRemove: (query: string) => void
}

export function Favorites({ favorites, query, onSelect, onRemove }: FavoritesProps) {
  if (favorites.length === 0) return null

  return (
    <div className="favorites-row" role="group" aria-label="Ulubione wyszukiwania">
      <span className="favorites-label">Ulubione:</span>
      {favorites.map((favorite) => (
        <div
          className={'favorite-entry' + (favoriteQueryKey(favorite.query) === favoriteQueryKey(query) ? ' favorite-entry--active' : '')}
          key={favoriteQueryKey(favorite.query)}
        >
          <button
            type="button"
            className="favorite-entry__search"
            title={'Wyszukaj: ' + favorite.query}
            onClick={() => onSelect(favorite)}
          >
            <span>{favorite.query}</span>
          </button>
          <button
            type="button"
            className="favorite-entry__remove"
            aria-label={'Usuń „' + favorite.query + '” z ulubionych'}
            title="Usuń z ulubionych"
            onClick={() => onRemove(favorite.query)}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  )
}
