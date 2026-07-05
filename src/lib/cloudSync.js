import { supabase } from './supabase'

// Синхронизация локального состояния (избранное/портфель/алерты/настройки)
// с облаком. Одна строка на юзера, jsonb-поля. Гостевой режим не трогаем.

const KEYS = {
  favorites: 'tidewatch:favorites',
  portfolio: 'tidewatch:portfolio',
  alerts: 'tidewatch:alerts',
  settings: 'tidewatch:settings',
}

function readLocal() {
  const out = {}
  for (const [col, key] of Object.entries(KEYS)) {
    try {
      out[col] = JSON.parse(localStorage.getItem(key) || (col === 'settings' ? '{}' : '[]'))
    } catch {
      out[col] = col === 'settings' ? {} : []
    }
  }
  return out
}

function writeLocal(row) {
  for (const [col, key] of Object.entries(KEYS)) {
    if (row[col] != null) localStorage.setItem(key, JSON.stringify(row[col]))
  }
}

function cloudHasData(row) {
  return (
    (row.favorites?.length || 0) > 0 ||
    (row.portfolio?.length || 0) > 0 ||
    (row.alerts?.length || 0) > 0 ||
    Object.keys(row.settings || {}).length > 0
  )
}

// Заливка локального состояния в облако
export async function pushToCloud(userId) {
  const local = readLocal()
  await supabase.from('user_state').upsert({ user_id: userId, ...local, updated_at: new Date().toISOString() })
}

// При входе: облако не пустое → тянем его в localStorage; пустое → пушим локальное.
// Возвращает true, если локальные данные заменены облачными (нужен reload UI).
export async function syncOnLogin(userId) {
  const { data } = await supabase.from('user_state').select('*').eq('user_id', userId).maybeSingle()
  if (data && cloudHasData(data)) {
    writeLocal(data)
    return true
  }
  await pushToCloud(userId)
  return false
}

// Дебаунс-пуш при любом изменении состояния
let timer = null
export function schedulePush(userId) {
  clearTimeout(timer)
  timer = setTimeout(() => pushToCloud(userId).catch(() => {}), 1500)
}
