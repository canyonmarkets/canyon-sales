'use client'
import { PRESETS, PresetKey, phxToday } from '../lib/sales'

export default function DateFilter({
  preset, customStart, customEnd, rangeLabel, onPreset, onCustom,
}: {
  preset: PresetKey
  customStart: string
  customEnd: string
  rangeLabel: string
  onPreset: (p: PresetKey) => void
  onCustom: (start: string, end: string) => void
}) {
  const today = phxToday()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {PRESETS.map((p) => {
          const active = p.key === preset
          return (
            <button
              key={p.key}
              onClick={() => onPreset(p.key)}
              style={{
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                border: `1px solid ${active ? 'transparent' : 'var(--border-2)'}`,
                background: active ? 'var(--surface-2)' : 'transparent',
                color: active ? 'var(--ember)' : 'var(--text-muted)',
                boxShadow: active ? 'inset 0 0 0 1px var(--ember)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {preset === 'custom' && (
        <div className="fade-in" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={customStart} max={today}
            onChange={(e) => onCustom(e.target.value, customEnd)} style={inputStyle} />
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>→</span>
          <input type="date" value={customEnd} max={today} min={customStart}
            onChange={(e) => onCustom(customStart, e.target.value)} style={inputStyle} />
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
        📅 {rangeLabel}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-2)',
  borderRadius: 8, padding: '7px 10px', fontSize: 13, colorScheme: 'dark', fontFamily: 'inherit',
}
