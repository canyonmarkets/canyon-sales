'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1850)
    const t2 = setTimeout(onDone, 2550)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        background:
          'radial-gradient(900px 600px at 50% 35%, rgba(224,99,26,0.16), transparent 60%), var(--bg)',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.7s ease',
        pointerEvents: 'none',
      }}
    >
      <div style={{ animation: 'splashLogo 1.1s cubic-bezier(0.22,1,0.36,1) both', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Image src="/Canyon_Logo.png" alt="Canyon Markets" width={150} height={150}
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))' }} priority />
        <div className="brand-title" style={{
          marginTop: 18, fontSize: 'clamp(26px, 8.5vw, 40px)', color: '#fff',
          textAlign: 'center', maxWidth: '92vw', lineHeight: 1.05,
          textShadow: '0 2px 24px rgba(224,99,26,0.25)',
        }}>
          Canyon Markets
        </div>
        <div style={{
          marginTop: 8, fontSize: 14, letterSpacing: '0.42em', textTransform: 'uppercase',
          color: 'var(--ember)', fontWeight: 600, paddingLeft: '0.42em', textAlign: 'center',
        }}>
          Sales
        </div>
      </div>

      {/* loading shimmer bar */}
      <div style={{ marginTop: 40, width: 180, height: 3, borderRadius: 3, overflow: 'hidden', background: 'var(--surface-2)' }}>
        <div style={{
          width: '40%', height: '100%', borderRadius: 3,
          background: 'linear-gradient(90deg, transparent, var(--ember), transparent)',
          backgroundSize: '200% 100%', animation: 'sheen 1.1s linear infinite',
        }} />
      </div>
    </div>
  )
}
