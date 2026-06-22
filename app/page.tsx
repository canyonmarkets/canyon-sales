'use client'
import { useState } from 'react'
import SplashScreen from './components/SplashScreen'
import Dashboard from './components/Dashboard'

export default function Page() {
  const [done, setDone] = useState(false)
  return (
    <>
      {/* Dashboard mounts immediately and fetches under the splash, so data is
          ready by the time the splash fades out. */}
      <Dashboard />
      {!done && <SplashScreen onDone={() => setDone(true)} />}
    </>
  )
}
