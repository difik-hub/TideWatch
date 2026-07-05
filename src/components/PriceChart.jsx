import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { formatPrice } from '../lib/format'

function makeTooltip(currency) {
  return function TooltipBox({ active, payload }) {
    if (!active || !payload?.length) return null
    const p = payload[0].payload
    return (
      <div className="rounded-lg bg-panel border border-line-strong px-3 py-2 text-xs shadow-lg">
        <div className="text-soft">{p.label}</div>
        <div className="font-semibold text-ink tnum">{formatPrice(p.price, currency)}</div>
      </div>
    )
  }
}

export default function PriceChart({ data, up }) {
  const { currency } = useSettings()
  const t = useT()

  if (!data || data.length < 2) {
    return <div className="h-64 flex items-center justify-center text-soft text-sm">{t('noChart')}</div>
  }

  const color = up ? 'var(--up)' : 'var(--down)'

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--soft)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--soft)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={62}
            tickFormatter={(v) => formatPrice(v, currency)}
          />
          <Tooltip content={makeTooltip(currency)} cursor={{ stroke: 'var(--line-strong)' }} />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill="url(#chartFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
