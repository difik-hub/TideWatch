// Движок наблюдений: превращает сырые ряды цен в то, что человек сказал бы вслух.
//
// Зачем: лента «символ / цена / процент» есть у всех, и она требует, чтобы человек
// сам заметил закономерность. Здесь наоборот — считаем то, что обычно замечают
// глазами, и говорим прямо: этот вырос сильнее остальных, эти два рынка разошлись,
// у тебя позиция ушла в минус, по этой акции скоро отчёт.
//
// Каждое наблюдение проверяемо: рядом всегда стоит цифра, из которой оно выведено.
// Ничего не выдумываем и не советуем покупать — только называем факт.

const pct = (c) => c?.price_change_percentage_24h_in_currency ?? c?.price_change_percentage_24h ?? null
const pct7 = (c) => c?.price_change_percentage_7d_in_currency ?? null

function median(nums) {
  const a = nums.filter((n) => n != null && isFinite(n)).sort((x, y) => x - y)
  if (!a.length) return null
  const m = a.length >> 1
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

// Насколько актив выбился из общего движения: в разах от типичного отклонения.
// Медиана вместо среднего намеренно — одна улетевшая монета не должна задирать планку.
function outliers(list, limit = 3) {
  const vals = list.map(pct).filter((n) => n != null && isFinite(n))
  if (vals.length < 8) return []
  const mid = median(vals)
  const spread = median(vals.map((v) => Math.abs(v - mid))) || 1
  return list
    .map((c) => ({ c, d: pct(c), z: (pct(c) - mid) / spread }))
    .filter((x) => x.d != null && Math.abs(x.z) >= 3.5 && Math.abs(x.d) >= 4)
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    .slice(0, limit)
}

// list — крипта, stocks — акции, portfolio — [{row из portfolioCalc}]
// firedAlerts приходит снаружи, а не читается из localStorage: этот же движок
// работает на сервере в утренней сводке, где браузерного хранилища нет.
export function buildInsights({ coins = [], stocks = [], global = null, rows = [], calendar = {}, portfolioTotals = null, firedAlerts = [], t }) {
  const out = []
  const add = (o) => out.push(o)

  // ── 1. Что с портфелем: это касается человека лично, поэтому идёт первым ──
  const owned = rows.filter((r) => r.valueCur != null)
  for (const r of owned) {
    if (r.plPct != null && r.plPct <= -12) {
      add({
        id: `pf-down-${r.h.coinId}`, priority: 1, tone: 'down',
        title: t('insPfDown', { sym: (r.h.symbol || '').toUpperCase(), pct: Math.round(Math.abs(r.plPct)) }),
        body: t('insPfDownBody'),
        href: r.c?.href || null,
      })
    } else if (r.plPct != null && r.plPct >= 25) {
      add({
        id: `pf-up-${r.h.coinId}`, priority: 2, tone: 'up',
        title: t('insPfUp', { sym: (r.h.symbol || '').toUpperCase(), pct: Math.round(r.plPct) }),
        body: t('insPfUpBody'),
        href: r.c?.href || null,
      })
    }
  }

  // Отчёт по акции, которая реально лежит в портфеле
  for (const r of owned) {
    const sym = (r.h.symbol || '').toUpperCase()
    const e = calendar[sym]
    if (!e?.nextDate) continue
    const days = Math.round((new Date(`${e.nextDate}T00:00:00Z`) - Date.now()) / 86400_000)
    if (days >= 0 && days <= 10) {
      add({
        id: `pf-earn-${sym}`, priority: 1, tone: 'neutral',
        title: t('insEarnOwned', { sym, n: days }),
        body: e.of ? t('insEarnBeats', { b: e.beats, of: e.of }) : t('insEarnPlain'),
        href: `/stock/${sym}`,
      })
    }
  }

  // Сработавшие алерты: человек сам просил сказать ему об этом
  for (const a of firedAlerts) {
    if (!a?.triggered) continue
    add({
      id: `alert-${a.id}`, priority: 0, tone: 'neutral',
      title: t('evAlertFired', {
        sym: (a.symbol || '').toUpperCase(),
        dir: a.direction === 'above' ? t('alertAbove').toLowerCase() : t('alertBelow').toLowerCase(),
        val: a.targetDisplay,
      }),
      body: t('evAlertNote'),
    })
  }

  // Итог по портфелю за сутки — один общий вывод поверх отдельных позиций
  if (portfolioTotals?.value && portfolioTotals.change24 != null) {
    add({
      id: 'total-24', priority: 2,
      tone: portfolioTotals.change24 >= 0 ? 'up' : 'down',
      title: t('evPortfolio24', { pct: portfolioTotals.change24.toFixed(1) }),
      body: t('evPortfolioNote'),
    })
  }

  // ── 2. Два рынка: расходятся или идут вместе. Ради этого весь проект ──
  const cMed = median(coins.map(pct))
  const sMed = median(stocks.map(pct))
  if (cMed != null && sMed != null && Math.abs(cMed - sMed) >= 1.5) {
    const cryptoUp = cMed > sMed
    add({
      id: 'split', priority: 3, tone: 'neutral',
      title: cryptoUp ? t('insSplitCrypto') : t('insSplitStocks'),
      body: t('insSplitBody', { c: cMed.toFixed(1), s: sMed.toFixed(1) }),
      href: cryptoUp ? '/' : '/?tab=stocks',
    })
  }

  // ── 3. Кто выбился из общего движения ──
  for (const { c, d } of outliers(coins, 2)) {
    add({
      id: `out-${c.id}`, priority: 4, tone: d > 0 ? 'up' : 'down',
      title: t(d > 0 ? 'insOutUp' : 'insOutDown', { name: c.name, pct: Math.abs(d).toFixed(1) }),
      body: t('insOutBody', { med: (cMed ?? 0).toFixed(1) }),
      href: c.href || `/coin/${c.id}`,
    })
  }
  for (const { c, d } of outliers(stocks, 1)) {
    add({
      id: `out-${c.id}`, priority: 4, tone: d > 0 ? 'up' : 'down',
      title: t(d > 0 ? 'insOutUp' : 'insOutDown', { name: c.name, pct: Math.abs(d).toFixed(1) }),
      body: t('insOutStockBody', { med: (sMed ?? 0).toFixed(1) }),
      href: c.href || `/stock/${c.symbol}`,
    })
  }

  // ── 4. Акция у годового потолка или дна: редкое событие, о нём стоит сказать ──
  for (const s of stocks) {
    const hi = s.fifty_two_week?.high
    const lo = s.fifty_two_week?.low
    if (!hi || !lo || s.current_price == null || hi <= lo) continue
    const pos = ((s.current_price - lo) / (hi - lo)) * 100
    if (pos >= 98) {
      add({
        id: `hi-${s.id}`, priority: 5, tone: 'up',
        title: t('insAtHigh', { name: s.name }),
        body: t('insAtHighBody'),
        href: s.href || `/stock/${s.symbol}`,
      })
    } else if (pos <= 2) {
      add({
        id: `lo-${s.id}`, priority: 5, tone: 'down',
        title: t('insAtLow', { name: s.name }),
        body: t('insAtLowBody'),
        href: s.href || `/stock/${s.symbol}`,
      })
    }
  }

  // ── 5. Настроение рынка по индексу страха ──
  const fng = global?.fng != null ? Number(global.fng) : null
  if (fng != null) {
    if (fng <= 20) add({ id: 'fng-low', priority: 6, tone: 'down', title: t('insFearLow', { v: fng }), body: t('insFearLowBody') })
    else if (fng >= 78) add({ id: 'fng-high', priority: 6, tone: 'up', title: t('insFearHigh', { v: fng }), body: t('insFearHighBody') })
  }

  // ── 6. Стейблкоин отвязался от доллара: тихий, но важный сигнал ──
  for (const c of coins) {
    if (!/^(USDT|USDC|DAI|FDUSD|USDS|TUSD)$/i.test(c.symbol || '')) continue
    const d = pct(c)
    if (d != null && Math.abs(d) >= 0.7) {
      add({
        id: `peg-${c.id}`, priority: 2, tone: 'down',
        title: t('insPeg', { name: c.name, pct: Math.abs(d).toFixed(1) }),
        body: t('insPegBody'),
        href: c.href || `/coin/${c.id}`,
      })
    }
  }

  // ── 7. Оборот против размера: столько за сутки не наторговывают просто так ──
  for (const c of coins) {
    const vol = c.total_volume
    const cap = c.market_cap
    if (!vol || !cap || cap < 5e7) continue
    const ratio = vol / cap
    if (ratio >= 0.6 && Math.abs(pct(c) ?? 0) >= 2) {
      add({
        id: `vol-${c.id}`, priority: 4, tone: 'neutral',
        title: t('insVolume', { name: c.name, x: ratio.toFixed(1) }),
        body: t('insVolumeBody'),
        href: c.href || `/coin/${c.id}`,
      })
    }
  }

  // ── 8. Перекос портфеля: одна позиция решает судьбу всего капитала ──
  const totalValue = owned.reduce((s, r) => s + (r.valueCur || 0), 0)
  if (totalValue > 0 && owned.length > 1) {
    const top = [...owned].sort((a, b) => (b.valueCur || 0) - (a.valueCur || 0))[0]
    const share = ((top.valueCur || 0) / totalValue) * 100
    if (share >= 70) {
      add({
        id: 'skew', priority: 2, tone: 'neutral',
        title: t('insSkew', { sym: (top.h.symbol || '').toUpperCase(), pct: Math.round(share) }),
        body: t('insSkewBody'),
        href: top.c?.href || null,
      })
    }
  }

  // ── 9. Оба рынка в одну сторону: расходятся они чаще, чем идут вместе ──
  if (cMed != null && sMed != null && Math.abs(cMed - sMed) < 0.4 && Math.min(cMed, sMed) >= 1.2) {
    add({
      id: 'sync', priority: 3, tone: 'up',
      title: t('insSyncUp'),
      body: t('insSyncBody', { c: cMed.toFixed(1), s: sMed.toFixed(1) }),
    })
  } else if (cMed != null && sMed != null && Math.abs(cMed - sMed) < 0.4 && Math.max(cMed, sMed) <= -1.2) {
    add({
      id: 'sync', priority: 3, tone: 'down',
      title: t('insSyncDown'),
      body: t('insSyncBody', { c: cMed.toFixed(1), s: sMed.toFixed(1) }),
    })
  }

  // ── 10. Неделя против суток: разворот заметен только на двух горизонтах сразу ──
  const turned = coins
    .filter((c) => {
      const d = pct(c), w = pct7(c)
      return d != null && w != null && d >= 3 && w <= -8
    })
    .sort((a, b) => pct(b) - pct(a))
    .slice(0, 1)
  for (const c of turned) {
    add({
      id: `turn-${c.id}`, priority: 4, tone: 'up',
      title: t('insTurn', { name: c.name }),
      body: t('insTurnBody', { d: pct(c).toFixed(1), w: pct7(c).toFixed(1) }),
      href: c.href || `/coin/${c.id}`,
    })
  }

  // Чистим ленту двумя фильтрами.
  // По активу: иначе одна монета попадает и как выброс, и как разворот, и это
  // читается повтором. По типу: четыре карточки «у годового максимума» подряд
  // выглядят как отчёт робота, а не как рассказ о том, что происходит.
  const seenAsset = new Set()
  const perKind = new Map()
  return out
    .sort((a, b) => a.priority - b.priority)
    .filter((o) => {
      if (o.href) {
        if (seenAsset.has(o.href)) return false
        seenAsset.add(o.href)
      }
      const kind = String(o.id).split('-')[0]
      const n = perKind.get(kind) || 0
      if (n >= 2) return false
      perKind.set(kind, n + 1)
      return true
    })
    .slice(0, 8)
}
