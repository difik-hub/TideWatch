// Авто-сводка всего рынка понятным языком — главный «крючок» платформы.
// Честный текст из реальных цифр (capitalization change, breadth, доминация, топ-мувер).

const MS = {
  ru: {
    strongUp: 'Рынок уверенно растёт', up: 'Рынок в небольшом плюсе', flat: 'Рынок спокоен',
    down: 'Рынок под лёгким давлением', strongDown: 'Рынок заметно проседает',
    capUp: 'капитализация выросла на', capDown: 'капитализация упала на', capFlat: 'капитализация почти не изменилась',
    perDay: 'за сутки', breadth: (u, n) => `в плюсе ${u} из ${n} монет топа`,
    dom: (d) => `доминация биткоина ${d}%`, top: (s, p) => `сильнее всех ${s} (${p})`,
  },
  en: {
    strongUp: 'The market is climbing', up: 'The market is slightly up', flat: 'The market is calm',
    down: 'The market is under mild pressure', strongDown: 'The market is sliding',
    capUp: 'total cap rose by', capDown: 'total cap fell by', capFlat: 'total cap barely moved',
    perDay: 'over 24h', breadth: (u, n) => `${u} of ${n} top coins in the green`,
    dom: (d) => `bitcoin dominance ${d}%`, top: (s, p) => `${s} leads (${p})`,
  },
  it: {
    strongUp: 'Il mercato sale con forza', up: 'Il mercato è in lieve rialzo', flat: 'Il mercato è tranquillo',
    down: 'Il mercato è sotto leggera pressione', strongDown: 'Il mercato scende',
    capUp: 'la capitalizzazione è salita del', capDown: 'la capitalizzazione è scesa del', capFlat: 'la capitalizzazione è quasi invariata',
    perDay: 'nelle 24h', breadth: (u, n) => `${u} su ${n} monete in positivo`,
    dom: (d) => `dominanza bitcoin ${d}%`, top: (s, p) => `in testa ${s} (${p})`,
  },
  de: {
    strongUp: 'Der Markt steigt deutlich', up: 'Der Markt liegt leicht im Plus', flat: 'Der Markt ist ruhig',
    down: 'Der Markt steht unter leichtem Druck', strongDown: 'Der Markt gibt nach',
    capUp: 'Marktkapitalisierung stieg um', capDown: 'Marktkapitalisierung fiel um', capFlat: 'Marktkapitalisierung kaum verändert',
    perDay: 'in 24 Std.', breadth: (u, n) => `${u} von ${n} Coins im Plus`,
    dom: (d) => `Bitcoin-Dominanz ${d}%`, top: (s, p) => `vorne ${s} (${p})`,
  },
  fr: {
    strongUp: 'Le marché grimpe', up: 'Le marché est en léger hausse', flat: 'Le marché est calme',
    down: 'Le marché est sous légère pression', strongDown: 'Le marché recule',
    capUp: 'la capitalisation a progressé de', capDown: 'la capitalisation a reculé de', capFlat: 'la capitalisation est quasi stable',
    perDay: 'sur 24h', breadth: (u, n) => `${u} sur ${n} en hausse`,
    dom: (d) => `dominance bitcoin ${d}%`, top: (s, p) => `en tête ${s} (${p})`,
  },
  es: {
    strongUp: 'El mercado sube con fuerza', up: 'El mercado está ligeramente en verde', flat: 'El mercado está tranquilo',
    down: 'El mercado está bajo leve presión', strongDown: 'El mercado cae',
    capUp: 'la capitalización subió un', capDown: 'la capitalización bajó un', capFlat: 'la capitalización apenas cambió',
    perDay: 'en 24h', breadth: (u, n) => `${u} de ${n} monedas en verde`,
    dom: (d) => `dominancia bitcoin ${d}%`, top: (s, p) => `lidera ${s} (${p})`,
  },
}

export function buildMarketSummary(global, coins, lang = 'en') {
  const L = MS[lang] || MS.en
  if (!global) return ''
  const ch = global.market_cap_change_percentage_24h_usd
  const btcDom = global.market_cap_percentage?.btc

  // Настроение
  let mood = L.flat
  if (ch != null) {
    if (ch > 2.5) mood = L.strongUp
    else if (ch > 0.3) mood = L.up
    else if (ch < -2.5) mood = L.strongDown
    else if (ch < -0.3) mood = L.down
  }

  // Капитализация
  let capPart = ''
  if (ch != null) {
    const a = Math.abs(ch).toFixed(1) + '%'
    capPart = ch > 0.3 ? `${L.capUp} ${a}` : ch < -0.3 ? `${L.capDown} ${a}` : L.capFlat
  }

  // Breadth + топ-мувер из загруженных монет
  const parts = []
  if (coins?.length) {
    let up = 0
    let best = null
    for (const c of coins) {
      const d = c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h
      if (d > 0) up++
      if (d != null && (!best || d > best.d)) best = { sym: c.symbol?.toUpperCase(), d }
    }
    parts.push(L.breadth(up, coins.length))
    if (best && best.d > 0) {
      const p = '+' + best.d.toFixed(1) + '%'
      parts.push(L.top(best.sym, p))
    }
  }
  if (btcDom != null) parts.unshift(L.dom(btcDom.toFixed(1)))

  // Сборка: «Настроение: капитализация …, доминация …, в плюсе …, лидер …»
  const head = capPart ? `${mood}: ${capPart} ${L.perDay}.` : `${mood}.`
  return parts.length ? `${head} ${cap1(parts.join(', '))}.` : head
}

function cap1(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
