'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { StoreCode, PresetKey, SaleRow, resolveRange, fetchSales, fetchSalesLite, lastNDaysRange, phxToday, STORES } from '../lib/sales'
import StoreSelector from './StoreSelector'
import DateFilter from './DateFilter'
import SalesSummary from './SalesSummary'
import ItemSales from './ItemSales'

type Tab = 'summary' | 'items'

export default function Dashboard() {
  const [store, setStore] = useState<StoreCode>('ALL')
  const [preset, setPreset] = useState<PresetKey>('today')
  const [customStart, setCustomStart] = useState(phxToday())
  const [customEnd, setCustomEnd] = useState(phxToday())
  const [tab, setTab] = useState<Tab>('summary')

  const [rows, setRows] = useState<SaleRow[]>([])
  const [overviewRows, setOverviewRows] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const range = useMemo(() => resolveRange(preset, customStart, customEnd), [preset, customStart, customEnd])
  const overviewRange = useMemo(() => lastNDaysRange(90), [updatedAt])

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const r = resolveRange(preset, customStart, customEnd) // fresh "now"
      const [data, overview] = await Promise.all([
        fetchSales(r),
        fetchSalesLite(lastNDaysRange(90)),
      ])
      setRows(data)
      setOverviewRows(overview)
      setError(null)
      setUpdatedAt(new Date())
    } catch (e) {
      // A failed background refresh shouldn't blow away data that's already on
      // screen — keep showing the last good load and let the next tick retry.
      // Manual loads / first load still surface the error card.
      if (!quiet) setError(e instanceof Error ? e.message : 'Failed to load sales')
    } finally {
      setLoading(false)
    }
  }, [preset, customStart, customEnd])

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), 60000) // live refresh
    return () => clearInterval(id)
  }, [load])

  const storeLabel = STORES.find((s) => s.code === store)?.label ?? 'All Stores'

  return (
    <div className="fade-in" style={{ minHeight: '100vh', padding: '22px clamp(16px, 4vw, 40px) 60px' }}>
      {/* top loading shimmer */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 50, overflow: 'hidden' }}>
        {loading && <div style={{ width: '35%', height: '100%', background: 'linear-gradient(90deg, transparent, var(--ember), transparent)', backgroundSize: '200% 100%', animation: 'sheen 1s linear infinite' }} />}
      </div>

      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image src="/Canyon_Logo.png" alt="Canyon" width={46} height={46} style={{ objectFit: 'contain' }} priority />
          <div>
            <div className="brand-title" style={{ fontSize: 24, lineHeight: 1 }}>Canyon Markets</div>
            <div style={{ fontSize: 12, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--ember)', fontWeight: 600, marginTop: 3 }}>Sales Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulseGlow 2s ease-in-out infinite', boxShadow: '0 0 8px var(--green)' }} />
            Live{updatedAt ? ` · ${updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
          </div>
          <button onClick={() => load()} title="Refresh"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--text-muted)', borderRadius: 10, width: 44, height: 44, cursor: 'pointer', fontSize: 18 }}>
            ⟳
          </button>
          <button onClick={() => window.open('https://cloud.fully-kiosk.com/cloud/devices', '_blank', 'noopener,noreferrer')} title="Open Fully Cloud kiosk monitoring"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--text-muted)', borderRadius: 10, height: 44, padding: '0 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Kiosks
          </button>
          <button onClick={() => { try { localStorage.removeItem('canyon-sales-unlocked') } catch { /* storage disabled */ } location.reload() }} title="Lock"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', color: 'var(--text-muted)', borderRadius: 10, height: 44, padding: '0 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Lock
          </button>
        </div>
      </header>

      {/* ── Controls (compact dropdowns keep the data above the fold on a phone) ── */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>Store</div>
          <StoreSelector value={store} onChange={setStore} />
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>Date</div>
          <DateFilter
            preset={preset} customStart={customStart} customEnd={customEnd}
            onPreset={setPreset}
            onCustom={(s, e) => { setCustomStart(s); setCustomEnd(e) }}
          />
        </div>
      </div>

      {/* ── Tabs — sticky so you can switch views while scrolled on a phone ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        margin: '0 calc(-1 * clamp(16px, 4vw, 40px)) 20px',
        padding: '10px clamp(16px, 4vw, 40px)',
        background: 'rgba(10,12,16,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {([['summary', 'Sales Summary'], ['items', 'Item Sales']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                padding: '12px 24px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: tab === k ? 'linear-gradient(180deg, var(--ember) 0%, var(--ember-600) 100%)' : 'transparent',
                color: tab === k ? '#fff' : 'var(--text-muted)',
                boxShadow: tab === k ? '0 4px 14px var(--ember-glow)' : 'none', transition: 'all 0.18s',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
        Showing <strong style={{ color: 'var(--text-muted)' }}>{storeLabel}</strong> · {range.label}
      </div>

      {error ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#fca5a5' }}>
          Couldn’t load sales — {error}
          <div><button onClick={() => load()} style={{ marginTop: 14, background: 'var(--ember)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', fontWeight: 600 }}>Retry</button></div>
        </div>
      ) : (
        <div key={`${tab}-${store}-${range.label}`}>
          {tab === 'summary'
            ? <SalesSummary rows={rows} store={store} range={range} overviewRows={overviewRows} overviewRange={overviewRange} />
            : <ItemSales rows={rows} store={store} />}
        </div>
      )}
    </div>
  )
}
