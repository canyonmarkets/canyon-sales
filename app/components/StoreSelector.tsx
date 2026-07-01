'use client'
import { STORES, StoreCode } from '../lib/sales'

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  border: '1px solid var(--border-2)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  cursor: 'pointer',
  colorScheme: 'dark',
}

export default function StoreSelector({ value, onChange }: { value: StoreCode; onChange: (s: StoreCode) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as StoreCode)} style={selectStyle} aria-label="Store">
      {STORES.map((s) => (
        <option key={s.code} value={s.code}>{s.label}</option>
      ))}
    </select>
  )
}
