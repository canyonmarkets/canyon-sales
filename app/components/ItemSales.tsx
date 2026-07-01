'use client'
import { useMemo, useState } from 'react'
import { SaleRow, StoreCode, itemSales, money } from '../lib/sales'
import { SectionHeader } from './SalesSummary'

type SortKey = 'name' | 'qty' | 'sales'

// Wider, non-condensed face for the item names — the app body font is condensed
// Oswald, which reads fine for numbers but is hard to scan for product names.
const READABLE = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function ItemSales({ rows, store }: { rows: SaleRow[]; store: StoreCode }) {
  const all = useMemo(() => itemSales(rows, store), [rows, store])
  const [sort, setSort] = useState<SortKey>('sales')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const f = all.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
    return [...f].sort((a, b) => {
      const cmp = sort === 'name' ? a.name.localeCompare(b.name) : (a[sort] as number) - (b[sort] as number)
      return dir === 'asc' ? cmp : -cmp
    })
  }, [all, sort, dir, q])

  const totalQty = list.reduce((s, i) => s + i.qty, 0)
  const totalSales = list.reduce((s, i) => s + i.sales, 0)

  const click = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(k); setDir(k === 'name' ? 'asc' : 'desc') }
  }
  const arrow = (k: SortKey) => (sort === k ? (dir === 'asc' ? ' ↑' : ' ↓') : '')

  return (
    <div className="fade-in">
      <SectionHeader title="Item Sales" right={`${all.length} item${all.length === 1 ? '' : 's'}`} />

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter items…"
            style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '10px 13px', fontSize: 15, width: 220, fontFamily: READABLE }}
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)' }}>
                <Th onClick={() => click('name')} style={{ textAlign: 'left' }}>Item{arrow('name')}</Th>
                <Th onClick={() => click('qty')} style={{ textAlign: 'center', width: 118 }}>Sold (Qty){arrow('qty')}</Th>
                <Th onClick={() => click('sales')} style={{ textAlign: 'right', width: 128 }}>Sales{arrow('sales')}</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((it, i) => (
                <tr key={it.name} className="fade-up"
                  style={{ borderBottom: '1px solid var(--border)', animationDelay: `${Math.min(i * 0.015, 0.4)}s` }}>
                  <td style={{ padding: '15px 18px', color: 'var(--text)', fontFamily: READABLE, fontSize: 17, fontWeight: 600, lineHeight: 1.25 }}>{it.name}</td>
                  <td className="mono-num" style={{ padding: '15px 18px', textAlign: 'center', color: 'var(--text)', fontSize: 20, fontWeight: 700 }}>{it.qty}</td>
                  <td className="mono-num" style={{ padding: '15px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--text)', fontSize: 20 }}>{money(it.sales)}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '48px 18px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: READABLE, fontSize: 15 }}>
                  No sales in this period yet.
                </td></tr>
              )}
            </tbody>
            {list.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--bg-2)', borderTop: '2px solid var(--border-2)' }}>
                  <td style={{ padding: '15px 18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 13, color: 'var(--text-muted)', fontFamily: READABLE }}>Total</td>
                  <td className="mono-num" style={{ padding: '15px 18px', textAlign: 'center', fontWeight: 700, fontSize: 20 }}>{totalQty}</td>
                  <td className="mono-num" style={{ padding: '15px 18px', textAlign: 'right', fontWeight: 700, fontSize: 20, color: 'var(--ember)' }}>{money(totalSales)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

function Th({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <th onClick={onClick} style={{
      padding: '12px 18px', cursor: 'pointer', userSelect: 'none',
      fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      color: 'var(--text-muted)', whiteSpace: 'nowrap', ...style,
    }}>{children}</th>
  )
}
