# 7. Testy

## 7.1 Plan testów

Testy podzieliłam na pięć poziomów, zgodnie z ideą piramidy testów. Na dole jest ich najwięcej i są najprostsze, na górze najmniej, ale sprawdzają całą aplikację naraz. Im szerszy test, tym dłużej trwa i tym trudniej znaleźć przyczynę błędu, więc każdą regułę sprawdzałam możliwie nisko.

**Tabela 7.1: Poziomy testów systemu SZK – opracowanie własne**

| Poziom | Co sprawdza | Narzędzia | Przypadki |
|---|---|---|---|
| Jednostkowy | Pojedyncze funkcje: obliczenia, walidację, bezpieczeństwo | Vitest | 107 |
| Integracyjny API | Ścieżki HTTP backendu razem z pośrednikami | Vitest, Supertest, atrapa Supabase | 81 |
| Integracyjny baza | Polityki Row Level Security i wyzwalacze | Klient HTTP i PostgREST | 16 |
| Komponentowy | Komponenty i strony aplikacji klienckiej | Vitest, React Testing Library, MSW | 26 |
| Systemowy | Całe ścieżki użytkownika w przeglądarce | Playwright | 7 |

Razem wyszły 237 przypadków. 214 z nich działa bez internetu i bez bazy danych, w kilkanaście sekund. Dwa poziomy potrzebują testowej bazy Supabase, więc uruchamiam je osobno.

Przyjęłam trzy zasady. Żaden test nie zależy od sieci, zegara ani losowości — kurs walutowy i logowanie zastąpiłam atrapami. Wynik oczekiwany liczę sama, ze wzoru albo z treści wymagania; nie wpisuję do testu tego, co akurat zwraca kod, bo wtedy test potwierdzałby błąd zamiast go wykrywać. Nie powtarzam wyżej tego, co sprawdziłam niżej.

Testy API używają atrapy bazy, dzięki czemu mogę wywołać sytuacje trudne do odtworzenia na prawdziwej bazie: błąd zapisu w połowie operacji albo brak profilu użytkownika. Atrapa nie sprawdza jednak reguł zapisanych w samej bazie, więc polityki RLS testuję osobno, wysyłając zapytania prosto do PostgREST. Adres bazy i klucz publiczny widać w kodzie aplikacji klienckiej, więc ktoś może ominąć serwer Express.

## 7.2 Testy jednostkowe

Sprawdzam tu funkcje, które nie zależą od stanu aplikacji ani od przeglądarki. Wcześniej wyciągnęłam je z komponentów interfejsu, co opisałam w rozdziale o realizacji.

### 7.2.1 Cena pomnika

Cena jest liczona najczęściej ze wszystkiego w systemie. Klient widzi ją przed zamówieniem, a administrator dostaje jako podpowiedź przy tworzeniu zamówienia produkcyjnego. Liczę ją ze wzoru

$$C = \mathrm{round}_2\left(B_k + \frac{h \cdot w}{10000} \cdot p\right) \tag{7.1}$$

gdzie $B_k$ to cena bazowa kształtu w rublach białoruskich, $h$ i $w$ to wysokość i szerokość w centymetrach, a $p$ to cena kamienia za metr kwadratowy.

Ceny bazowej nie było w pierwotnych wymaganiach. Dodałam ją, kiedy kształtów zrobiło się trzynaście, bo bez niej dwa projekty o tej samej powierzchni kosztowałyby tyle samo, choć wycięcie krzyża to dużo dłuższa praca niż przycięcie prostokąta.

**Tabela 7.2: Ceny bazowe kształtów tablicy nagrobnej w BYN – opracowanie własne**

| Kształt | $B_k$ | Kształt | $B_k$ | Kształt | $B_k$ |
|---|---|---|---|---|---|
| classic | 80 | wave-steep | 160 | asymmetric | 210 |
| rounded | 100 | heart | 170 | dome | 230 |
| concave | 130 | arc | 180 | curvy | 240 |
| stele | 150 | gothic | 190 | cross-top | 270 |
| | | | | cross | 290 |

Te ceny nie wynikają z niczego innego w systemie, więc osobny test przechodzi po wszystkich trzynastu kluczach i porównuje je z tabelą 7.2. Gdyby ktoś przypadkiem zmienił którąś stawkę, żaden inny test by tego nie zauważył.

