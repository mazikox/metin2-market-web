# Metin2 Bazar

Frontend katalogu ofert Metin2: Pandora, Elder i Beavium.
Adres docelowy: `https://metin2bazar.pl`.

## Uruchomienie

Skopiuj `.env.example` do `.env` i uruchom `npm install`, następnie `npm run dev`.
`VITE_API_BASE_URL=/backend` oznacza API pod tym samym originem co witryna.
Deweloperski proxy kieruje zapytania na `VITE_API_PROXY_TARGET`, domyślnie
`http://127.0.0.1:8080`. Może to być lokalny backend lub lokalny tunel SSH do VPS.

`npm run build` tworzy `dist`; `npm run preview` pokazuje ten build, ale proxy API
produkcyjnego obsługuje Caddy, a nie sam serwer preview.

## Publikacja i dwa adresy

Obie domeny korzystają z jednego katalogu `/var/www/metin2bazar` i tej samej bazy.
Nowa domena jest adresem kanonicznym i ma sitemapę. Dotychczasowy adres jest
obsługiwany jako nieindeksowane lustro przez konfigurację Caddy w repo API:
`ops/Caddyfile`. Stare domeny pozostają wyłącznie w konfiguracji kompatybilności.
Instrukcja uruchomienia i DNS: `E:/metin-market-api/docs/uruchomienie-metin2bazar.md`.
Nowy katalog publikacji należy utworzyć z uprawnieniami użytkownika wdrożeniowego
przed uruchomieniem workflow. Workflow wykonuje testy, build i publikację plików;
nie aktywuje konfiguracji Caddy ani DNS.

## Podstrony i SEO

`src/site.json` zawiera markę, canonical origin, flagę `indexable` i ustawienia analityki.
`content/pages.json` zawiera treści podstron. `scripts/generate-site.mjs` generuje
statyczne podstrony, 404, robots i sitemapę przed buildem. W trybie `predev` argument
`--noindex` wyłącza sitemapę oraz skrypt analityczny. Po zmianie treści podczas pracy
z Vite uruchom `node scripts/generate-site.mjs --noindex`.

Produkcyjny build jest przeznaczony dla metin2bazar.pl. `indexable: true` umożliwia
indeksowanie nowej domeny. Caddy na starym adresie dodaje `X-Robots-Tag: noindex`,
nie udostępnia sitemapy i daje robots bez odsyłacza do sitemapy. Crawling pozostaje
dozwolony, żeby robot mógł odczytać noindex. Nie blokuje to publicznego dostępu.
Lokalny Vite dodaje noindex do katalogu niezależnie od konfiguracji produkcyjnej.

## Analityka

Frontend ładuje `/metrics/script.js` i wysyła zdarzenia do `/metrics/api/send`.
Caddy udostępnia wyłącznie te dwie ścieżki Umami; panel administracyjny nie jest
udostępniany przez prefiks metrics. Tracker działa tylko na metin2bazar.pl przez
`data-domains`, a lokalny Vite nie wstawia skryptu. Nie tworzy to nowej bazy ani nie
usuwa wcześniejszych statystyk. Aktualizacja domeny i nazwy istniejącej witryny
Umami jest przygotowana w `ops/umami-metin2bazar.sql` w repo API.

„Dane w przeglądarce” opisują frontend, nie zastępują pełnej informacji o prywatności.
Tożsamość administratora, kontakt, retencja oraz konfiguracja logów wymagają dokończenia.

## Funkcje i testy

`npm test` sprawdza timeouty, anulowanie, odczyt błędów i odzyskanie klienta API po błędzie.
Sortowanie i filtr mapy obejmują pobraną stronę. Oferty pochodzą z opublikowanego skanu;
stan połączenia API nie oznacza aktualności oferty. Ulubione zapisują się w localStorage
osobno dla serwera i originu; nie przenoszą się automatycznie pomiędzy domenami.

Podstrony są generowane do public i kopiowane do dist. Caddy obsługuje ich index.html
oraz prawdziwe 404 bez fallbacku dowolnego URL na katalog. Nazwy projektów, paczek Java
oraz klucze ulubionych zachowano dla zgodności — nie są odnośnikami do starej domeny.
