# TickCal 🗓️

Prosty kalendarz z kolorowymi znacznikami. Działa w przeglądarce i na telefonie.

---

## Co robi aplikacja

- Wyświetla bieżący miesiąc (nawigacja ← → do innych miesięcy)
- Dzisiejszy dzień ma białe obramowanie
- Kliknięcie/tapnięcie w dzień dodaje kolorowy znacznik
- Ponowne tapnięcie tym samym kolorem usuwa znacznik
- 4 kolory do wyboru (żółty, niebieski, czerwony, zielony)
- Każdy kolor można opisać własną etykietą (dwuklik na nazwę w liczniku)
- Liczniki: **ile razy** dany kolor pojawił się w tym miesiącu · łącznie przez cały czas
- Dane zapisują się automatycznie w przeglądarce (localStorage)

---

## Wymagania

- [Node.js](https://nodejs.org/) w wersji **18 lub nowszej**
- Konto na [GitHub](https://github.com)
- Konto na [Vercel](https://vercel.com) — masz już ✓

---

## Uruchomienie lokalnie

```bash
# 1. Wejdź do folderu projektu
cd tickcal

# 2. Zainstaluj zależności
npm install

# 3. Uruchom serwer deweloperski
npm run dev
```

Otwórz w przeglądarce: **http://localhost:5173**

Żeby sprawdzić na telefonie (w tej samej sieci Wi-Fi):
```bash
npm run dev -- --host
```
Vite wyświetli adres `http://192.168.x.x:5173` — wpisz go na telefonie.

---

## Deployment na Vercel

### Metoda A — przez GitHub (polecana, aktualizacje automatycznie)

```bash
# 1. Zainicjuj repozytorium git
git init
git add .
git commit -m "init: tickcal"

# 2. Utwórz repo na GitHub
gh repo create tickcal --public --push --source=.
# (lub przez stronę github.com → New repository)
```

Potem na **vercel.com**:

1. Kliknij **Add New → Project**
2. Wybierz swoje repozytorium `tickcal`
3. Vercel automatycznie wykryje Vite — kliknij **Deploy**
4. Po ~30 sekundach dostaniesz link np. `tickcal-xyz.vercel.app`

Każdy `git push` → automatyczna aktualizacja na produkcji.

### Metoda B — Vercel CLI (bez GitHub)

```bash
# 1. Zainstaluj Vercel CLI globalnie
npm install -g vercel

# 2. Zaloguj się
vercel login

# 3. Deploy z folderu projektu
vercel --prod
```

---

## Struktura projektu

```
tickcal/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx        ← cała logika i UI kalendarza
│   ├── main.jsx       ← punkt wejścia React
│   └── index.css      ← globalne style + kolory
├── index.html
├── vite.config.js
├── vercel.json        ← konfiguracja routingu dla SPA
└── package.json
```

---

## Zmiana kolorów

W `src/App.jsx` znajdź tablicę `COLORS`:

```js
const COLORS = [
  { id: 1, key: "c1", hex: "#E8C547", defaultLabel: "Żółty" },
  { id: 2, key: "c2", hex: "#5B9BF0", defaultLabel: "Niebieski" },
  { id: 3, key: "c3", hex: "#F07373", defaultLabel: "Czerwony" },
  { id: 4, key: "c4", hex: "#6DCF8E", defaultLabel: "Zielony" },
];
```

Zmień `hex` i `defaultLabel` według potrzeb.

---

## Eksport / reset danych

Dane są w `localStorage` pod kluczem `tickcal_v1`.

Wyczyszczenie (w konsoli przeglądarki F12):
```js
localStorage.removeItem("tickcal_v1")
```

Eksport:
```js
console.log(localStorage.getItem("tickcal_v1"))
```

---

## Stos technologiczny

| Narzędzie | Po co |
|-----------|-------|
| React 19 | UI i stan |
| Vite 8 | bundler, dev server |
| Tailwind CSS 4 | style |
| localStorage | zapis danych w przeglądarce |

Brak backendu, brak bazy danych — wszystko lokalnie w przeglądarce.
