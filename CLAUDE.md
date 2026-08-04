# TideWatch

Крипто-трекер «лента»: реалтайм-цены, авто-сводки человеческим языком, портфель,
алерты. Плюс Telegram-бот и Mini App. Что умеет и как устроено — в [README.md](README.md).

Прод: https://tidewatchi.vercel.app · Бот: [@tiddewatchbot](https://t.me/tiddewatchbot)

## Команды

```powershell
npm run dev      # vite
npm run build
npm run preview
```

**Тестов нет** — в `package.json` нет скрипта `test`. Проверка = сборка + руки.

## Деплой

**Единственный проект с GitHub-ремоутом:** `difik-hub/TideWatch`.
Здесь `git push` работает и имеет смысл — Vercel собирает с гита.
(В остальных проектах ремоута нет, там только `vercel deploy`. Не путать.)

## Что важно знать перед правками

- **Папка называется `TideWatch`, а пакет — `crypto-tracker`.** Историческое имя,
  менять не нужно, но при поиске держать в голове.
- **Vercel Cron** в `vercel.json` дёргает `/api/digest` в 07:00 UTC (10:00 МСК) —
  ежедневная сводка. Единственный cron проекта.
- **Rewrites в `vercel.json`** заворачивают всё, кроме `/api/*`, на `index.html` (SPA).
  Новый API-роут попадёт под rewrite, если положить его мимо `api/`.
- `api/_ratelimit.js` — общий рейт-лимит для прокси. Новые публичные endpoint'ы
  обязаны через него проходить, иначе бесплатные тиры CoinGecko/FMP выгорят.
- Источники данных разведены по файлам: `cg.js` (CoinGecko), `fmp.js`, `td.js`,
  `news*.js`. Цены в реалтайме идут напрямую с Binance WebSocket, не через `api/`.
- **RLS для Supabase** лежит в `db/rls.sql`. Без регистрации всё живёт в
  localStorage — любой код с аккаунтами должен переживать «юзера нет».

## Монетизация

Отложена. План был: affiliate-баннеры + open source + донаты. Не начинать без спроса.
