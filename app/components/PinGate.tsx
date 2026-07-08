'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

// Lightweight front-door PIN — replaces the Supabase Auth / magic-link login,
// which kept getting disabled server-side and locking us out. One shared code,
// entered once per device and remembered in localStorage: no email, no expiry,
// no lockouts. Gates the UI only; this dashboard is read-only sales figures.
const PIN = (process.env.NEXT_PUBLIC_ACCESS_PIN || '2982').trim()
const STORAGE_KEY = 'canyon-sales-unlocked'

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null) // null = checking

  useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  if (unlocked === null) return null      // splash covers this brief moment
  if (unlocked) return <>{children}</>
  return <PinForm onUnlock={() => setUnlocked(true)} />
}

function PinForm({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.trim() === PIN) {
      try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* storage disabled */ }
      onUnlock()
    } else {
      setError(true)
    }
  }

  return (
    <div className="fade-in" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'radial-gradient(900px 600px at 50% 30%, rgba(224,99,26,0.12), transparent 60%), var(--bg)',
    }}>
      <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 380, padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <Image src="/Canyon_Logo.png" alt="Canyon Markets" width={84} height={84} style={{ objectFit: 'contain' }} priority />
        <div style={{ textAlign: 'center' }}>
          <div className="brand-title" style={{ fontSize: 24, color: 'var(--text)' }}>Canyon Markets</div>
          <div style={{ fontSize: 12, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--ember)', fontWeight: 600, marginTop: 4 }}>Sales Dashboard</div>
        </div>

        <input
          type="password" inputMode="numeric" autoFocus placeholder="Access code" value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false) }}
          style={{
            width: '100%', padding: '12px 14px', background: 'var(--surface-2)', color: 'var(--text)',
            border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 16, fontFamily: 'inherit',
            colorScheme: 'dark', textAlign: 'center', letterSpacing: '0.3em',
          }}
        />

        {error && <div style={{ fontSize: 13, color: '#fca5a5', textAlign: 'center' }}>Wrong code — try again.</div>}

        <button type="submit" style={{
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'linear-gradient(180deg, var(--ember) 0%, var(--ember-600) 100%)',
          color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
          boxShadow: '0 6px 18px var(--ember-glow)',
        }}>
          Enter
        </button>

        <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          No password needed — just the shared access code. You&apos;ll stay signed in on this device.
        </div>
      </form>
    </div>
  )
}
