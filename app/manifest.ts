import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Canyon Markets Sales',
    short_name: 'Sales',
    description: 'Live sales dashboard for Canyon Markets',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0c10',
    theme_color: '#0a0c10',
    // Gray-background icon (logo on #8A8F97) — the "in between" of the black Dash
    // app and the white Field app, so all three are distinguishable on the home
    // screen. New filenames avoid serving the old shared icon from cache.
    icons: [
      { src: '/icon-sales-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-sales-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-sales-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
