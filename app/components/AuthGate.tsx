'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (checking) return null              // splash covers this brief moment
  if (!session) return <LoginScreen />
  return <>{children}</>
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setError(error.message); setBusy(false) }
    // on success, onAuthStateChange in AuthGate swaps to the dashboard
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

        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={inputStyle} />

        {error && <div style={{ fontSize: 13, color: '#fca5a5', textAlign: 'center' }}>{error}</div>}

        <button type="submit" disabled={busy} style={{
          width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
          background: busy ? 'var(--surface-2)' : 'linear-gradient(180deg, var(--ember) 0%, var(--ember-600) 100%)',
          color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', cursor: busy ? 'wait' : 'pointer',
          boxShadow: busy ? 'none' : '0 6px 18px var(--ember-glow)',
        }}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          Use the same login as your vending dashboard. You&apos;ll stay signed in on this device.
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: 'var(--surface-2)', color: 'var(--text)',
  border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', colorScheme: 'dark',
}
