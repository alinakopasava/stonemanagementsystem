# Stone Management System

System do obsługi zakładu kamieniarskiego. Klient sam układa pomnik w konfiguratorze
z podglądem trójwymiarowym i zapisuje kartę zamówienia. Biuro zamienia kartę w zamówienie
produkcyjne, drukuje kartę pracy dla warsztatu i przekazuje zlecenie do montażu.
Monter otwiera je na telefonie w terenie i zapisuje raport z wykonanych prac.
Dane pomnika przechodzą całą tę drogę raz wprowadzone — nikt nie przepisuje ich ręcznie.

Praca inżynierska, Polsko-Japońska Akademia Technik Komputerowych.

## Co system potrafi

**Klient**

- przegląda katalog materiałów kamieniarskich,
- składa pomnik w konfiguratorze: kształt tablicy, materiał, wykończenie, wymiary,
  inskrypcja, krój pisma, krzyż, zdjęcie portretowe,
- widzi model w trzech wymiarach i cenę przeliczaną przy każdej zmianie ustawień,
- zapisuje kartę zamówienia i śledzi jej stan,
- pisze do zakładu przez formularz kontaktowy,
- korzysta z aplikacji po polsku, angielsku lub rosyjsku, z ceną w walucie dobranej do języka.

**Biuro**

- prowadzi listę kart zamówień i zamienia wybraną w zamówienie produkcyjne,
- prowadzi rejestr zamówień i konta użytkowników,
- odpowiada na wiadomości z formularza,
- pobiera kartę pracy w formacie PDF — wyłącznie parametry techniczne, bez danych klienta i ceny,
- przekazuje zlecenie zespołowi montażowemu.

**Monter**

- widzi listę zleceń faktycznie przekazanych do montażu,
- zapisuje raport z montażu wraz ze zdjęciami,
- pracuje na telefonie, z buforowaniem ostatnio pobranych danych przy słabym zasięgu.

## Jak to jest zbudowane

| Warstwa | Technologie |
| --- | --- |
| Aplikacja kliencka | React, TypeScript, Vite, Three.js (React Three Fiber) |
| Serwer | Node.js, Express |
| Baza danych, konta, pliki | Supabase (PostgreSQL, Auth, Storage) |
| Testy | Vitest, Testing Library, Supertest, Playwright |

Reguły dostępu do danych są zapisane w samej bazie (Row Level Security), a nie tylko
w kodzie aplikacji. Bezpośrednie odpytanie bazy z pominięciem serwera nie pozwala klientowi
odczytać cudzych zamówień ani nadać sobie uprawnień administratora.

Sesja opiera się na ciasteczkach `HttpOnly` z cichym odnawianiem, ochroną przed CSRF
i limitami liczby żądań. Kursy walut pobierane są z API Narodowego Banku Polskiego,
z kursem zapasowym na wypadek awarii serwisu.

## Układ katalogów

```
backend/            serwer Express: kontrolery, trasy, usługi, testy API i reguł dostępu
frontend/           aplikacja React: domena, logika, komunikacja z API, widoki i scena 3D
supabase/migrations ponumerowane skrypty zmian w bazie danych
assets/modele/      źródłowe modele pomników (Blender)
docs/               materiały do pracy dyplomowej
```

Kod aplikacji klienckiej jest podzielony na cztery warstwy — `domain`, `application`,
`infrastructure`, `presentation` — żeby typy dziedzinowe, logika, komunikacja z serwerem
i sam interfejs nie mieszały się ze sobą.

## Uruchomienie

Potrzebne: Node.js 20 lub nowszy oraz projekt w Supabase.

**1. Baza danych.** Wykonaj skrypty z `supabase/migrations` po kolei, według numerów.

**2. Serwer.** Utwórz `backend/.env`:

```
PORT=4000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
FRONTEND_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

```bash
cd backend && npm install && npm run dev
```

**3. Aplikacja kliencka.** Utwórz `frontend/.env`:

```
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

```bash
cd frontend && npm install && npm run dev
```

Aplikacja jest dostępna pod `http://localhost:5173`.

Konto przykładowe zakładasz poleceniem `npm run seed:example-user` w katalogu `backend`.

## Testy

```bash
cd backend && npm test          # jednostkowe i integracyjne API
cd backend && npm run test:rls  # reguły dostępu sprawdzane wprost w bazie
cd frontend && npm test         # jednostkowe i komponentowe
cd frontend && npm run test:e2e # systemowe (Playwright)
```

Testy reguł dostępu i testy systemowe wymagają działającej bazy oraz uruchomionego serwera.
Szczegóły opisuje [TESTING.md](TESTING.md), a działanie logowania i sesji — [AUTH.md](AUTH.md).

## Podział pracy

- **Aliaksei Habrukovich** — serwer, baza danych i zabezpieczenia: schemat tabel i polityki
  dostępu, migracje, API i sesje, kursy walut, karta pracy PDF, zasobniki na zdjęcia,
  lista robocza montera, testy serwera i testy reguł dostępu.
- **Alina Kopasava** — aplikacja kliencka: układ kodu i wszystkie widoki, konfigurator ze
  sceną trójwymiarową, obróbka zdjęcia portretowego w przeglądarce, trzy języki i waluty,
  praca przy słabym zasięgu, testy jednostkowe logiki dziedzinowej i testy komponentów.

Wspólnie: analiza pracy zakładu, specyfikacja wymagań i testy systemowe.
