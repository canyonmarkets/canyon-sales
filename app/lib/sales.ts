import { supabase } from './supabase'

// ── Stores ────────────────────────────────────────────────────────────────
export type StoreCode = 'ALL' | 'SF1' | 'SF2' | 'CC1' | 'CC2' | 'MB1'
export const STORES: { code: StoreCode; label: string; short: string }[] = [
  { code: 'ALL', label: 'All Stores',     short: 'All' },
  { code: 'SF1', label: 'Steel Fab 1',    short: 'SF1' },
  { code: 'SF2', label: 'Steel Fab 2',    short: 'SF2' },
  { code: 'CC1', label: 'Call Center 1',  short: 'CC1' },
  { code: 'CC2', label: 'Call Center 2',  short: 'CC2' },
  // Mirabella micro-market (coming online ~mid-July 2026). The kiosk installed
  // there MUST report machine_code = 'MB1' for its sales to land under this pill.
  { code: 'MB1', label: 'Mirabella',      short: 'MB1' },
]

// ── Date presets (America/Phoenix, fixed UTC-7, no DST) ─────────────────────
export type PresetKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'
export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7',     label: 'Last 7' },
  { key: 'last30',    label: 'Last 30' },
  { key: 'custom',    label: 'Custom' },
]

const PHX_OFFSET_MIN = -7 * 60

/** Phoenix midnight, `daysAgo` days back, as a real UTC instant. */
function startOfPhxDay(daysAgo: number): Date {
  const phx = new Date(Date.now() + PHX_OFFSET_MIN * 60000)
  phx.setUTCHours(0, 0, 0, 0)
  phx.setUTCDate(phx.getUTCDate() - daysAgo)
  return new Date(phx.getTime() - PHX_OFFSET_MIN * 60000)
}
/** 'YYYY-MM-DD' (Phoenix calendar day) → UTC instant of that day's midnight. */
function phxDateToUTC(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day, 0, 0, 0) - PHX_OFFSET_MIN * 60000)
}
/** Today's Phoenix calendar date as 'YYYY-MM-DD' (for the custom inputs default). */
export function phxToday(): string {
  const phx = new Date(Date.now() + PHX_OFFSET_MIN * 60000)
  return phx.toISOString().slice(0, 10)
}

export interface Range { start: Date; end: Date; label: string }

export function resolveRange(preset: PresetKey, customStart?: string, customEnd?: string): Range {
  const now = new Date()
  const fmt = (d: Date) =>
    new Date(d.getTime() + PHX_OFFSET_MIN * 60000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  switch (preset) {
    case 'today':     { const s = startOfPhxDay(0);  return { start: s, end: now, label: 'Today' } }
    case 'yesterday': { const s = startOfPhxDay(1), e = startOfPhxDay(0); return { start: s, end: e, label: 'Yesterday' } }
    case 'last7':     { const s = startOfPhxDay(6);  return { start: s, end: now, label: `${fmt(s)} – Today` } }
    case 'last30':    { const s = startOfPhxDay(29); return { start: s, end: now, label: `${fmt(s)} – Today` } }
    case 'custom': {
      const cs = customStart || phxToday()
      const ce = customEnd || cs
      const s = phxDateToUTC(cs)
      const e = new Date(phxDateToUTC(ce).getTime() + 24 * 60 * 60000) // inclusive end day
      return { start: s, end: e, label: `${fmt(s)} – ${fmt(new Date(e.getTime() - 1))}` }
    }
  }
}

// ── Data ────────────────────────────────────────────────────────────────────
export interface SaleItem { qty: number; name: string; unitPrice: number; productId?: string }
export interface SaleRow {
  id: string
  machine_code: string | null
  subtotal: number
  tax: number
  total: number
  created_at: string
  items: SaleItem[]
}

/** All completed (PROCESSED) sales in the range, every store. */
export async function fetchSales(range: Range): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from('kiosk_sales')
    .select('id, machine_code, subtotal, tax, total, created_at, items')
    .eq('status', 'PROCESSED')
    .gte('created_at', range.start.toISOString())
    .lt('created_at', range.end.toISOString())
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    machine_code: (r.machine_code as string) ?? null,
    subtotal: num(r.subtotal),
    tax: num(r.tax),
    total: num(r.total),
    created_at: String(r.created_at),
    items: Array.isArray(r.items) ? (r.items as SaleItem[]) : [],
  }))
}

const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0)
const inStore = (r: SaleRow, store: StoreCode) => store === 'ALL' || r.machine_code === store

// ── Aggregations ──────────────────────────────────────────────────────────
export interface Summary { gross: number; net: number; tax: number; total: number; orders: number; itemCount: number }
export function summarize(rows: SaleRow[], store: StoreCode): Summary {
  const f = rows.filter((r) => inStore(r, store))
  const gross = f.reduce((s, r) => s + r.subtotal, 0) // no discounts → gross = net
  const tax   = f.reduce((s, r) => s + r.tax, 0)
  const total = f.reduce((s, r) => s + r.total, 0)
  const itemCount = f.reduce((s, r) => s + r.items.reduce((q, it) => q + (it.qty ?? 0), 0), 0)
  return { gross, net: gross, tax, total, orders: f.length, itemCount }
}

