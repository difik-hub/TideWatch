// Форматирование чисел под человеческий вид, с учётом валюты.

const SYM = { usd: '$', eur: '€', rub: '₽' }
// usd/eur — символ перед числом, rub — после
const SUFFIX = { rub: true }

function wrap(num, currency) {
  const sym = SYM[currency] || '$'
  return SUFFIX[currency] ? `${num} ${sym}` : `${sym}${num}`
}

export function formatPrice(n, currency = 'usd') {
  if (n == null || isNaN(n)) return '—'
  let digits
  if (n >= 1000) digits = 0       // крупные суммы — без копеек
  else if (n >= 1) digits = 2
  else if (n >= 0.01) digits = 4
  else digits = 8
  const num = n.toLocaleString('en-US', { maximumFractionDigits: digits })
  return wrap(num, currency)
}

export function formatBig(n, currency = 'usd') {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  let num
  if (abs >= 1e12) num = (n / 1e12).toFixed(2) + 'T'
  else if (abs >= 1e9) num = (n / 1e9).toFixed(2) + 'B'
  else if (abs >= 1e6) num = (n / 1e6).toFixed(2) + 'M'
  else if (abs >= 1e3) num = (n / 1e3).toFixed(2) + 'K'
  else num = n.toFixed(0)
  return wrap(num, currency)
}

export function formatNum(n) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function formatPct(n) {
  if (n == null || isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return sign + n.toFixed(2) + '%'
}

// Пересчёт цены из базовой валюты в целевую через курсы (единиц за 1 BTC)
export function convertPrice(priceBase, baseCur, targetCur, rates) {
  if (priceBase == null || !rates) return null
  if (baseCur === targetCur) return priceBase
  const from = rates[baseCur]
  const to = rates[targetCur]
  if (!from || !to) return null
  return priceBase * (to / from)
}

export function trendOf(n) {
  if (n == null || isNaN(n)) return 'flat'
  if (n > 0) return 'rise'
  if (n < 0) return 'fall'
  return 'flat'
}
