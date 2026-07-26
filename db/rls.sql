-- RLS-политики TideWatch. Применить в Supabase → SQL Editor (один раз).
-- Зачем: anon-ключ ПУБЛИЧЕН (лежит в бандле сайта). Без RLS любой человек из
-- консоли браузера прочитает/перезапишет чужие данные. RLS — единственная защита.

-- ─────────────────────────────────────────────────────────────────────────
-- user_state: избранное/портфель/алерты/настройки. Одна строка на юзера.
-- Юзер имеет доступ ТОЛЬКО к своей строке (auth.uid() = user_id).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.user_state enable row level security;

drop policy if exists "own row select" on public.user_state;
drop policy if exists "own row insert" on public.user_state;
drop policy if exists "own row update" on public.user_state;

create policy "own row select" on public.user_state
  for select using (auth.uid() = user_id);

create policy "own row insert" on public.user_state
  for insert with check (auth.uid() = user_id);

create policy "own row update" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DELETE-политики нет намеренно: приложение строки не удаляет → delete запрещён
-- (минимум привилегий). Понадобится — добавить отдельную политику.

-- ─────────────────────────────────────────────────────────────────────────
-- posted_news: память бота (какие новости уже постили). Пишет/читает ТОЛЬКО
-- сервер под service_key, который обходит RLS. Публичного доступа быть не должно.
-- Включаем RLS без единой политики → для anon/authenticated таблица закрыта.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.posted_news enable row level security;

drop policy if exists "public read" on public.posted_news;   -- на случай, если была открыта
drop policy if exists "public write" on public.posted_news;

-- ─────────────────────────────────────────────────────────────────────────
-- Проверка: обе таблицы должны показать rowsecurity = true.
-- ─────────────────────────────────────────────────────────────────────────
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('user_state', 'posted_news');
