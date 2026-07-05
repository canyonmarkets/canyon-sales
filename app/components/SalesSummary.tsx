'use client'
import { useEffect, useRef, useState } from 'react'
import { SaleRow, StoreCode, Range, summarize, dailySeries, money, STORES } from '../lib/sales'
import TrendChart from './TrendChart'
import WeeklyPerformance from './WeeklyPerformance'

function useCountUp(value: number, dur = 750) {
  const [n, setN] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    const from = ref.current, to = value, t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else ref.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, dur])
  return n
}

function Metric({ label, value, accent, hint, delay, kind = 'money', span }: { label: string; value: number; accent?: boolean; hint?: string; delay: number; kind?: 'money' | 'count'; span?: boolean }) {
  const n = useCountUp(value)
  const display = kind === 'count' ? Math.round(n).toLocaleString('en-US') : money(n)
  return (
    <div className="card fade-up" style={{
      padding: '16px 18px',
      gridColumn: span ? '1 / -1' : undefined,
      animationDelay: `${delay}s`,
      borderColor: accent ? 'rgba(224,99,26,0.5)' : 'var(--border)',
      background: accent
        ? 'linear-gradient(180deg, rgba(224,99,26,0.16) 0%, var(--bg-2) 100%)'
        : 'linear-gradient(180deg, var(--surface) 0%, var(--bg-2) 100%)',
    }}>
      <div style={{ fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
      <div className="mono-num" style={{ fontSize: 'clamp(22px, 5.5vw, 32px)', fontWeight: 700, marginTop: 6, color: accent ? '#fff' : 'var(--text)', whiteSpace: 'nowrap' }}>
        {display}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default function SalesSummary({ rows, store, range, overviewRows, overviewRange }: { rows: SaleRow[]; store: StoreCode; range: Range; overviewRows: SaleRow[]; overviewRange: Range }) {
  const s = summarize(rows, store)
  const series = dailySeries(rows, store, range)
  const showChart = series.length >= 2

  // per-store breakdown (only meaningful when viewing All)
  const byStore = STORES.filter((x) => x.code !== 'ALL').map((x) => ({ ...x, t: summarize(rows, x.code).total }))
  const maxStore = Math.max(1, ...byStore.map((b) => b.t))

  return (
    <div className="fade-in">
      <SectionHeader title="Sales Summary" right={`${s.orders} order${s.orders === 1 ? '' : 's'}`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12 }}>
        {/* Headline is pre-tax Net to match vending-dash revenue doctrine */}
        <Metric label="Net Sales" value={s.net} accent hint="pre-tax revenue" delay={0.02} />
        <Metric label="Total Collected" value={s.total} hint="incl. tax" delay={0.06} />
        <Metric label="Tax" value={s.tax} delay={0.10} />
        <Metric label="Transactions" value={s.orders} kind="count" hint="completed sales" delay={0.14} />
        <Metric label="Items Sold" value={s.itemCount} kind="count" hint="units sold" delay={0.18} />
      </div>

      <WeeklyPerformance rows={overviewRows} store={store} windowRange={overviewRange} />

      {showChart && (
        <div className="card fade-up" style={{ padding: '18px 20px 8px', marginTop: 16, animationDelay: '0.18s' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
            Total Sales by Day
          </div>
          <TrendChart data={series} />
        </div>
      )}

      {store === 'ALL' && s.total > 0 && (
        <div className="card fade-up" style={{ padding: '18px 22px', marginTop: 16, animationDelay: '0.22s' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 14 }}>
            By Store
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byStore.map((b) => (
              <div key={b.code} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 96, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{b.label}</div>
                <div style={{ flex: 1, height: 10, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(b.t / maxStore) * 100}%`, height: '100%', borderRadius: 6,
                    background: 'linear-gradient(90deg, var(--ember-600), var(--ember))',
                    transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
                  }} />
                </div>
                <div className="mono-num" style={{ width: 90, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{money(b.t)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
      <h2 className="brand-title" style={{ fontSize: 22, color: 'var(--text)' }}>{title}</h2>
      {right && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{right}</span>}
    </div>
  )
}