Pozostałe przypadki zebrałam w tabeli 7.3. Dwa dotyczą sytuacji wyjątkowych: nieznanego kształtu, który może być w starym linku, oraz materiału bez ceny. W obu funkcja pomija ten składnik zamiast zgłaszać błąd, bo niepełna cena, którą administrator poprawi, jest mniej szkodliwa niż komunikat przerywający pracę klienta.

**Tabela 7.3: Wybrane przypadki testowe wyceny pomnika – opracowanie własne**

| Dane wejściowe | Wynik oczekiwany | Skąd wynik |
|---|---|---|
| `classic`, 180 × 90 cm, $p = 100$ | 242,00 | $80 + 1{,}62 \cdot 100$ |
| `cross`, 180 × 90 cm, $p = 100$ | 452,00 | $290 + 1{,}62 \cdot 100$ |
| `classic`, 180 × 90 cm, $p = 0$ | 80,00 | sama cena bazowa |
| Nieznany kształt, 180 × 90 cm, $p = 100$ | 162,00 | $B_k = 0$ |
| `classic`, materiał bez ceny | 80,00 | pominięta powierzchnia |
| `classic`, 100 × 60 cm, $p = 420$ | 332,00 | ten sam wynik sprawdzam w testach komponentów |
| Wszystkie 13 kluczy | wartości z tab. 7.2 | ochrona cen przed przypadkową zmianą |

Sprawdziłam też funkcję czytającą wymiary z tekstu w formacie *wysokość* `x` *szerokość*. Wielkość litery i spacje nie mają znaczenia, a pusty tekst, brak separatora, zero, wartość ujemna i tekst bez cyfr dają wynik pusty. Gdyby funkcja zwracała zero, cena spadłaby do samej ceny bazowej i nikt by tego nie zauważył.

### 7.2.2 Polityka haseł

Hasło musi mieć od 8 do 128 znaków oraz wielką literę, małą literę i cyfrę. Nie wymagam znaku specjalnego, bo razem z resztą warunków prowadzi to do haseł typu `Haslo1!`, a bezpieczeństwa nie podnosi. Górna granica chroni przed wysyłaniem do logowania ogromnych danych.

Testuję hasło poprawne, hasła bez którejś z trzech grup znaków oraz przypadki na granicach: siedem znaków, 129 znaków i tekst pusty. Osobno sprawdzam hasło o długości dokładnie 128 znaków, które musi przejść — ten przypadek wychwytuje pomyłkę w znaku nierówności. Reguła jest zapisana w dwóch miejscach, bo frontend i backend są w różnych językach, więc testuję obie wersje osobno, a granice dodatkowo przez rejestrację (7.3.1).

### 7.2.3 Bezpieczeństwo adresów i nagłówków

Trzy małe funkcje odpowiadają za sporą część bezpieczeństwa, więc dałam im wyjątkowo dużo danych wejściowych.

Pierwsza sprawdza adres, na który wracamy po zalogowaniu, i chroni przed atakiem *open redirect*: ktoś wstawia w link adres obcej strony, a użytkownik trafia tam zaraz po podaniu hasła. Adresy wewnętrzne zostają bez zmian, a na stronę główną zamieniam między innymi adres z domeną, adres z dwoma ukośnikami, ukośnik odwrotny, ukryty w środku zapis `://`, wartość niebędącą tekstem i tekst ze znakiem sterującym. Odrzucam też adresy stron logowania, żeby po zalogowaniu nie wracać znowu do logowania.

Druga rozbiera nagłówek `Cookie`. Testuję ją na danych zepsutych, bo gdyby zgłosiła błąd, przestałaby działać obsługa całego żądania. Pusty nagłówek daje pusty wynik, znak równości w środku wartości zostaje (mają go tokeny JWT), `%20` zamienia się na spację, a błędny zapis procentowy przechodzi bez zmian.

Trzecia ustala adres IP klienta, po którym liczę żądania w limitach. Gdyby dało się ten adres dowolnie podać, limity nic by nie dawały, więc nagłówek `X-Forwarded-For` biorę pod uwagę tylko wtedy, gdy konfiguracja mówi, że aplikacja stoi za serwerem pośredniczącym. Sprawdzam oba przypadki. Nagłówek `Origin` opisuję w 7.3.5, bo potrzebny jest tam cały serwer.

### 7.2.4 Waluty i tłumaczenia

