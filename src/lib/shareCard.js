// Генерация красивой картинки-сводки монеты для репоста (через canvas).
// Делится файлом (Web Share API) или скачивается. Это бесплатный канал роста.

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = (text || '').split(' ')
  let line = ''
  let lines = 0
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' '
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y)
      line = words[i] + ' '
      y += lineHeight
      if (++lines >= maxLines - 1) {
        // последняя строка — обрезаем с …
        let last = line
        while (ctx.measureText(last + '…').width > maxWidth && last.length) last = last.slice(0, -1)
        ctx.fillText((last + '…').trim(), x, y)
        return
      }
    } else {
      line = test
    }
  }
  ctx.fillText(line.trim(), x, y)
}

export async function shareCoinCard({ name, symbol, price, change, summary, fileName = 'tidewatch' }) {
  const W = 1200
  const H = 630
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')

  try { await document.fonts.ready } catch { /* шрифты не готовы — системный */ }

  // Фон
  ctx.fillStyle = '#0b0e14'
  ctx.fillRect(0, 0, W, H)
  // Свечение бренда
  const glow = ctx.createRadialGradient(W * 0.82, -40, 40, W * 0.82, -40, 680)
  glow.addColorStop(0, 'rgba(71,137,230,0.38)')
  glow.addColorStop(1, 'rgba(71,137,230,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  const up = (change ?? 0) >= 0
  const accent = '#6fa6f2'
  const move = up ? '#3fb27f' : '#e0606f'

  // Вордмарк
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 40px Geist, system-ui, sans-serif'
  ctx.fillStyle = '#e7eaf2'
  ctx.fillText('Tide', 64, 96)
  const tw = ctx.measureText('Tide').width
  ctx.fillStyle = accent
  ctx.fillText('Watch', 64 + tw, 96)

  // Монета
  ctx.font = '600 34px Geist, system-ui, sans-serif'
  ctx.fillStyle = '#8b93a7'
  ctx.fillText(`${name} · ${symbol?.toUpperCase()}`, 64, 210)

  // Цена
  ctx.font = '800 96px Geist, system-ui, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(price, 64, 310)

  // Изменение
  ctx.font = '600 40px Geist, system-ui, sans-serif'
  ctx.fillStyle = move
  ctx.fillText(`${up ? '▲' : '▼'} ${change > 0 ? '+' : ''}${(change ?? 0).toFixed(2)}% · 24h`, 64, 372)

  // Сводка
  ctx.font = '400 28px Geist, system-ui, sans-serif'
  ctx.fillStyle = '#c7cedb'
  wrapText(ctx, summary, 64, 452, W - 128, 42, 4)

  // Футер
  ctx.font = '500 24px Geist, system-ui, sans-serif'
  ctx.fillStyle = '#5b6479'
  ctx.fillText('tidewatch · крипторынок понятным языком', 64, H - 44)

  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'))
  if (!blob) return
  const file = new File([blob], `${fileName}.png`, { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }) } catch { /* отмена */ }
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.png`
    a.click()
    URL.revokeObjectURL(url)
  }
}
