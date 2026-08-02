// Лента событий по позициям пользователя. Новых источников данных не требует:
// собирается из того, что уже есть — сработавшие алерты, движение позиций,
// суточная дельта портфеля. Это ядро экрана «Обзор» и будущей утренней сводки.

import { getAlerts } from './alerts'

// Порог, ниже которого движение позиции не считается событием: иначе лента
// превращается в шум из ±0.3% по каждой монете.
const MOVE_PCT = 2

export function buildEvents(rows, totals, t) {
  const events = []

  // 1. Сработавшие алерты — самое важное, всегда сверху
  for (const a of getAlerts()) {
    if (!a.triggered) continue
    events.push({
      id: `alert-${a.id}`,
      at: a.createdAt || 0,
      kind: 'alert',
      title: t('evAlertFired', {
        sym: (a.symbol || '').toUpperCase(),
        dir: a.direction === 'above' ? t('alertAbove').toLowerCase() : t('alertBelow').toLowerCase(),
        val: a.targetDisplay,
      }),
      note: t('evAlertNote'),
    })
  }

  // 2. Заметные движения позиций за сутки
  for (const r of rows) {
    if (r.d24 == null || Math.abs(r.d24) < MOVE_PCT || !r.c) continue
    const share = totals.value ? Math.round(((r.valueCur || 0) / totals.value) * 100) : 0
    events.push({
      id: `move-${r.h.id}`,
      at: Date.now() - Math.abs(r.d24) * 1000, // крупные движения выше в пределах группы
      kind: r.d24 >= 0 ? 'up' : 'down',
      title: t('evMoved', { sym: (r.c.symbol || '').toUpperCase(), pct: r.d24.toFixed(1) }),
      note: share >= 20 ? t('evBigShare', { share }) : t('evShare', { share }),
    })
  }

  // 3. Итог по портфелю за сутки — один общий вывод
  if (totals.value && totals.change24 != null) {
    events.push({
      id: 'total-24',
      at: 0,
      kind: totals.change24 >= 0 ? 'up' : 'down',
      title: t('evPortfolio24', { pct: totals.change24.toFixed(1) }),
      note: t('evPortfolioNote'),
    })
  }

  const order = { alert: 0, down: 1, up: 2 }
  return events.sort((a, b) => (order[a.kind] - order[b.kind]) || (b.at - a.at)).slice(0, 12)
}
