'use client'
import { useEffect, useState } from 'react'
import { SaleRow, StoreCode, Range, weekStats, money, DOW_LONG } from '../lib/sales'
import WeekdayCompare, { Fact, type Metric } from './WeekdayCompare'

const compact = (n: number) =>
  n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'k' : '$' + n.toFixed(n < 100 ? 2 : 0)

/** 'week' = the rolling 7-day bars; '0'–'6' = one weekday compared; 'rank' = all seven ranked. */
type Mode = 'week' | 'rank' | '0' | '1' | '2' | '3' | '4' | '5' | '6'
const MODE_KEY = 'canyon-sales-week-mode'
const COUNT_KEY = 'canyon-sales-week-count'
// Mon-first: the work week is how Jeff reads these markets.
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]
const COUNTS = [4, 8, 12]

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

export default function WeeklyPerformance({ rows, store, windowRange }: { rows: SaleRow[]; store: StoreCode; windowRange: Range }) {
  const [metric, setMetric] = useState<Metric>('sales')
  const [mode, setMode] = useState<Mode>('week')
  const [count, setCount] = useState(4)

  // Restore the last view after mount (not during render — that would desync
  // the server-rendered HTML and throw a hydration error).
  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY) as Mode | null
      if (m && (m === 'week' || m === 'rank' || /^[0-6]$/.test(m))) setMode(m)
      const c = Number(localStorage.getItem(COUNT_KEY))
      if (COUNTS.includes(c)) setCount(c)
    } catch { /* storage disabled — defaults are fine */ }
  }, [])

  const pick = (m: Mode) => {
    setMode(m)
    try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ }
  }
  const pickCount = (c: number) => {
    setCount(c)
    try { localStorage.setItem(COUNT_KEY, String(c)) } catch { /* ignore */ }
  }

  if (!windowRange) return null
  const isWeek = mode === 'week'
  const w = weekStats(rows, store, windowRange)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={mode}
            onChange={(e) => pick(e.target.value as Mode)}
            aria-label="Comparison view"
            style={{
              background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-2)',
              borderRadius: 9, padding: '8px 12px', fontSize: 13.5, fontWeight: 700, fontFamily: FONT,
              cursor: 'pointer', colorScheme: 'dark', maxWidth: '100%',
            }}
          >
            <option value="week">Last 7 Days</option>
            <option value="rank">Rank All Weekdays</option>
            <optgroup label="Compare same weekday">
              {DOW_ORDER.map((d) => (
                <option key={d} value={String(d)}>{DOW_LONG[d]}s</option>
              ))}
            </optgroup>
          </select>

          {isWeek ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999,
              fontSize: 12.5, fontWeight: 700, color: trendColor,
              background: w.pctChange === null ? 'var(--surface-2)' : up ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
              border: `1px solid ${w.pctChange === null ? 'var(--border-2)' : up ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
            }}>
              {w.pctChange === null ? '— no prior week' : `${up ? '▲' : '▼'} ${Math.abs(w.pctChange).toFixed(0)}% vs last week`}
            </span>
          ) : mode !== 'rank' ? (
            <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 9, padding: 3 }}>
              {COUNTS.map((c) => (
                <button key={c} onClick={() => pickCount(c)}
                  style={{
                    padding: '6px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: count === c ? 'var(--surface)' : 'transparent',
                    color: count === c ? 'var(--text)' : 'var(--text-dim)', transition: 'all 0.15s',
                  }}>
                  last {c}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* metric toggle — applies to every view */}
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

      {!isWeek ? (
        <WeekdayCompare
          rows={rows} store={store} windowRange={windowRange} metric={metric}
          dowIndex={mode === 'rank' ? 'rank' : Number(mode)} count={count}
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
