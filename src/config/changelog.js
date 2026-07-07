// Наш чейнджлог — новости о продукте (обновления TideWatch), новые сверху.
// Тексты двуязычные (ru/en), остальные языки — фолбэк на en в News.jsx.
// tag: feature | improve | fix
export const CHANGELOG = [
  {
    date: '2026-07-06',
    tag: 'feature',
    emoji: '📈',
    title: { ru: 'Акции и смешанный портфель', en: 'Stocks & mixed portfolio' },
    text: {
      ru: 'Появилась вкладка «Акции»: цены, графики, страница компании. Портфель теперь считает крипту и акции вместе — общий P/L на одном экране.',
      en: 'New Stocks tab: prices, charts, company pages. Your portfolio now tracks crypto and stocks together — combined P/L on one screen.',
    },
  },
  {
    date: '2026-07-06',
    tag: 'feature',
    emoji: '💬',
    title: { ru: 'Telegram Mini App', en: 'Telegram Mini App' },
    text: {
      ru: 'TideWatch открывается прямо внутри Telegram — через бота @tiddewatchbot и кнопку меню. Рынок всегда под рукой в мессенджере.',
      en: 'TideWatch now opens right inside Telegram — via @tiddewatchbot and the menu button. The market is always at hand in your messenger.',
    },
  },
  {
    date: '2026-07-06',
    tag: 'improve',
    emoji: '🧭',
    title: { ru: 'Подсказки новичкам и «Где купить»', en: 'Onboarding & “Where to buy”' },
    text: {
      ru: 'Добавили быстрый онбординг для новых пользователей и кнопки «Где купить» на страницах монет.',
      en: 'Added a quick onboarding hint for newcomers and “Where to buy” links on coin pages.',
    },
  },
  {
    date: '2026-07-05',
    tag: 'feature',
    emoji: '⚡',
    title: { ru: 'Цены в реальном времени', en: 'Real-time prices' },
    text: {
      ru: 'Курсы криптовалют теперь обновляются вживую через Binance WebSocket — цена мигает при каждом изменении.',
      en: 'Crypto prices now update live via Binance WebSocket — the price flashes on every change.',
    },
  },
  {
    date: '2026-07-04',
    tag: 'feature',
    emoji: '📱',
    title: { ru: 'PWA и Telegram-бот', en: 'PWA & Telegram bot' },
    text: {
      ru: 'TideWatch можно установить как приложение (PWA). Запустили Telegram-бота @tiddewatchbot с рыночными сводками.',
      en: 'TideWatch is now installable as an app (PWA). Launched the @tiddewatchbot Telegram bot with market summaries.',
    },
  },
  {
    date: '2026-07-03',
    tag: 'feature',
    emoji: '☁️',
    title: { ru: 'Аккаунты и облачная синхронизация', en: 'Accounts & cloud sync' },
    text: {
      ru: 'Избранное, портфель и алерты синхронизируются между устройствами, если войти в аккаунт.',
      en: 'Favorites, portfolio and alerts now sync across devices when you sign in.',
    },
  },
  {
    date: '2026-07-02',
    tag: 'improve',
    emoji: '🌍',
    title: { ru: '6 языков, темы и валюты', en: '6 languages, themes & currencies' },
    text: {
      ru: 'Интерфейс на 6 языках, тёмная/светлая тема, цены в USD/EUR/RUB. Тепловая карта, конвертер, сравнение монет.',
      en: 'Interface in 6 languages, dark/light theme, prices in USD/EUR/RUB. Plus heatmap, converter and coin comparison.',
    },
  },
]