Ceny trzymam w rublach białoruskich, a pokazuję zależnie od języka: rosyjski w BYN, polski i angielski w złotych po kursie Narodowego Banku Republiki Białorusi. Testy sprawdzają, że po rosyjsku 100 BYN zostaje bez zmian, w pozostałych językach jest mnożone przez kurs, a wartość nieliczbowa daje zero zamiast napisu `NaN`. Przy skali 10 i kursie 8,0182 kurs jednostkowy wychodzi 0,80182.

Serwis z kursem to jedyne miejsce, gdzie aplikacja korzysta z zewnętrznej usługi, więc jego awaria mogłaby zablokować pokazywanie cen. Odpowiedź trzymam w pamięci przez godzinę, a zapytanie przerywam po ośmiu sekundach. Testuję cztery sytuacje: poprawną odpowiedź, awarię z zapamiętanym kursem, awarię bez niego i odpowiedź z błędnymi liczbami. W drugim przypadku zwracam poprzedni kurs, w pozostałych kurs zapasowy wpisany w kodzie. Klient zobaczy więc najwyżej cenę lekko nieaktualną, a nigdy błąd.

Tłumaczenia mają trzy grupy testów. Pierwsza sprawdza rozpoznawanie języka przeglądarki: `pl-PL` i `ru_RU` skracam do kodu podstawowego, język nieobsługiwany daje angielski, a wybór użytkownika jest ważniejszy od ustawień przeglądarki. Druga przechodzi po wszystkich kluczach i sprawdza, czy każdy jest w trzech słownikach, więc brakujące tłumaczenie widać od razu. Trzecia sprawdza wstawianie kwoty w miejsce `{price}`.

### 7.2.5 Zdjęcie i klient API

Funkcja przygotowująca zdjęcie dopasowuje obraz o dowolnych proporcjach do ramki na tablicy. Testy sprawdzają powiększenie ograniczone do zakresu od 1 do 3, dopasowanie zdjęcia poziomego, pionowego, kwadratowego i panoramicznego oraz to, że obraz zawsze zakrywa całą ramkę i nie zostawia pustego pola.

Funkcję wysyłającą żądania do backendu sprawdziłam pod kątem trzech rzeczy: czy dołącza ciasteczka, czy zamienia odpowiedź 4xx na błąd z komunikatem serwera i czy oznacza odpowiedź 429, żeby interfejs mógł napisać o zbyt częstych próbach.

## 7.3 Testy API

Uruchamiam serwer Express w pamięci i wysyłam do niego żądania HTTP biblioteką Supertest, z klientem bazy podmienionym na atrapę. Sprawdzam całą drogę żądania: pośredniki, kontroler i usługę, razem z kodami odpowiedzi i nagłówkami.

### 7.3.1 Logowanie i sesja

Poprawne logowanie kończy się kodem 200 i samym potwierdzeniem. Osobno sprawdzam, że w odpowiedzi nie ma tokenu JWT, a sesja wraca tylko w ciasteczkach z `HttpOnly` — takiego tokenu nie da się wykraść atakiem *cross-site scripting*.

Logowanie na nieistniejący adres i logowanie ze złym hasłem muszą dać tę samą odpowiedź 401 i ten sam komunikat; test porównuje obie odpowiedzi. Gdyby się różniły, dałoby się sprawdzić, czy dany adres ma u nas konto, a to jest dana osobowa. Z tego samego powodu przypomnienie hasła zawsze zwraca 200. Sprawdzam też, że wpis w dzienniku po nieudanym logowaniu nie zawiera hasła.

Rejestracja odrzuca kodem 400 imię z jednej litery i hasło niezgodne z polityką, a przy okazji sprawdzam, że atrapa logowania nie została wywołana. To pokazuje, że walidacja idzie przed zapisem, więc złe żądanie nie zostawia konta w połowie utworzonego.

Odnawianie sesji sprawdzam na trzech nadużyciach: puste tokeny, tokeny dłuższe niż 8192 znaki oraz token dostępu jednego użytkownika z tokenem odświeżania drugiego. Wszystkie dają 401, a ostatni pokazuje, że oba tokeny sprawdzam razem. Pośrednik autoryzujący ma pięć przypadków. Wygasły token dostępu z ważnym tokenem odświeżania powoduje ciche odnowienie sesji. Gdy oba są nieważne, czyszczę ciasteczka, bo inaczej przeglądarka wysyłałaby je przy każdym kolejnym żądaniu.

