// Алерты, которые приходят в Telegram: связка с ботом и список правил.
// Схема — db/tg-alerts.sql, доступ к базе — src/lib/alertStore.js.
//
// Токен, который присылает браузер, и есть удостоверение владельца: регистрации
// нет намеренно, иначе половина людей отвалится на форме. Токен лежит у человека
// в localStorage, знать его может только он.
//
// GET  /api/alerts?a=status&token=…  → { linked, chatLinked, alerts: [...] }
// POST /api/alerts?a=init            → завести токен перед переходом в бота
// POST /api/alerts?a=add             → добавить правило
// POST /api/alerts?a=del             → снять правило

import { allow } from './_ratelimit.js'
import { hasStore, validToken, createSub, getSub, listAlerts, addAlert, deleteAlert } from '../src/lib/alertStore.js'

const KINDS = new Set(['crypto', 'stock'])
const DIRECTIONS = new Set(['above', 'below'])

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!(await allow(req, 'alerts', 60, 60))) { res.status(429).json({ error: 'rate limited' }); return }
  if (!hasStore()) { res.status(503).json({ error: 'store not configured' }); return }

  const u = new URL(req.url, 'http://localhost')
  const action = u.searchParams.get('a') || 'status'
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {})
  const token = String(u.searchParams.get('token') || body.token || '')

  if (!validToken(token)) { res.status(400).json({ error: 'bad token' }); return }

  try {
    if (req.method === 'GET' || action === 'status') {
      const sub = await getSub(token)
      if (!sub) { res.status(200).json({ known: false, chatLinked: false, alerts: [] }); return }
      const alerts = (await listAlerts(token)) ?? []
      res.status(200).json({ known: true, chatLinked: sub.chat_id != null, alerts })
      return
    }

    if (action === 'init') {
      const ok = await createSub(token)
      res.status(ok ? 200 : 502).json({ ok })
      return
    }

    // Дальше нужен подтверждённый чат: без него алерт слать некуда,
    // а таблица превратилась бы в свалку из чужих запросов.
    const sub = await getSub(token)
    if (!sub || sub.chat_id == null) { res.status(409).json({ error: 'telegram not linked' }); return }

    if (action === 'add') {
      const kind = KINDS.has(body.kind) ? body.kind : 'crypto'
      const direction = DIRECTIONS.has(body.direction) ? body.direction : null
      const target = Number(body.targetUsd)
      const assetId = String(body.assetId || '').slice(0, 64)
      const symbol = String(body.symbol || '').slice(0, 24)
      if (!assetId || !symbol || !direction || !isFinite(target) || target <= 0) {
        res.status(400).json({ error: 'bad alert' }); return
      }
      const existing = (await listAlerts(token)) ?? []
      if (existing.length >= 20) { res.status(409).json({ error: 'too many alerts' }); return }

      const ok = await addAlert({
        token,
        kind,
        asset_id: assetId,
        symbol,
        name: String(body.name || symbol).slice(0, 64),
        direction,
        target_usd: target,
      })
      res.status(ok ? 200 : 502).json({ ok })
      return
    }

    if (action === 'del') {
      const ok = await deleteAlert(token, body.id)
      res.status(ok ? 200 : 502).json({ ok })
      return
    }

    res.status(400).json({ error: 'unknown action' })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 140) })
  }
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return {} }
}
