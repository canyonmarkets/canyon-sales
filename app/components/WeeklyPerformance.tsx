'use client'
import { useState } from 'react'
import { SaleRow, StoreCode, Range, weekStats, money } from '../lib/sales'

type Metric = 'sales' | 'txns' | 'ticket'
const compact = (n: number) =>
  n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'k' : '$' + n.toFixed(n < 100 ? 2 : 0)

export default function WeeklyPerformance({ rows, store, windowRange }: { rows: SaleRow[]; store: StoreCode; windowRange: Range }) {
  const [metric, setMetric] = useState<Metric>('sales')
  if (!windowRange) return null
  const w = weekStats(rows, store, windowRange)
  // per-day value for the selected metric: ticket = avg spend per order that day
  const valueFor = (d: { total: number; orders: number }) =>
    metric === 'sales' ? d.total : metric === 'txns' ? d.orders : d.orders > 0 ? d.total / d.orders : 0
  const max = Math.max(1, ...w.series.map(valueFor))
  const weekAvgTicket = w.weekTxns > 0 ? w.weekTotal / w.weekTxns : 0

  const up = w.pctChange !== null && w.pctChange >= 0
  const trendColor = w.pctChange === null ? 'var(--text-dim)' : up ? 'var(--green)' : '#f87171'

  return (
    <div className="card fade-up" style={{ padding: '20px 22px', marginTop: 16, animationDelay: '0.18s' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
            Last 7 Days
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999,
            fontSize: 12.5, fontWeight: 700, color: trendColor,
            background: w.pctChange === null ? 'var(--surface-2)' : up ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
            border: `1px solid ${w.pctChange === null ? 'var(--border-2)' : up ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
          }}>
            {w.pctChange === null ? '— no prior week' : `${up ? '▲' : '▼'} ${Math.abs(w.pctChange).toFixed(0)}% vs last week`}
          </span>
        </div>
        {/* metric toggle */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 9, padding: 3 }}>
          {([['sales', 'Sales'], ['txns', 'Transactions'], ['ticket', 'Ticket']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setMetric(k)}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                background: metric === k ? 'var(--ember)' : 'transparent',
                color: metric === k ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(6px,2vw,18px)', height: 180, padding: '0 4px' }}>
        {w.series.map((d, i) => {
          const val = valueFor(d)
          const h = (val / max) * 100
          return (
            <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 8 }}>
              <div className="mono-num" style={{ fontSize: 12, fontWeight: 700, color: d.isToday ? 'var(--ember)' : 'var(--text-muted)', minHeight: 16 }}>
                {val > 0 ? (metric === 'txns' ? d.orders : compact(val)) : ''}
              </div>
              <div style={{
                width: '100%', maxWidth: 56, height: `${Math.max(h, val > 0 ? 3 : 0)}%`, borderRadius: '7px 7px 3px 3px',
                background: d.isToday
                  ? 'linear-gradient(180deg, #ff8a3d 0%, var(--ember-600) 100%)'
                  : 'linear-gradient(180deg, rgba(224,99,26,0.55) 0%, rgba(201,75,12,0.35) 100%)',
                boxShadow: d.isToday ? '0 0 18px var(--ember-glow)' : 'none',
                transformOrigin: 'bottom', animation: 'growBar 0.6s cubic-bezier(0.22,1,0.36,1) both',
                animationDelay: `${0.05 * i}s`,
              }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: d.isToday ? 'var(--text)' : 'var(--text-dim)' }}>
                {d.dow}
              </div>
            </div>
          )
        })}
      </div>

      {/* records strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
        <Fact icon="🏆" label="Record Day" value={w.bestDay && w.bestDay.total > 0 ? money(w.bestDay.total) : '—'} sub={w.bestDay && w.bestDay.total > 0 ? w.bestDay.label : 'no sales yet'} />
        <Fact icon="📊" label="Daily Avg (7d)" value={money(w.dailyAvg)} sub={`${w.weekTxns} orders this week`} />
        <Fact
          icon={metric === 'sales' ? '💰' : metric === 'txns' ? '🧾' : '🎟️'}
          label={metric === 'ticket' ? 'Avg Ticket (7d)' : '7-Day Total'}
          value={metric === 'sales' ? money(w.weekTotal) : metric === 'txns' ? `${w.weekTxns}` : money(weekAvgTicket)}
          sub={metric === 'sales' ? 'sales' : metric === 'txns' ? 'transactions' : 'per order'}
        />
        <Fact icon="🔥" label="Busiest Day" value={w.busiest ? w.busiest.dow : '—'} sub={w.busiest ? `${money(w.busiest.avg)} avg` : 'building history'} />
      </div>
    </div>
  )
}

function Fact({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>{icon} {label}</div>
      <div className="mono-num" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}