### 7.3.2 Uprawnienia ról

Klient dostaje 403 przy każdym adresie panelu administratora, a monter — sprawdzany osobno, bo jest pracownikiem — przy liście użytkowników. Monter ma za to dostęp do listy kart montażowych, klient przy tym samym adresie dostaje 403, a żądanie bez sesji 401. Sprawdzam też przypadek pozytywny, bo sam test odmowy przeszedłby również wtedy, gdyby pośrednik blokował wszystkich.

### 7.3.3 Zapis karty zamówienia

Ten punkt końcowy ma najwięcej walidacji, bo tylko tędy dane od klienta trafiają do dokumentacji produkcyjnej. Kodem 400 odrzucam identyfikator materiału, który nie jest poprawnym UUID, wymiary w innym formacie niż dwie liczby, wykończenie spoza trzech dozwolonych wartości oraz inskrypcję pustą albo dłuższą niż 4000 znaków.

Dwa przypadki wychodzą poza sprawdzanie formatu. Pierwszy wysyła w treści cudzy identyfikator użytkownika: pole jest pomijane, a karta zapisuje się na koncie z tokenu sesji. Drugi udaje błąd zapisu części technicznej po udanym zapisie nagłówka i sprawdza, że kontroler kasuje wtedy utworzoną kartę. Bez tego w bazie zostawałyby karty bez parametrów, których nie da się wykonać.

### 7.3.4 Panel administratora

Próba nadania roli, której nie ma w systemie, kończy się kodem 400 i zamyka drogę do zdobycia uprawnień przez podanie wymyślonej nazwy. Próba odebrania sobie roli administratora też daje 400, żeby nikt przypadkiem nie odciął sobie dostępu do panelu. Zmiana roli innego użytkownika działa i zostawia wpis w dzienniku zdarzeń.

Zamianę karty na zamówienie opisałam pięcioma przypadkami: karta nieistniejąca daje 400, druga zamiana tej samej karty 409, cena ujemna 400, pusta cena zapisuje się jako brak wartości, a poprawna operacja kończy się kodem 201. Kod 409 wybrałam zamiast 400, bo problemem nie jest złe żądanie, tylko stan karty — interfejs może wtedy napisać, że ktoś już ją przetworzył.

### 7.3.5 Formularz kontaktowy i zasoby publiczne

Formularz kontaktowy to jedyne miejsce, w którym zapisu może dokonać osoba niezalogowana, więc sprawdziłam go dokładnie. Brak imienia, adresu albo treści oraz zły format adresu dają 400. Testy pilnują limitów długości pól: 120, 200, 40 i 4000 znaków. Pusty numer telefonu zapisuje się jako brak wartości. Po stronie panelu sprawdzam, że oznaczenie wiadomości jako przeczytanej zapisuje datę i osobę, a archiwizacja te dane kasuje.

Zasoby publiczne mają trzy testy: adres kontrolny zwraca stałą odpowiedź używaną przez hosting, katalog działa bez ciasteczka sesji, a żądanie większe niż 100 kB dostaje 413 jeszcze przed przetworzeniem.

Nagłówek `Origin` chroni przed atakiem *cross-site request forgery*, możliwym dlatego, że przeglądarka sama dokłada ciasteczka. Żądania GET przechodzą zawsze. Żądanie zmieniające dane z ciasteczkiem sesji dostaje 403 przy obcym nagłówku i przy jego braku. Żądanie bez ciasteczek i bez nagłówka przechodzi, bo nie pochodzi z przeglądarki.

### 7.3.6 Limity liczby żądań

Każdy z siedmiu limitów ma osobny test, który wysyła serię żądań i sprawdza odpowiedź na to jedno ponad limit. Wartości z tabeli 7.4 dobrałam tak, żeby przy normalnej pracy nie dało się ich zauważyć. Dwa dodatkowe testy sprawdzają nagłówki z informacją o limicie oraz to, że każdy adres IP ma własny licznik.

**Tabela 7.4: Limity liczby żądań – opracowanie własne**

