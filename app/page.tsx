'use client'
import { useState } from 'react'
import SplashScreen from './components/SplashScreen'
import PinGate from './components/PinGate'
import Dashboard from './components/Dashboard'

export default function Page() {
  const [done, setDone] = useState(false)
  return (
    <>
      {/* PinGate shows the shared access code until unlocked; once unlocked the
          Dashboard mounts and fetches under the splash. */}
      <PinGate>
        <Dashboard />
      </PinGate>
      {!done && <SplashScreen onDone={() => setDone(true)} />}
    </>
  )
}
