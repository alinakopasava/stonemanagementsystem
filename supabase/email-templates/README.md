# Szablony wiadomości e-mail

Pliki w tym katalogu wkleja się w Supabase Dashboard → **Authentication → Emails →
Templates**, każdy w swoją zakładkę:

| plik | zakładka w Supabase |
|---|---|
| `confirm-signup.html` | **Confirm signup** |
| `reset-password.html` | **Reset Password** |

Wkleja się **całą zawartość pliku**, zastępując to, co jest w polu *Message body*,
i zapisuje przyciskiem **Save** — osobno dla każdej zakładki.

## Dlaczego tak, a nie ładniej w kodzie

- Układ opiera się na `<table>`, a style siedzą w atrybucie `style`. Outlook
  usuwa `<style>` z nagłówka, a Gmail ignoruje część reguł CSS, więc arkusz
  stylów w takiej wiadomości po prostu nie zadziała.
- Znak marki jest **tekstem, nie obrazkiem**. Nie trzeba go nigdzie hostować
  i widać go także wtedy, gdy odbiorca ma zablokowane wczytywanie obrazków,
  co Gmail i Outlook robią domyślnie.
- Pod przyciskiem powtórzony jest adres w formie tekstowej, bo część klientów
  pocztowych blokuje przyciski.

## Gdy zmiana nie widać w otrzymanym mailu

1. Sprawdź, czy zmieniona została **ta zakładka**, która odpowiada testowanemu
   przepływowi. Rejestracja to *Confirm signup*, odzyskiwanie hasła to
   *Reset Password*. To dwa niezależne szablony.
2. Sprawdź, czy po wklejeniu wciśnięto **Save**. Dashboard nie zapisuje sam,
   a przejście do innej zakładki gubi zmiany bez ostrzeżenia.
3. Sprawdź **datę wiadomości** w skrzynce. Maile wysłane przed zmianą zostają
   w starej postaci, a przy powtórnej rejestracji tego samego adresu Supabase
   może nie wysłać nowego.
4. Sprawdź, czy projekt nie korzysta z **Auth Hooks (Send Email Hook)**. Gdy hook
   jest włączony, Supabase pomija szablony i wysyła to, co zwróci hook.
5. Wbudowany nadawca Supabase jest przeznaczony do testów i ma ostry limit
   wysyłek na godzinę. Po jego przekroczeniu wiadomość nie dociera wcale —
   to nie jest problem z szablonem.