| Zasób | Limit | Przed czym chroni |
|---|---|---|
| Wszystkie żądania do API | 100 / 10 s | Nadmierne obciążenie serwera |
| Logowanie | 5 / min | Zgadywanie hasła |
| Rejestracja | 3 / min | Masowe zakładanie kont |
| Operacje na haśle | 3 / min | Nadużycie wysyłki e-maili |
| Odnawianie sesji | 10 / min | Nadużycie modułu logowania |
| Formularz kontaktowy | 3 / min | Spam |
| Zapis kart zamówień | 8 / min | Zaśmiecanie panelu |

## 7.4 Testy zabezpieczeń bazy

Tu sprawdzam reguły zapisane w samej bazie, czyli zabezpieczenia, które zadziałają nawet wtedy, gdy zawiedzie kod serwera. Zapytania wysyłam z tokenem JWT prosto do PostgREST, z pominięciem Express, czyli tak, jak zrobiłby ktoś, kto zna publiczny adres bazy i klucz aplikacji.

**Tabela 7.5: Scenariusze testów Row Level Security – opracowanie własne**

| Obszar | Operacja | Wynik oczekiwany |
|---|---|---|
| Wyzwalacz | Rejestracja z metadanymi z rolą administratora | Profil dostaje rolę klienta |
| Izolacja | Klient A czyta karty klienta B i całą tabelę kart | Tylko własne karty |
| Izolacja | Klient A zapisuje kartę na klienta B | Odmowa |
| Izolacja | Klient zmienia status zamówienia | Odmowa |
| Izolacja | Klient nadaje sobie rolę administratora | Odmowa |
| Izolacja | Anonim zapisuje wiadomość kontaktową | Odmowa |
| Izolacja | Klient czyta wiadomości i zapisuje wpis dziennika | Pusty wynik; odmowa |
| Monter | Odczyt wszystkich zamówień | Widzi zamówienia obu klientów |
| Monter | Usunięcie karty zamówienia | Odmowa |
| Monter | Zmiana kolumny innej niż status | Odmowa (luka otwarta) |
| Administrator | Odczyt dziennika zdarzeń | Widzi wpisy |
| Katalog | Odczyt materiałów bez logowania; zapis przez gościa i klienta | Odczyt tak, oba zapisy nie |

Przy rejestracji można wysłać dowolne metadane użytkownika, więc bez zabezpieczenia w bazie wystarczyłoby dopisać rolę administratora, żeby wejść do panelu. Zapis wiadomości przez anonima baza odrzuca, choć formularz jest publiczny, bo zapis ma iść tylko przez backend, po walidacji i sprawdzeniu limitu.

Ostatni wiersz montera opisuje lukę, której jeszcze nie naprawiłam. Według założeń monter ma czytać wszystkie zamówienia i zmieniać tylko status, ale obecna polityka pozwala mu zapisywać do wszystkich kolumn. Ten test zostawiłam z oznaczeniem, że ma się nie udać. Po dodaniu wyzwalacza ograniczającego kolumny stanie się zwykłym testem regresji.

## 7.5 Testy komponentów

Testy komponentów uruchamiam w jsdom, z podglądem 3D podmienionym na atrapę. Sieć podstawia biblioteka MSW, ustawiona tak, żeby żądanie pod nieobsłużony adres kończyło test błędem, a nie leciało do prawdziwego serwera. Sprawdzam to, co widzi użytkownik: treść po zmianie stanu, aktywność przycisków, adresy przekierowań i to, co idzie do backendu. Elementy wyszukuję po rolach i etykietach dostępności, więc zmiana wyglądu nie psuje testów.

Komponent chroniący ścieżki czyta listę ról, więc sprawdzam każdą decyzję raz, bez powtarzania jej dla kolejnych adresów. Gość idzie do logowania z zapamiętanym adresem, klient i monter próbujący wejść do panelu wracają na stronę główną, monter wchodzi do widoku otwartego dla monterów i administratorów, a widok bez listy ról wpuszcza każdego zalogowanego. Rozkład ról na poszczególne adresy sprawdza zestaw API. Osobny test pilnuje, żeby do czasu odpowiedzi o sesji pokazywał się stan oczekiwania, bo inaczej zalogowany użytkownik wylatywałby z panelu przy każdym odświeżeniu.

Formularz kontaktowy czyści pola po wysłaniu, pokazuje osobny komunikat po przekroczeniu limitu i nie pozwala kliknąć drugi raz, gdy żądanie trwa. Katalog pokazuje wszystkie trzynaście kamieni, a cenę porównuję z wynikiem ze wzoru (7.1), czyli tym samym, którego używam w testach jednostkowych.

