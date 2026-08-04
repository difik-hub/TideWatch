// Технический сигнал по истории цен: куда смотрит тренд прямо сейчас.
//
// Честная рамка: это НЕ предсказание цены. Целевых цен аналитиков в бесплатных
// источниках нет, а выдумывать «вырастет на 12%» — обман. Поэтому считаем то,
// что реально следует из данных: положение цены относительно своих средних,
// импульс и место в годовом диапазоне. Каждый пункт вердикта показывается
// пользователю строкой, чтобы вывод можно было проверить, а не верить на слово.

const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null)

// prices — цены по возрастанию времени (последняя = текущая)
// range52 — { low, high } годовой диапазон, если известен
export function forecast(prices, range52 = null) {
  const clean = (prices || []).filter((v) => typeof v === 'number' && isFinite(v) && v > 0)
  if (clean.length < 8) return null

  const price = clean[clean.length - 1]
  // Короткая и длинная средние: доли ряда, а не фиксированные числа — ряд бывает
  // и часовым (крипта, неделя), и дневным (акции, месяц).
  const shortN = Math.max(3, Math.round(clean.length * 0.2))
  const longN = Math.max(6, Math.round(clean.length * 0.6))
  const maShort = avg(clean.slice(-shortN))
  const maLong = avg(clean.slice(-longN))

  const signals = []
  let score = 0

  if (maShort != null && maLong != null) {
    if (price > maShort) { score += 1; signals.push({ key: 'fcAboveShort', good: true }) }
    else { score -= 1; signals.push({ key: 'fcBelowShort', good: false }) }

    if (maShort > maLong) { score += 1.5; signals.push({ key: 'fcShortAboveLong', good: true }) }
    else { score -= 1.5; signals.push({ key: 'fcShortBelowLong', good: false }) }
  }

  // Импульс: изменение за отрезок, сопоставимый с короткой средней
  const past = clean[Math.max(0, clean.length - 1 - shortN)]
  const momentum = past ? ((price - past) / past) * 100 : null
  if (momentum != null) {
    if (momentum > 3) { score += 1; signals.push({ key: 'fcMomentumUp', good: true, v: momentum.toFixed(1) }) }
    else if (momentum < -3) { score -= 1; signals.push({ key: 'fcMomentumDown', good: false, v: momentum.toFixed(1) }) }
    else signals.push({ key: 'fcMomentumFlat', good: null, v: momentum.toFixed(1) })
  }

  // Место в годовом диапазоне: у самого потолка риск отката выше, у дна — запас
  let pos = null
  if (range52?.low != null && range52?.high != null && range52.high > range52.low) {
    pos = ((price - range52.low) / (range52.high - range52.low)) * 100
    if (pos > 85) { score -= 0.5; signals.push({ key: 'fcNearHigh', good: false, v: Math.round(pos) }) }
    else if (pos < 20) { score += 0.5; signals.push({ key: 'fcNearLow', good: true, v: Math.round(pos) }) }
    else signals.push({ key: 'fcMidRange', good: null, v: Math.round(pos) })
  }

  const verdict = score >= 1.5 ? 'up' : score <= -1.5 ? 'down' : 'flat'
  return { verdict, score: Math.round(score * 10) / 10, signals, momentum, pos }
}
