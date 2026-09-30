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

## Testy klienta API

`npm test` (Node.js 22 lub nowszy) sprawdza timeout całej odpowiedzi, anulowanie wyszukiwania,
sprzątanie listenerów, obsługę błędów i ponowne zapytanie po przerwanym pobieraniu.
Limit czasu obejmuje także odczyt JSON po otrzymaniu nagłówków HTTP.
Oferty stają się dostępne przed zakończeniem opcjonalnego pobierania statystyk.

Do ręcznej weryfikacji ekranu można uruchomić `node tests/fixtures/market-api.mjs`
i otworzyć lokalny frontend z `?server=elder&api=http://127.0.0.1:4321`.
Frazy `stall-body` i `retry-body` symulują zatrzymanie odpowiedzi po statusie 200
(druga fraza działa po ponowieniu), `slow-statistics` zatrzymuje statystyki,
a `slow-offers` opóźnia oferty, umożliwiając sprawdzenie szybkiej zmiany wyszukiwania.
Backend testowy nasłuchuje wyłącznie na lokalnym adresie 127.0.0.1.

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


## Ulubione

Gwiazdka po prawej stronie pola wyszukiwania zapisuje lub usuwa wpisaną frazę.
Zapisane frazy pojawiają się pod „Szybkim wyborem”; kliknięcie uruchamia wyszukiwanie,
a przycisk × usuwa wpis. Sekcja jest ukryta, gdy lista jest pusta.
Ulubione są przechowywane w `localStorage` osobno dla każdego serwera i profilu przeglądarki,
bez konta użytkownika. Dla wybranego przedmiotu lub rodziny zachowywany jest także filtr VNUM.

## Serwery

Widok Pandory jest dostępny pod adresem głównym. Elder i Beavium mają osobne adresy widoków: ?server=elder oraz ?server=beavium. Każdy widok pobiera oferty, podpowiedzi i statystyki z tras /api/v1/servers/{serwer}/items. Selektor serwera zachowuje pozostałe parametry adresu, w tym opcjonalne api używane lokalnie.
