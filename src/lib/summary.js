// Авто-сводка динамики на основе реальных цифр. Честный фактический текст,
// без инвестиционных рекомендаций. Поддержка 6 языков.

const PHRASES = {
  ru: {
    flat: 'почти без движения', slightUp: 'немного вырос', slightDown: 'немного снизился',
    notableUp: 'заметно вырос', notableDown: 'заметно снизился', sharpUp: 'резко вырос', sharpDown: 'резко упал',
    day: 'За сутки', week: 'За неделю', month: 'За месяц',
    nearAth: 'Цена держится у исторического максимума.',
    belowAth: 'От пика монета ниже на {v}%.',
    fromAth: 'До исторического максимума остаётся {v}%.',
    highVol: 'Высокая волатильность.', lowVol: 'Движений мало, рынок спокоен.',
  },
  en: {
    flat: 'barely moved', slightUp: 'edged up', slightDown: 'edged down',
    notableUp: 'rose', notableDown: 'fell', sharpUp: 'jumped', sharpDown: 'dropped',
    day: 'Past 24 hours', week: 'Past week', month: 'Past month',
    nearAth: 'Trading near its all-time high.',
    belowAth: 'Down {v}% from its peak.',
    fromAth: '{v}% below the all-time high.',
    highVol: 'Volatility is high.', lowVol: 'Little movement, the market is calm.',
  },
  it: {
    flat: 'quasi fermo', slightUp: 'in lieve rialzo', slightDown: 'in lieve calo',
    notableUp: 'in rialzo', notableDown: 'in calo', sharpUp: 'in forte rialzo', sharpDown: 'in forte calo',
    day: 'Nelle 24 ore', week: 'Sulla settimana', month: 'Sul mese',
    nearAth: 'Vicino al massimo storico.',
    belowAth: 'Sotto del {v}% dal picco.',
    fromAth: 'A {v}% dal massimo storico.',
    highVol: 'Volatilità elevata.', lowVol: 'Pochi movimenti, mercato calmo.',
  },
  de: {
    flat: 'kaum bewegt', slightUp: 'leicht gestiegen', slightDown: 'leicht gefallen',
    notableUp: 'gestiegen', notableDown: 'gefallen', sharpUp: 'stark gestiegen', sharpDown: 'stark gefallen',
    day: 'In 24 Stunden', week: 'In einer Woche', month: 'In einem Monat',
    nearAth: 'Notiert nahe dem Allzeithoch.',
    belowAth: '{v}% unter dem Höchststand.',
    fromAth: '{v}% unter dem Allzeithoch.',
    highVol: 'Hohe Volatilität.', lowVol: 'Wenig Bewegung, ruhiger Markt.',
  },
  fr: {
    flat: 'quasi stable', slightUp: 'en légère hausse', slightDown: 'en légère baisse',
    notableUp: 'en hausse', notableDown: 'en baisse', sharpUp: 'en forte hausse', sharpDown: 'en forte baisse',
    day: 'Sur 24 heures', week: 'Sur une semaine', month: 'Sur un mois',
    nearAth: 'Proche de son plus haut historique.',
    belowAth: 'En baisse de {v}% par rapport au pic.',
    fromAth: 'À {v}% du plus haut historique.',
    highVol: 'Volatilité élevée.', lowVol: 'Peu de mouvement, marché calme.',
  },
  es: {
    flat: 'casi sin cambios', slightUp: 'sube ligeramente', slightDown: 'baja ligeramente',
    notableUp: 'sube', notableDown: 'baja', sharpUp: 'sube con fuerza', sharpDown: 'baja con fuerza',
    day: 'En 24 horas', week: 'En una semana', month: 'En un mes',
    nearAth: 'Cerca de su máximo histórico.',
    belowAth: 'Un {v}% por debajo del pico.',
    fromAth: 'A {v}% del máximo histórico.',
    highVol: 'Alta volatilidad.', lowVol: 'Poco movimiento, mercado tranquilo.',
  },
}

function moveKey(pct) {
  const a = Math.abs(pct)
  if (a < 0.5) return 'flat'
  const up = pct > 0
  if (a < 3) return up ? 'slightUp' : 'slightDown'
  if (a < 10) return up ? 'notableUp' : 'notableDown'
  return up ? 'sharpUp' : 'sharpDown'
}

function fmt(n) {
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
}

export function buildSummary(market, lang = 'en') {
  if (!market) return ''
  const L = PHRASES[lang] || PHRASES.en
  const d1 = market.price_change_percentage_24h_in_currency ?? market.price_change_percentage_24h
  const d7 = market.price_change_percentage_7d_in_currency
  const d30 = market.price_change_percentage_30d_in_currency
  const parts = []

  if (d1 != null) parts.push(`${L.day}: ${L[moveKey(d1)]} (${fmt(d1)}).`)
  if (d7 != null) parts.push(`${L.week}: ${L[moveKey(d7)]} (${fmt(d7)}).`)
  if (d30 != null) parts.push(`${L.month}: ${fmt(d30)}.`)

  const { ath, current_price: price } = market
  if (ath && price) {
    const fromAth = ((price - ath) / ath) * 100
    if (fromAth > -3) parts.push(L.nearAth)
    else if (fromAth < -70) parts.push(L.belowAth.replace('{v}', Math.abs(fromAth).toFixed(0)))
    else parts.push(L.fromAth.replace('{v}', Math.abs(fromAth).toFixed(0)))
  }

  if (d1 != null && d7 != null) {
    const vol = (Math.abs(d1) + Math.abs(d7)) / 2
    if (vol > 10) parts.push(L.highVol)
    else if (vol < 1.5) parts.push(L.lowVol)
  }

  return parts.join(' ')
}

// Короткая характеристика для карточки в ленте
export function shortVibe(market, lang = 'en') {
  const L = PHRASES[lang] || PHRASES.en
  const d1 = market.price_change_percentage_24h_in_currency ?? market.price_change_percentage_24h
  if (d1 == null) return ''
  return L[moveKey(d1)]
}
