# 🌊 TideWatch

**Крипторынок понятным языком.** Личный дежурный по рынкам: один экран — цены в реальном времени, живые сводки человеческим языком, портфель, алерты. Без регистрации.

**Live: https://tidewatchi.vercel.app** · Telegram-бот: [@tiddewatchbot](https://t.me/tiddewatchbot)

![TideWatch](public/avatar/og.png)

## Фичи
- ⚡ **Реалтайм-цены** — Binance WebSocket, тики каждые 3 секунды
- 🗣 **Авто-сводки понятным языком** — «что происходит с рынком» и с каждой монетой (6 языков)
- 📊 Таблица топ-монет, тепловая карта, сравнение монет, конвертер
- ⭐ Избранное, 💼 портфель с P/L, 🔔 алерты на цену — работают без регистрации (localStorage), с аккаунтом синхронизируются между устройствами (Supabase)
- 🌗 Тёмная/светлая тема, RU/EN/IT/DE/FR/ES, валюты USD/EUR/RUB
- 📱 PWA — ставится как приложение; работает как Telegram Mini App

## Стек
React 18 · Vite · Tailwind CSS v4 · Recharts · GSAP · Supabase (auth+sync) · Vercel (hosting + serverless: кеш-прокси CoinGecko, Telegram-бот)

## Запуск
```bash
npm install
npm run dev   # http://localhost:4321
```

## Данные
Рыночные данные — [CoinGecko](https://www.coingecko.com) (через кеш-прокси), реалтайм — Binance WS, индекс страха и жадности — alternative.me. TideWatch показывает рыночные данные и не является финансовым советом.

## Лицензия
MIT
