# TymGol 2026 — Next.js

Dashboard MŚ 2026 z terminarzem i wynikami, symulatorem spotkań oraz kuponem analitycznym. Projekt jest przygotowany do wdrożenia na Vercel.

## Lokalnie

Wymagany jest Node.js 20 lub nowszy.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Otwórz `http://localhost:3000`.

## Deployment na Vercel

1. Umieść projekt w repozytorium GitHub.
2. Zaimportuj repozytorium w Vercel.
3. W `Settings → Environment Variables` dodaj `THE_ODDS_API_KEY`.
4. Wykonaj deployment.

API route pobiera pełny terminarz i wyniki MŚ 2026 z publicznego endpointu ESPN dla ligi `fifa.world`. Dane są odświeżane co 5 minut, a przycisk „Odśwież” pomija cache.

Kursy 1X2 pobierane są z The Odds API dopiero po wygenerowaniu kuponu. Odpowiedź jest przechowywana w cache przez 6 godzin, a symulator pojedynczego meczu nie korzysta z płatnego API. Jeden refresh kursów obejmuje tylko region `eu` i rynek `h2h`, aby oszczędzać limit.

## Model

Symulator wykorzystuje rozkład Poissona, bazową siłę drużyn, przewagę gospodarza i wyniki zakończonych spotkań. Estymacje nie gwarantują wyniku i nie są poradą finansową.
