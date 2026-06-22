'use client'
import { STORES, StoreCode } from '../lib/sales'

export default function StoreSelector({ value, onChange }: { value: StoreCode; onChange: (s: StoreCode) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {STORES.map((s) => {
        const active = s.code === value
        return (
          <button
            key={s.code}
            onClick={() => onChange(s.code)}
            style={{
              padding: '11px 20px', borderRadius: 999, cursor: 'pointer',
              fontSize: 14, fontWeight: 600, letterSpacing: '0.02em',
              border: `1px solid ${active ? 'transparent' : 'var(--border-2)'}`,
              background: active ? 'linear-gradient(180deg, var(--ember) 0%, var(--ember-600) 100%)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--text-muted)',
              boxShadow: active ? '0 4px 16px var(--ember-glow)' : 'none',
              transition: 'all 0.18s',
            }}
          >
            {s.short}
          </button>
        )
      })}
    </div>
  )
}
