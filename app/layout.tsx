import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Canyon Markets — Sales',
  description: 'Live sales dashboard for Canyon Markets kiosks',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Sales', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icon-sales-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-sales-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-sales-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
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
