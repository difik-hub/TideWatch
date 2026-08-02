-- Алерты, которые приходят в Telegram. Применить в Supabase → SQL Editor (один раз).
--
-- Зачем: браузерные уведомления работают только пока открыта вкладка, то есть
-- по факту не работают. Здесь алерт живёт на сервере, цену сверяет планировщик,
-- а сообщение приходит в Telegram даже с закрытым браузером.
--
-- Связка без регистрации: сайт генерирует случайный токен, кладёт его себе в
-- localStorage и открывает бота ссылкой /start <токен>. Бот дописывает к этой
-- строке chat_id. Дальше токен и есть удостоверение владельца алертов.

-- ─────────────────────────────────────────────────────────────────────────
-- tg_subs: связка «токен сайта → чат в Telegram»
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.tg_subs (
  token      text primary key,
  chat_id    bigint,
  created_at timestamptz not null default now(),
  linked_at  timestamptz
);

create index if not exists tg_subs_chat_idx on public.tg_subs (chat_id);

-- ─────────────────────────────────────────────────────────────────────────
-- tg_alerts: сами алерты. asset_id — id монеты в CoinGecko либо тикер акции.
-- Цель всегда в USD: у планировщика нет валюты пользователя.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.tg_alerts (
  id         bigserial primary key,
  token      text not null references public.tg_subs(token) on delete cascade,
  kind       text not null default 'crypto',   -- crypto | stock
  asset_id   text not null,
  symbol     text not null,
  name       text,
  direction  text not null,                    -- above | below
  target_usd double precision not null,
  created_at timestamptz not null default now(),
  fired_at   timestamptz                       -- null = ждёт срабатывания
);

-- Планировщик каждый раз просит именно ждущие алерты — под это и индекс
create index if not exists tg_alerts_pending_idx on public.tg_alerts (token) where fired_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Доступ: обе таблицы только для сервера под service_key (он обходит RLS).
-- Политик не создаём намеренно → для anon и authenticated таблицы закрыты.
-- Это важно: anon-ключ лежит в бандле сайта, любой мог бы читать чужие chat_id.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.tg_subs   enable row level security;
alter table public.tg_alerts enable row level security;

-- Проверка: обе строки должны показать rowsecurity = true
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('tg_subs', 'tg_alerts');
