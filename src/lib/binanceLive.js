// Реалтайм-цены через публичный Binance WebSocket (без ключа, бесплатно).
// Один общий стрим !miniTicker@arr — раз в секунду приходят все изменившиеся
// пары. Мы копим цены USDT-пар и отдаём подписчикам батчем (троттлинг),
// чтобы не перерисовывать сотню карточек каждую секунду (лаги в слабых браузерах).

const FLUSH_MS = 3000 // раз в 3 сек — плавно и дёшево

let ws = null
let started = false
let reconnectTimer = null
const pending = new Map() // SYMBOL (без USDT) -> price
const listeners = new Set()
let flushTimer = null

function flush() {
  flushTimer = null
  if (!pending.size) return
  const batch = new Map(pending)
  pending.clear()
  for (const cb of listeners) cb(batch)
}

function connect() {
  try {
    ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr')
  } catch {
    scheduleReconnect()
    return
  }

  ws.onmessage = (e) => {
    try {
      const arr = JSON.parse(e.data)
      if (!Array.isArray(arr)) return
      for (const t of arr) {
        const s = t.s // напр. BTCUSDT
        if (s && s.endsWith('USDT')) {
          pending.set(s.slice(0, -4), parseFloat(t.c))
        }
      }
      if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_MS)
    } catch {
      /* мусорный кадр — пропускаем */
    }
  }

  ws.onclose = scheduleReconnect
  ws.onerror = () => { try { ws.close() } catch { /* уже закрыт */ } }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, 5000)
}

// Подписка: cb(Map<SYMBOL, priceUsd>). Возвращает отписку.
export function subscribeLive(cb) {
  listeners.add(cb)
  if (!started) {
    started = true
    connect()
  }
  return () => listeners.delete(cb)
}
