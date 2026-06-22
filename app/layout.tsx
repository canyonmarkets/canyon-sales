import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Canyon Markets — Sales',
  description: 'Live sales dashboard for Canyon Markets kiosks',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Canyon Sales', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#0a0c10',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
