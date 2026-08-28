# Rozdziały 7–11 pracy — źródła LaTeX

## Pliki

| Plik | Zawartość |
|---|---|
| `rozdzial-7.tex` | `\chapter{Testy}` + `\input` podrozdziałów 7.1–7.7 |
| `7.1.tex` … `7.7.tex` | podrozdziały rozdziału 7 |
| `rozdzial-8.tex` | `\chapter{Prezentacja systemu}` + `\input` 8.1–8.6 |
| `8.1.tex` … `8.6.tex` | Rejestracja, Logowanie, Strona główna, Katalog, Panel konfiguracji, Panel administratora |
| `rozdzial-9.tex` | `\chapter{Wkład pracy}` + tabela podziału + `\input` 9.1–9.2 |
| `9.1.tex`, `9.2.tex` | Aliaksei Habrukovich, Alina Kopasava |
| `rozdzial-10.tex` | `\chapter{Podsumowanie}` + `\input` 10.1–10.2 |
| `10.1.tex`, `10.2.tex` | Wnioski, Plany na przyszłość |
| `rozdzial-11.tex` | `\chapter{Słownik pojęć}` — 25 haseł w otoczeniu `description` |
| `bibliografia.tex` | pusty, z komentarzem jak uzupełnić |
| `podglad.tex` | dokument pomocniczy do samodzielnej kompilacji |

## Włączenie do pracy

```latex
\input{rozdzial-7}
\input{rozdzial-8}
\input{rozdzial-9}
\input{rozdzial-10}
\input{rozdzial-11}
\input{bibliografia}
```

Ścieżki w `\input` są względne wobec katalogu głównego dokumentu. Jeśli pliki
leżą w podkatalogu, dopisz go: `\input{tex/rozdzial-8}`.

## Do zrobienia przed kompilacją

**1. Cztery odwołania do rozdziałów 5 i 6.** Rozdziały 9 i 10 odsyłają do
istniejących części pracy, których nie ma w tym archiwum. Trzeba wstawić
`\label` w rozdziałach 5 i 6 albo podmienić nazwy w moich plikach:

| Odwołanie | Gdzie użyte | Ma wskazywać na |
|---|---|---|
| `cha:projektowanie` | `rozdzial-9.tex` | rozdział 5 „Projektowanie systemu" |
| `sec:baza-danych` | `9.1.tex` | podrozdział 5.2 „Baza danych" |
| `sec:implementacja-backendu` | `9.1.tex` | podrozdział 6.1 „Implementacja backendu" |
| `sec:implementacja-frontendu` | `9.2.tex` | podrozdział 6.2 „Implementacja frontendu" |

**2. Zrzuty ekranu.** W plikach `8.x.tex` są gotowe otoczenia `figure`
z zakomentowanym `\includegraphics`. Po wgraniu obrazów do katalogu
`obrazy/` wystarczy odkomentować linię i poprawić nazwę pliku. Nazwy,
których użyłem: `prez-rejestracja`, `prez-logowanie`, `prez-strona-glowna`,
`prez-katalog`, `prez-konfigurator`, `prez-konfigurator-inskrypcja`,
`prez-panel-karty`, `prez-widok-montazowy`. Bez odkomentowania rozdział 8
kompiluje się poprawnie — będą same podpisy bez obrazków.

**3. Tabela podziału pracy** w `rozdzial-9.tex` to propozycja oparta na
strukturze aplikacji, nie na zapisie tego, kto co faktycznie robił.
Zweryfikujcie ją we dwoje przed oddaniem.

## Wymagania

Żadnych dodatkowych pakietów poza tym, czego rozdział 8 potrzebuje na
zrzuty ekranu (`graphicx`). Tabele używają `tabular` i `\hline`, wzór —
otoczenia `equation`, słownik — otoczenia `description`. Zakładane jest
kodowanie UTF-8 i obsługa polszczyzny (np. `babel` z opcją `polish`).

## Numeracja i odsyłacze

Numery rozdziałów, podrozdziałów i tabel nadaje LaTeX, więc kolejność
w pracy nie ma znaczenia. Wszystkie odwołania są przez `\ref`, nie wpisane
na sztywno. Odsyłacze wymagają dwóch przebiegów kompilacji.

## Uwaga

Plików nie skompilowano — na maszynie, na której powstały, nie ma
dystrybucji LaTeX-a. Sprawdzono statycznie: zgodność `\begin`/`\end`,
bilans nawiasów klamrowych, liczbę kolumn w każdym wierszu każdej tabeli
wobec deklaracji oraz kompletność etykiet dla `\ref` (poza czterema
wymienionymi wyżej, celowo zewnętrznymi). Pierwsza kompilacja u Was jest
nadal realną weryfikacją.
