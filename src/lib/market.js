// Открыт ли рынок акций США (Mon-Fri 9:30–16:00 ET). Учитывает DST через Intl.
export function isUSMarketOpen() {
  try {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date())
    const g = (t) => p.find((x) => x.type === t)?.value
    const wd = g('weekday')
    if (wd === 'Sat' || wd === 'Sun') return false
    const mins = Number(g('hour')) * 60 + Number(g('minute'))
    return mins >= 570 && mins < 960
  } catch {
    return false
  }
}