Najwięcej testów ma konfigurator. Gość próbujący zapisać projekt trafia do logowania z adresem powrotnym, a klient wysyła żądanie w formacie, którego oczekuje backend. Kształt z adresu URL jest uwzględniany, a nieznana wartość daje kształt domyślny, a nie pusty widok. Osobno sprawdziłam szablony inskrypcji przy zmianie języka: szablon nieruszany tłumaczy się razem z interfejsem, ale tekst wpisany ręcznie zostaje. To był najbardziej podatny na błąd fragment, bo pomyłka oznaczałaby skasowanie tekstu klienta.

Panelu administratora i widoku montażowego nie objęłam testami komponentów. Reguły, które za nimi stoją, sprawdzam na poziomie API, a ich wygląd na poziomie systemowym.

## 7.6 Testy systemowe

Poziom systemowy to siedem ścieżek uruchamianych przez Playwright w przeglądarce Chromium, na działającej aplikacji, serwerze i bazie. Celowo jest ich mało — zostawiłam tu tylko to, czego nie da się sprawdzić niżej: prawdziwe zachowanie ciasteczek, trwałość danych w bazie i współpracę kilku ról w jednym procesie.

**Tabela 7.6: Ścieżki testów systemowych – opracowanie własne**

| Nr | Przebieg | Co sprawdzam |
|---|---|---|
| 1 | Gość: strona główna, katalog, konfigurator, formularz kontaktowy | Cena jako liczba, podgląd 3D, zapis wiadomości w bazie |
| 2 | Zmiana języka i odświeżenie strony | Rosyjski pokazuje BYN, polski PLN, wybór języka zostaje |
| 3 | Rejestracja, potem logowanie na potwierdzonym koncie | Sesja tylko w ciasteczkach `HttpOnly`, brak tokenu w pamięci przeglądarki, wyczyszczenie ciasteczek po wylogowaniu |
| 4 | Klient zapisuje kartę zamówienia | Karta zapisana na koncie zalogowanego klienta |
| 5 | Administrator zamienia kartę na zamówienie, monter otwiera widok montażowy | Adres montażu i termin widoczne dla montera |
| 6 | Klient próbuje wejść do panelu i odpytać jego API | Przekierowanie w interfejsie, 403 dla żądania, brak danych w odpowiedzi |
| 7 | Żądanie z obcym `Origin`; sześć prób logowania ze złym hasłem | 403 dla obcego pochodzenia, 429 po przekroczeniu limitu |

Ścieżka trzecia zakłada konto i sprawdza, że system prosi o potwierdzenie adresu, ale dalszą część robi na koncie potwierdzonym wcześniej, bo potwierdzenia nie da się zautomatyzować bez dostępu do skrzynki. Z tego samego powodu ścieżki z monterem i administratorem korzystają z kont przygotowanych wcześniej: samodzielna rejestracja zawsze daje rolę klienta.

Ścieżka piąta odtwarza cały obieg informacji, którego brak wykryłam w analizie procesów: od projektu klienta, przez decyzję w biurze, po dane na telefonie montera. Jeżeli przechodzi, dane techniczne idą całą drogę bez ręcznego przepisywania, czyli główny cel pracy został osiągnięty. Ścieżka szósta sprawdza to samo zabezpieczenie przez interfejs i przez bezpośrednie żądanie do API, bo ukrycie linku w menu nie jest zabezpieczeniem.

## 7.7 Wyniki

Testy uruchomiłam 26 sierpnia 2026 na Node.js 24.13.0 pod Windows 11, w Vitest 2.1.9 i Playwright 1.62.1.

**Tabela 7.7: Wyniki uruchomienia testów – opracowanie własne**

| Poziom | Polecenie | Przypadki | Wynik | Czas |
|---|---|---|---|---|
| Jednostkowy + API | `npm test` w `backend` | 107 | 107 zaliczonych | 3,0 s |
| Jednostkowy + komponenty | `npm test` w `frontend` | 107 | 107 zaliczonych | 13,2 s |
| Row Level Security | `npm run test:rls` | 16 | pominięte | — |
| Systemowy | `npm run test:e2e` | 7 | pominięte | — |
| **Razem** | | **237** | **214 zaliczonych, 23 pominięte** | **16,2 s** |

