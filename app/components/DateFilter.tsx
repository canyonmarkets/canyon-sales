'use client'
import { PRESETS, PresetKey, phxToday } from '../lib/sales'

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const selectStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface-2)', color: 'var(--text)',
  border: '1px solid var(--border-2)', borderRadius: 10, padding: '12px 14px',
  fontSize: 15, fontWeight: 600, fontFamily: FONT, cursor: 'pointer', colorScheme: 'dark',
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-2)',
  borderRadius: 8, padding: '10px 12px', fontSize: 14, colorScheme: 'dark', fontFamily: FONT,
}

export default function DateFilter({
  preset, customStart, customEnd, onPreset, onCustom,
}: {
  preset: PresetKey
  customStart: string
  customEnd: string
  onPreset: (p: PresetKey) => void
  onCustom: (start: string, end: string) => void
}) {
  const today = phxToday()
  return (
    <>
      <select value={preset} onChange={(e) => onPreset(e.target.value as PresetKey)} style={selectStyle} aria-label="Date range">
        {PRESETS.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>
      {preset === 'custom' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <input type="date" value={customStart} max={today}
            // If the new start passes the current end, drag the end along so the
            // range can never be inverted (start > end = empty query, blank page).
            onChange={(e) => onCustom(e.target.value, e.target.value > customEnd ? e.target.value : customEnd)}
            style={inputStyle} aria-label="Start date" />
          <input type="date" value={customEnd} max={today} min={customStart}
            onChange={(e) => onCustom(customStart, e.target.value)} style={inputStyle} aria-label="End date" />
        </div>
      )}
    </>
  )
}
