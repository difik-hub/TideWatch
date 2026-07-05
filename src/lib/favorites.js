// Избранное в localStorage

const KEY = 'tidewatch:favorites'

export function getFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export function saveFavorites(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]))
  window.dispatchEvent(new Event('tidewatch:state-changed'))
}

export function toggleFavorite(id) {
  const set = getFavorites()
  if (set.has(id)) set.delete(id)
  else set.add(id)
  saveFavorites(set)
  return set
}
