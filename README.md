# Metin Market

Publiczny, responsywny frontend do przeglądania ofert i statystyk rynku Metin2.

## Uruchomienie

```bash
cp .env.example .env
npm install
npm run dev
```

Build produkcyjny:

```bash
npm run build
npm run preview
```

`VITE_API_BASE_URL` wskazuje bazowy adres API. W trybie deweloperskim Vite pośredniczy w zapytaniach, ponieważ publiczne API odrzuca origin `localhost`; build produkcyjny korzysta bezpośrednio ze skonfigurowanego adresu.

## Struktura

- `src/api.ts` — klient API i obsługa błędów
- `src/types.ts` — modele odpowiedzi API
- `src/components/` — wyszukiwarka, statystyki, oferty i ikony
- `src/styles.css` — responsywny system wizualny bez biblioteki UI
- `public/items/` — statyczne ikony dostępne pod `/items/{VNUM}.png`

## Redesign rynku

Inter i tokeny powierzchni z DESIGN.md; kompaktowy układ, cena za sztukę jako
główna wartość oferty. Statystyki pozostają rozdzielone według VNUM.

Sortowanie w `src/sortOffers.ts` obejmuje wyłącznie załadowaną stronę.
Tryb domyślny zachowuje kolejność odpowiedzi API.

`formatCoordinates` w `src/format.ts` zakłada 100 jednostek świata na jedną
współrzędną gry i zaokrągla w dół. Nie stosuje offsetów map — repozytorium nie
zawiera autorytatywnej konwencji. Identyfikatory map i slotów pozostają surowe.

Podpowiedzi korzystają z wzorca combobox GodUI (wyszukiwanie asynchroniczne,
wyróżnienie dopasowania, aktywny wiersz i klawiatura), bez nowej biblioteki UI.

Osadzone Kamienie Duszy rozpoznaje `src/soulStones.ts`. Wartości socketów
`28630–28643` są pokazywane nazwą i poziomem +5, a odpowiadające im grafiki
pochodzą z serii ikon `28000–28013`. Pozostałe wartości pozostają wyłącznie
w rozwijanych danych technicznych slotów.
