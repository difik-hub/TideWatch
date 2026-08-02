// Расчёт портфеля: стоимость, прибыль, вес позиций. Вынесен из компонента,
// потому что теперь портфель считают двое — экран «Обзор» и панель портфеля.
// Крипта приходит в валюте пользователя, акции всегда в USD: приводим к общей.

import { convertPrice, trendOf } from './format'

// list  — позиции из localStorage, byId — карта активов рынка (крипта + акции)
export function computeRows(list, byId, rates, currency) {
  const toUsd = (v) => (rates ? convertPrice(v, currency, 'usd', rates) : v)
  const toCur = (v) => (rates ? convertPrice(v, 'usd', currency, rates) : v)

  return list.map((h) => {
    const c = byId[h.coinId]
    const priceUsd = c ? (c.kind === 'stock' ? c.current_price : toUsd(c.current_price)) : null
    const valueUsd = priceUsd != null ? priceUsd * h.amount : null
    const costUsd = h.buyPriceUsd != null ? h.buyPriceUsd * h.amount : null
    const plUsd = valueUsd != null && costUsd != null ? valueUsd - costUsd : null
    const d24 = c ? (c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h) : null
    return {
      h,
      c,
      d24,
      // Рынок берём из самой позиции: если актив не пришёл (лимит FMP, закрытая
      // сессия), акция иначе показалась бы криптой. Живые данные важнее только
      // когда они есть.
      kind: c ? (c.kind === 'stock' ? 'stock' : 'crypto') : (h.kind === 'stock' ? 'stock' : 'crypto'),
      valueCur: valueUsd != null ? toCur(valueUsd) : null,
      plCur: plUsd != null ? toCur(plUsd) : null,
      plPct: costUsd ? (plUsd / costUsd) * 100 : null,
    }
  })
}

// Итоги: стоимость, прибыль, изменение за сутки и доли двух рынков.
// Изменение за сутки взвешено по стоимости позиции: иначе мелкая позиция с
// большим процентом искажала бы картину сильнее крупной.
export function totals(rows) {
  const value = rows.reduce((s, r) => s + (r.valueCur || 0), 0)
  const pl = rows.reduce((s, r) => s + (r.plCur || 0), 0)
  const cryptoValue = rows.reduce((s, r) => s + (r.kind === 'crypto' ? r.valueCur || 0 : 0), 0)
  const stockValue = value - cryptoValue
  const weighted = rows.reduce((s, r) => s + (r.valueCur && r.d24 != null ? r.valueCur * r.d24 : 0), 0)

  const cost = rows.reduce((s, r) => {
    if (r.valueCur == null || r.plCur == null) return s
    return s + (r.valueCur - r.plCur)
  }, 0)

  return {
    value,
    pl,
    plPct: cost ? (pl / cost) * 100 : null,
    change24: value ? weighted / value : null,
    change24Abs: value ? (weighted / 100) : null,
    cryptoShare: value ? (cryptoValue / value) * 100 : 0,
    stockShare: value ? (stockValue / value) * 100 : 0,
    trend: trendOf(pl),
  }
}
