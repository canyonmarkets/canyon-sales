'use client'
import { useEffect, useState } from 'react'
import { SaleRow, StoreCode, Range, weekdayStats, weekdayAverages, money } from '../lib/sales'

export type Metric = 'sales' | 'txns' | 'ticket'

const compact = (n: number) =>
  n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'k' : '$' + n.toFixed(n < 100 ? 2 : 0)

/** Short label for a bar cap — transactions are counts, everything else is money. */
const capLabel = (metric: Metric, v: number) => (metric === 'txns' ? String(Math.round(v)) : compact(v))
const fullLabel = (metric: Metric, v: number) => (metric === 'txns' ? `${Math.round(v)}` : money(v))
const metricNoun = (metric: Metric) => (metric === 'sales' ? 'sales' : metric === 'txns' ? 'orders' : 'per order')

/**
 * Phone-width flag. On a 375px screen the fixed rank columns squeeze the bar
 * track to ~60px, which kills the whole point of a comparison bar — so the
 * trailing gap column drops out below this width.
 */
function useNarrow(bp = 480) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [bp])
  return narrow
}

/** 'YYYY-MM-DD' → 'Jul 2' without letting the runtime timezone shift the day. */
const dayLabel = (key: string) =>
  new Date(key + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export default function WeekdayCompare({
  rows, store, windowRange, metric, dowIndex, count,
}: {
  rows: SaleRow[]
  store: StoreCode
  windowRange: Range
  metric: Metric
  /** 0–6 for a single weekday, or 'rank' to rank all seven. */
  dowIndex: number | 'rank'
  count: number
}) {
  return dowIndex === 'rank'
    ? <RankAll rows={rows} store={store} windowRange={windowRange} metric={metric} />
    : <SingleWeekday rows={rows} store={store} windowRange={windowRange} metric={metric} dowIndex={dowIndex} count={count} />
}

// ── One weekday, last N occurrences ─────────────────────────────────────────
function SingleWeekday({
  rows, store, windowRange, metric, dowIndex, count,
}: {
  rows: SaleRow[]; store: StoreCode; windowRange: Range; metric: Metric; dowIndex: number; count: number
}) {
  const narrow = useNarrow()
  const w = weekdayStats(rows, store, windowRange, dowIndex, count)
  const valueFor = (d: { total: number; orders: number }) =>
    metric === 'sales' ? d.total : metric === 'txns' ? d.orders : d.orders > 0 ? d.total / d.orders : 0
  // 12 bars × "Jul 16" doesn't fit a 375px phone — drop to the day number and
  // let the month ride in the caption below the chart.
  const tick = (key: string) => (narrow && w.occurrences.length > 5 ? String(Number(key.slice(-2))) : dayLabel(key))

  if (w.completed.length === 0) {
    return (
      <Empty text={`No completed ${w.dowLong}s with sales in the last 90 days for this store.`} />
    )
  }

  const max = Math.max(1, ...w.occurrences.map(valueFor))
  // Rank every completed occurrence by the metric on screen so the badge always
  // matches what the bars show (ranking by sales while viewing Ticket would lie).
  const ranked = [...w.completed].sort((a, b) => valueFor(b) - valueFor(a))
  const rankOf = (key: string) => ranked.findIndex((d) => d.key === key) + 1
  // Best/worst must come off the SAME ranking as the 🏆 on the bars — reading
  // w.best (always dollars) would contradict the chart under Ticket/Transactions.
  const best = ranked[0] ?? null
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : null

  const avgFor =
    metric === 'sales' ? w.avgTotal : metric === 'txns' ? w.avgOrders : w.avgTicket
  // Compare against the all-day baseline on the SAME metric that's on screen.
  const allDayFor =
    metric === 'sales' ? w.allDayAvg : metric === 'txns' ? w.allDayAvgOrders : w.allDayAvgTicket
  const aboveAverage = avgFor >= allDayFor
  const up = w.pctVsPrior !== null && w.pctVsPrior >= 0

  return (
    <>
      {/* bars — oldest → newest, left to right */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(6px,2vw,18px)', height: 180, padding: '0 4px' }}>
        {w.occurrences.map((d, i) => {
          const val = valueFor(d)
          const h = (val / max) * 100
          const rank = d.isToday ? 0 : rankOf(d.key)
          const isBest = rank === 1
          return (
            <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 }}>
              <div className="mono-num" style={{ fontSize: 12, fontWeight: 700, color: isBest ? 'var(--green)' : 'var(--text-muted)', minHeight: 16 }}>
                {val > 0 ? capLabel(metric, val) : ''}
              </div>
              <div style={{
                width: '100%', maxWidth: 56, height: `${Math.max(h, val > 0 ? 3 : 0)}%`, borderRadius: '7px 7px 3px 3px',
                background: isBest
                  ? 'linear-gradient(180deg, #34d399 0%, #059669 100%)'
                  : d.isToday
                    ? 'linear-gradient(180deg, rgba(255,138,61,0.5) 0%, rgba(201,75,12,0.3) 100%)'
                    : 'linear-gradient(180deg, rgba(224,99,26,0.55) 0%, rgba(201,75,12,0.35) 100%)',
                border: d.isToday ? '1px dashed rgba(255,138,61,0.8)' : 'none',
                boxShadow: isBest ? '0 0 18px rgba(52,211,153,0.35)' : 'none',
                transformOrigin: 'bottom', animation: 'growBar 0.6s cubic-bezier(0.22,1,0.36,1) both',
                animationDelay: `${0.05 * i}s`,
              }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: d.isToday ? 'var(--ember)' : 'var(--text-dim)', textAlign: 'center', lineHeight: 1.3 }}>
                {tick(d.key)}
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>
                  {d.isToday ? 'today · partial' : isBest ? '🏆 best' : `#${rank}`}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10 }}>
        {w.dowLong}s · {dayLabel(w.occurrences[0].key)} → {dayLabel(w.occurrences[w.occurrences.length - 1].key)}
      </div>

      {/* facts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 16, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
        <Fact icon="🏆" label={`Best ${w.dow}`} value={best ? fullLabel(metric, valueFor(best)) : '—'} sub={best ? dayLabel(best.key) : '—'} />
        <Fact icon="📊" label={`${w.dow} Avg`} value={fullLabel(metric, avgFor)} sub={`over ${w.completed.length} ${w.dowLong}${w.completed.length === 1 ? '' : 's'}`} />
        <Fact icon="🐌" label={`Worst ${w.dow}`} value={worst ? fullLabel(metric, valueFor(worst)) : '—'} sub={worst ? dayLabel(worst.key) : '—'} />
        <Fact
          icon={aboveAverage ? '💪' : '⚠️'}
          label="vs All Days"
          value={allDayFor > 0 ? `${aboveAverage ? '+' : ''}${(((avgFor - allDayFor) / allDayFor) * 100).toFixed(0)}%` : '—'}
          sub={`all-day avg ${fullLabel(metric, allDayFor)}`}
          color={allDayFor > 0 ? (aboveAverage ? 'var(--green)' : '#f87171') : undefined}
        />
      </div>

      {w.pctVsPrior !== null && w.latest && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
          Most recent {w.dowLong} ({dayLabel(w.latest.key)}) came in{' '}
          <strong style={{ color: up ? 'var(--green)' : '#f87171' }}>
            {up ? '▲' : '▼'} {Math.abs(w.pctVsPrior).toFixed(0)}%
          </strong>{' '}
          {w.completed.length - 1 === 1
            ? `vs the ${w.dowLong} before it.`
            : `vs the average of the ${w.completed.length - 1} ${w.dowLong}s before it.`}
        </div>
      )}
    </>
  )
}

// ── All seven weekdays, ranked ──────────────────────────────────────────────
function RankAll({
  rows, store, windowRange, metric,
}: {
  rows: SaleRow[]; store: StoreCode; windowRange: Range; metric: Metric
}) {
  const narrow = useNarrow()
  const all = weekdayAverages(rows, store, windowRange).filter((d) => d.days > 0)
  const valueFor = (d: { avgTotal: number; avgOrders: number; avgTicket: number }) =>
    metric === 'sales' ? d.avgTotal : metric === 'txns' ? d.avgOrders : d.avgTicket

  if (all.length === 0) return <Empty text="No sales history yet for this store." />

  const ranked = [...all].sort((a, b) => valueFor(b) - valueFor(a))
  const top = valueFor(ranked[0])
  const max = Math.max(1, top)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ranked.map((d, i) => {
          const val = valueFor(d)
          const gap = top > 0 ? ((val - top) / top) * 100 : 0
          const isTop = i === 0
          const isBottom = i === ranked.length - 1 && ranked.length > 1
          return (
            <div key={d.dowIndex} style={{ display: 'flex', alignItems: 'center', gap: narrow ? 8 : 10 }}>
              <div style={{ width: narrow ? 14 : 20, fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textAlign: 'right' }}>{i + 1}</div>
              <div style={{ width: narrow ? 34 : 44, fontSize: 13, fontWeight: 700, color: isTop ? 'var(--green)' : isBottom ? '#f87171' : 'var(--text-muted)' }}>
                {d.dow}
              </div>
              <div style={{ flex: 1, height: 22, borderRadius: 7, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <div style={{
                  width: `${(val / max) * 100}%`, height: '100%', borderRadius: 7,
                  background: isTop
                    ? 'linear-gradient(90deg, #059669, #34d399)'
                    : 'linear-gradient(90deg, var(--ember-600), var(--ember))',
                  transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
                }} />
              </div>
              <div className="mono-num" style={{ width: narrow ? 66 : 78, textAlign: 'right', fontWeight: 700, fontSize: narrow ? 12.5 : 13.5 }}>
                {fullLabel(metric, val)}
              </div>
              {!narrow && (
                <div className="mono-num" style={{ width: 52, textAlign: 'right', fontSize: 12, fontWeight: 600, color: isTop ? 'var(--green)' : 'var(--text-dim)' }}>
                  {isTop ? 'best' : `${gap.toFixed(0)}%`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-muted)' }}>
        Average {metricNoun(metric)} per weekday over the last 90 days ({ranked.map((d) => `${d.dow} ${d.days}`).join(' · ')} days counted).
        {ranked.length > 1 && (
          <> Your weakest day, <strong style={{ color: '#f87171' }}>{ranked[ranked.length - 1].dowLong}</strong>, runs{' '}
            <strong>{Math.abs(((valueFor(ranked[ranked.length - 1]) - top) / (top || 1)) * 100).toFixed(0)}%</strong> below{' '}
            <strong style={{ color: 'var(--green)' }}>{ranked[0].dowLong}</strong>.</>
        )}
      </div>
    </>
  )
}

// ── Bits ────────────────────────────────────────────────────────────────────
function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '38px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13.5 }}>
      {text}
    </div>
  )
}

export function Fact({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>{icon} {label}</div>
      <div className="mono-num" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: color ?? 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}