export interface ItemAgg { name: string; qty: number; sales: number }
export function itemSales(rows: SaleRow[], store: StoreCode): ItemAgg[] {
  const map = new Map<string, ItemAgg>()
  for (const r of rows) {
    if (!inStore(r, store)) continue
    for (const it of r.items) {
      const name = (it.name ?? 'Unknown').trim()
      const cur = map.get(name) ?? { name, qty: 0, sales: 0 }
      cur.qty += it.qty ?? 0
      cur.sales += (it.qty ?? 0) * (it.unitPrice ?? 0)
      map.set(name, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.sales - a.sales)
}

export interface DayPoint { key: string; label: string; total: number; orders: number }
/** Per-Phoenix-day totals across the whole range, including empty days. */
export function dailySeries(rows: SaleRow[], store: StoreCode, range: Range): DayPoint[] {
  const dayMs = 24 * 60 * 60000
  const buckets = new Map<string, DayPoint>()
  // seed every day in the range so gaps render as zero
  const startDay = new Date(new Date(range.start.getTime() + PHX_OFFSET_MIN * 60000).setUTCHours(0, 0, 0, 0))
  for (let t = startDay.getTime(); t < range.end.getTime() + PHX_OFFSET_MIN * 60000; t += dayMs) {
    const d = new Date(t)
    const key = d.toISOString().slice(0, 10)
    // Label from the Phoenix date key (UTC-interpreted) so it can't drift a day
    // based on the runtime's local timezone.
    const label = new Date(key + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    buckets.set(key, { key, label, total: 0, orders: 0 })
  }
  for (const r of rows) {
    if (!inStore(r, store)) continue
    const key = new Date(new Date(r.created_at).getTime() + PHX_OFFSET_MIN * 60000).toISOString().slice(0, 10)
    const b = buckets.get(key)
    if (b) { b.total += r.total; b.orders += 1 }
  }
  return [...buckets.values()]
}

// ── Overview (rolling window, independent of the page date filter) ──────────
/** A Range covering the last N Phoenix days (including today). */
export function lastNDaysRange(days: number): Range {
  return { start: startOfPhxDay(days - 1), end: new Date(), label: `Last ${days} days` }
}

/** Lightweight fetch (no line items) for the trend/records panels. */
export async function fetchSalesLite(range: Range): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from('kiosk_sales')
    .select('id, machine_code, total, created_at')
    .eq('status', 'PROCESSED')
    .gte('created_at', range.start.toISOString())
    .lt('created_at', range.end.toISOString())
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id), machine_code: (r.machine_code as string) ?? null,
    subtotal: 0, tax: 0, total: num(r.total), created_at: String(r.created_at), items: [],
  }))
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const weekdayOf = (key: string) => DOW[new Date(key + 'T00:00:00Z').getUTCDay()]

export interface WeekStats {
  series: (DayPoint & { dow: string; isToday: boolean })[]
  weekTotal: number
  weekTxns: number
  prevWeekTotal: number
  pctChange: number | null     // this 7d vs prior 7d; null when no prior baseline
  bestDay: DayPoint | null
  dailyAvg: number
  busiest: { dow: string; avg: number } | null
}

/** Week-over-week + records over a rolling window (default 7-day view). */
export function weekStats(rows: SaleRow[], store: StoreCode, windowRange: Range): WeekStats {
  const pts = dailySeries(rows, store, windowRange)
  const todayKey = new Date(Date.now() + PHX_OFFSET_MIN * 60000).toISOString().slice(0, 10)
  const last7 = pts.slice(-7)
  const prev7 = pts.slice(-14, -7)
  const sum = (a: DayPoint[], k: 'total' | 'orders') => a.reduce((s, p) => s + p[k], 0)
  const weekTotal = sum(last7, 'total')
  const prevWeekTotal = sum(prev7, 'total')
  const pctChange = prevWeekTotal > 0 ? ((weekTotal - prevWeekTotal) / prevWeekTotal) * 100 : null
  const bestDay = pts.reduce<DayPoint | null>((m, p) => (p.total > (m?.total ?? -1) ? p : m), null)
  const agg = new Map<number, { t: number; n: number }>()
  for (const p of pts) {
    const d = new Date(p.key + 'T00:00:00Z').getUTCDay()
    const c = agg.get(d) ?? { t: 0, n: 0 }
    c.t += p.total; c.n += 1; agg.set(d, c)
  }
  let busiest: { dow: string; avg: number } | null = null
  for (const [d, c] of agg) { const avg = c.t / c.n; if (avg > 0 && (!busiest || avg > busiest.avg)) busiest = { dow: DOW[d], avg } }
  return {
    series: last7.map((p) => ({ ...p, dow: weekdayOf(p.key), isToday: p.key === todayKey })),
    weekTotal, weekTxns: sum(last7, 'orders'), prevWeekTotal, pctChange, bestDay, dailyAvg: weekTotal / 7, busiest,
  }
}

// ── Format helpers ──────────────────────────────────────────────────────────
export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
