'use client'
import { useState } from 'react'
import SplashScreen from './components/SplashScreen'
import AuthGate from './components/AuthGate'
import Dashboard from './components/Dashboard'

export default function Page() {
  const [done, setDone] = useState(false)
  return (
    <>
      {/* AuthGate shows the magic-link login until signed in; once authed the
          Dashboard mounts and fetches under the splash. */}
      <AuthGate>
        <Dashboard />
      </AuthGate>
      {!done && <SplashScreen onDone={() => setDone(true)} />}
    </>
  )
}