Rozkład testów na pliki pokazuje tabela 7.8. Widać w nim kształt piramidy z podrozdziału 7.1: na dole 107 testów jednostkowych, na górze siedem ścieżek systemowych.

**Tabela 7.8: Rozkład testów na pliki – opracowanie własne**

| Poziom | Plik | Testy |
|---|---|---|
| Jednostkowy | `frontend/tests/unit/monument-price.test.ts` | 16 |
| Jednostkowy | `backend/tests/unit/http-helpers.test.js` | 16 |
| Jednostkowy | `frontend/tests/unit/safe-path.test.ts` | 15 |
| Jednostkowy | `frontend/tests/unit/i18n-context.test.tsx` | 10 |
| Jednostkowy | `backend/tests/unit/exchange-rate.test.js` | 10 |
| Jednostkowy | `frontend/tests/unit/photo-crop.test.ts` | 9 |
| Jednostkowy | `frontend/tests/unit/password-policy.test.ts` | 9 |
| Jednostkowy | `frontend/tests/unit/api-client.test.ts` | 9 |
| Jednostkowy | `frontend/tests/unit/currency.test.tsx` | 7 |
| Jednostkowy | `frontend/tests/unit/translations.test.ts` | 6 |
| API | `backend/tests/integration/auth.routes.test.js` | 20 |
| API | `backend/tests/integration/contact-and-public.test.js` | 17 |
| API | `backend/tests/integration/admin.test.js` | 14 |
| API | `backend/tests/integration/require-auth.test.js` | 11 |
| API | `backend/tests/integration/order-submit.test.js` | 10 |
| API | `backend/tests/integration/rate-limit.test.js` | 9 |
| Baza | `backend/tests/rls/policies.test.js` | 16 |
| Komponenty | `frontend/tests/components/designer-page.test.tsx` | 7 |
| Komponenty | `frontend/tests/components/protected-route.test.tsx` | 7 |
| Komponenty | `frontend/tests/components/catalog-page.test.tsx` | 6 |
| Komponenty | `frontend/tests/components/contact-form.test.tsx` | 6 |
| Systemowy | `frontend/tests/e2e/system.spec.ts` | 7 |

### 7.7.1 Testy pominięte

23 testy zostały pominięte, bo oba poziomy korzystające z prawdziwej bazy potrzebują więcej niż zwykłego komputera do pracy. Testy RLS zakładają i kasują prawdziwe konta oraz rekordy, więc włączają się dopiero po ustawieniu zmiennej `RLS_TEST_ENABLED` i wskazaniu testowego projektu Supabase. Ścieżki systemowe potrzebują uruchomionej aplikacji, serwera i bazy oraz kont montera i administratora założonych wcześniej.

Wynik należy więc czytać tak: 214 testów wykonanych i zaliczonych oraz 23 gotowe do uruchomienia w środowisku testowym. Do tego jeden test RLS jest oznaczony jako taki, który ma się nie udać, bo dokumentuje opisaną wyżej lukę. W pełnym środowisku wyjdzie z niego 15 zaliczonych i jeden nieudany, a nie 16 zaliczonych.

### 7.7.2 Błędy znalezione przez testy

Testy przydały się jeszcze zanim uruchomiłam cały zestaw, bo pokazały dwa błędy, których nie wychwyciłabym czytaniem kodu.

Pierwszy dotyczył samych testów komponentów. Na komputerze bez pliku konfiguracyjnego aplikacji klienckiej przechodziły, ale na moim, gdzie ten plik wskazuje adres uruchomionego serwera, 14 z 32 testów nie przechodziło — żądania omijały atrapy i leciały pod prawdziwy adres. Wynik testu zależał więc od ustawień komputera, wbrew zasadzie z podrozdziału 7.1. Naprawiłam to, wymuszając w konfiguracji testów pusty adres backendu.

Drugi wyszedł przy przypadku z tabeli 7.3, czyli materiale bez podanej ceny. Zakładałam, że funkcja pominie ten składnik i pokaże cenę niepełną, a okazało się, że zwraca wartość nieliczbową, która trafiłaby do interfejsu w miejsce kwoty. Błąd nie ujawniłby się przy normalnym korzystaniu, bo wszystkie materiały w katalogu mają cenę, ale wyszedłby przy pierwszym niekompletnym rekordzie. Dodałam sprawdzenie, czy cena jest liczbą.
