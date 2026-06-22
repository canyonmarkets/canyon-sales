import { createClient } from '@supabase/supabase-js'

// Same Vending-Dash Supabase project the kiosk + dashboard use.
// Publishable (anon) key — safe to ship in the client bundle.
// NOTE (pre-publish): kiosk_sales is currently anon-readable. Before this
// dashboard goes public, gate it behind auth + restrict kiosk_sales SELECT.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://zgmxmficzvlpzkosdcnx.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_MUAaPltQkyDFsR0NvLTikQ_gY_pfJFy'

// persistSession + autoRefreshToken keep the operator logged in indefinitely on
// their device (session is stored and silently refreshed) — log in once, stay in
// until "Sign out". storageKey is app-specific so it never collides with the
// kiosk / vending-dash sessions on the same machine.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'canyon-sales-auth',
  },
})
