'use client'
import { useState } from 'react'
import { DayPoint, money } from '../lib/sales'

export default function TrendChart({ data }: { data: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 1000, H = 240
  const pad = { l: 10, r: 10, t: 18, b: 30 }
  const max = Math.max(1, ...data.map((d) => d.total))
  const n = data.length
  const slot = (W - pad.l - pad.r) / n
  const bw = Math.min(slot * 0.62, 54)
  const labelStep = Math.ceil(n / 12) // thin x labels for long ranges

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 220, overflow: 'visible' }}>
        <defs>
          <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2792e" />
            <stop offset="100%" stopColor="#c94b0c" />
          </linearGradient>
        </defs>
        {/* baseline */}
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
        {data.map((d, i) => {
          const x = pad.l + i * slot + (slot - bw) / 2
          const h = (d.total / max) * (H - pad.t - pad.b)
          const y = H - pad.b - h
          const isHover = hover === i
          return (
            <g key={d.key}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}>
              {/* hit area */}
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent" />
              <rect
                x={x} y={y} width={bw} height={Math.max(h, d.total > 0 ? 2 : 0)} rx={4}
                fill="url(#barG)"
                opacity={hover === null || isHover ? 1 : 0.45}
                style={{
                  transformOrigin: `center ${H - pad.b}px`,
                  animation: `growBar 0.6s cubic-bezier(0.22,1,0.36,1) both`,
                  animationDelay: `${i * 0.025}s`,
                  filter: isHover ? 'drop-shadow(0 0 10px var(--ember-glow))' : 'none',
                  transition: 'opacity 0.15s, filter 0.15s',
                }}
              />
              {i % labelStep === 0 && (
                <text x={pad.l + i * slot + slot / 2} y={H - pad.b + 18} textAnchor="middle"
                  fill="#c8d0db" fontSize={12} fontFamily="var(--font-num)">
                  {d.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {hover !== null && (
        <div style={{
          position: 'absolute', left: `${((hover + 0.5) / n) * 100}%`, top: -2,
          transform: 'translateX(-50%)', pointerEvents: 'none',
          background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8,
          padding: '6px 10px', whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{data[hover].label}</div>
          <div className="mono-num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{money(data[hover].total)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data[hover].orders} order{data[hover].orders === 1 ? '' : 's'}</div>
        </div>
      )}
    </div>
  )
}
