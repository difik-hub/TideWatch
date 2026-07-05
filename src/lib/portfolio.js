// Портфель в localStorage (без сервера). Храним количество и цену покупки в USD.

const KEY = 'tidewatch:portfolio'

export function getPortfolio() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
  window.dispatchEvent(new Event('tidewatch:state-changed'))
}

export function addHolding(h) {
  const list = getPortfolio()
  list.push({ id: `${h.coinId}-${Date.now()}`, ...h })
  save(list)
  return list
}

export function removeHolding(id) {
  const list = getPortfolio().filter((h) => h.id !== id)
  save(list)
  return list
}
