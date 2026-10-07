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

// Only these market kiosks belong in this sales report. Pantry machines
// (e.g. CP1 "Clayco Pantry") are wired up completely separately — billed
// monthly, untaxed, not a Stripe charge — and their demo/real rows must NEVER
// appear here. We filter to this allowlist at the query so nothing outside the
// markets can leak into any total, now or when new machine_codes appear.
const MARKET_CODES = ['SF1', 'SF2', 'CC1', 'CC2', 'MB1'] as const

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
  // Shift into Phoenix time, then format the shifted instant as UTC — formatting
  // in the runtime's local timezone would double-apply an offset and mislabel
  // the range by a day (e.g. on a phone already set to Phoenix time).
  const fmt = (d: Date) =>
    new Date(d.getTime() + PHX_OFFSET_MIN * 60000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
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

/**
 * Fetch every matching row in pages of 1000. Supabase caps a single select at
 * 1000 rows by default — without paging, busy ranges (Last 30 / the 90-day
 * overview) silently truncate and understate revenue.
 */
async function fetchAllRows(select: string, range: Range): Promise<Record<string, unknown>[]> {
  const PAGE = 1000
  const out: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('kiosk_sales')
      .select(select)
      .eq('status', 'PROCESSED')
      .in('machine_code', MARKET_CODES as unknown as string[])
      .gte('created_at', range.start.toISOString())
      .lt('created_at', range.end.toISOString())
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as Record<string, unknown>[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

/** All completed (PROCESSED) sales in the range, every store. */
export async function fetchSales(range: Range): Promise<SaleRow[]> {
  const data = await fetchAllRows('id, machine_code, subtotal, tax, total, created_at, items', range)
  return data.map((r: Record<string, unknown>) => ({
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
    // Pre-tax, so the trend/weekly panels agree with the headline Net Sales and
    // the dashboard (`total` here is the DayPoint field name, not the tax-inclusive total).
    if (b) { b.total += r.subtotal; b.orders += 1 }
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
  const data = await fetchAllRows('id, machine_code, subtotal, total, created_at', range)
  return data.map((r: Record<string, unknown>) => ({
    id: String(r.id), machine_code: (r.machine_code as string) ?? null,
    subtotal: num(r.subtotal), tax: 0, total: num(r.total), created_at: String(r.created_at), items: [],
  }))
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const weekdayOf = (key: string) => DOW[new Date(key + 'T00:00:00Z').getUTCDay()]
const phxTodayKey = () => new Date(Date.now() + PHX_OFFSET_MIN * 60000).toISOString().slice(0, 10)

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

// ── Same-weekday comparison ─────────────────────────────────────────────────
// "How do my last 4 Thursdays stack up?" — answered off the same rolling 90-day
// lite fetch the weekly panel already uses (≈12 shots at every weekday), so this
// costs no extra query.

export interface DayOccurrence extends DayPoint { dow: string; isToday: boolean }

/**
 * Days before a store's first sale are pre-open, not slow — averaging them in
 * would punish a new market (MB1) forever. Trim only the LEADING dead days; a
 * zero after opening is a real (bad) day and must still count.
 */
function trimPreOpen(pts: DayPoint[]): DayPoint[] {
  const i = pts.findIndex((p) => p.orders > 0)
  return i < 0 ? [] : pts.slice(i)
}

const decorate = (p: DayPoint, todayKey: string): DayOccurrence => ({
  ...p, dow: weekdayOf(p.key), isToday: p.key === todayKey,
})

export interface WeekdayStats {
  dowIndex: number
  dow: string
  dowLong: string
  /** Oldest → newest. Includes today when today IS this weekday (still partial). */
  occurrences: DayOccurrence[]
  /** Occurrences excluding a partial today — the only ones fair to average/rank. */
  completed: DayOccurrence[]
  avgTotal: number
  avgOrders: number
  avgTicket: number
  best: DayOccurrence | null
  worst: DayOccurrence | null
  /** Most recent COMPLETED occurrence. */
  latest: DayOccurrence | null
  /** Latest completed vs the average of the ones before it. Null under 2 data points. */
  pctVsPrior: number | null
  /** Store-wide averages across every completed day, for "is this weekday weak?" */
  allDayAvg: number
  allDayAvgOrders: number
  allDayAvgTicket: number
}

/** The last `count` occurrences of one weekday (0=Sun … 6=Sat) inside the window. */
export function weekdayStats(
  rows: SaleRow[], store: StoreCode, windowRange: Range, dowIndex: number, count = 4,
): WeekdayStats {
  const todayKey = phxTodayKey()
  const pts = trimPreOpen(dailySeries(rows, store, windowRange))
  const hits = pts
    .filter((p) => new Date(p.key + 'T00:00:00Z').getUTCDay() === dowIndex)
    .map((p) => decorate(p, todayKey))
  // Take the last `count` COMPLETED days, then re-attach a partial today so the
  // in-progress day is visible without stealing a comparison slot.
  const partialToday = hits.find((h) => h.isToday) ?? null
  const done = hits.filter((h) => !h.isToday)
  const shownDone = done.slice(-count)
  const occurrences = partialToday ? [...shownDone, partialToday] : shownDone

  const sum = (a: DayOccurrence[], k: 'total' | 'orders') => a.reduce((s, p) => s + p[k], 0)
  const avgTotal = shownDone.length ? sum(shownDone, 'total') / shownDone.length : 0
  const avgOrders = shownDone.length ? sum(shownDone, 'orders') / shownDone.length : 0
  const totalOrders = sum(shownDone, 'orders')

  const best = shownDone.reduce<DayOccurrence | null>((m, p) => (p.total > (m?.total ?? -1) ? p : m), null)
  const worst = shownDone.reduce<DayOccurrence | null>((m, p) => (p.total < (m?.total ?? Infinity) ? p : m), null)
  const latest = shownDone.length ? shownDone[shownDone.length - 1] : null
  const prior = shownDone.slice(0, -1)
  const priorAvg = prior.length ? sum(prior, 'total') / prior.length : 0
  const pctVsPrior = latest && priorAvg > 0 ? ((latest.total - priorAvg) / priorAvg) * 100 : null

  const completedDays = pts.filter((p) => p.key !== todayKey)
  const allTotal = completedDays.reduce((s, p) => s + p.total, 0)
  const allOrders = completedDays.reduce((s, p) => s + p.orders, 0)
  const allDayAvg = completedDays.length ? allTotal / completedDays.length : 0

  return {
    dowIndex, dow: DOW[dowIndex], dowLong: DOW_LONG[dowIndex],
    occurrences, completed: shownDone,
    avgTotal, avgOrders, avgTicket: totalOrders > 0 ? sum(shownDone, 'total') / totalOrders : 0,
    best, worst, latest, pctVsPrior,
    allDayAvg,
    allDayAvgOrders: completedDays.length ? allOrders / completedDays.length : 0,
    allDayAvgTicket: allOrders > 0 ? allTotal / allOrders : 0,
  }
}

export interface WeekdayAvg {
  dowIndex: number
  dow: string
  dowLong: string
  days: number          // completed occurrences averaged
  total: number
  orders: number
  avgTotal: number
  avgOrders: number
  avgTicket: number
}

/**
 * Every weekday averaged across the window — the "which days are dragging?" view.
 * Excludes a partial today and pre-open days for the same reasons as above.
 */
export function weekdayAverages(rows: SaleRow[], store: StoreCode, windowRange: Range): WeekdayAvg[] {
  const todayKey = phxTodayKey()
  const pts = trimPreOpen(dailySeries(rows, store, windowRange)).filter((p) => p.key !== todayKey)
  return DOW.map((_, dowIndex) => {
    const hits = pts.filter((p) => new Date(p.key + 'T00:00:00Z').getUTCDay() === dowIndex)
    const total = hits.reduce((s, p) => s + p.total, 0)
    const orders = hits.reduce((s, p) => s + p.orders, 0)
    return {
      dowIndex, dow: DOW[dowIndex], dowLong: DOW_LONG[dowIndex],
      days: hits.length, total, orders,
      avgTotal: hits.length ? total / hits.length : 0,
      avgOrders: hits.length ? orders / hits.length : 0,
      avgTicket: orders > 0 ? total / orders : 0,
    }
  })
}

// ── Format helpers ──────────────────────────────────────────────────────────
export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
