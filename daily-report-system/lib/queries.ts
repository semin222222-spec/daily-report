import { cache } from 'react'
import { createClient } from './supabase/server'
import { toISODate, parseISODate } from './format'
import type {
  DailyClosing,
  FixedCosts,
  MonthlySettlement,
  PurchaseEntry,
  PurchaseVendor,
  PurchaseWeekNote,
  Reservation,
  Review,
  SettlementCategory,
  SettlementItem,
  Staff,
  StoreSettings,
  Todo,
} from './types'
import type { PnlInputs } from './pnl'

/**
 * 손익 계산에 필요한 매장 부속 데이터(직원·고정비·설정)를 한 번에 가져온다.
 * 모든 손익 화면이 이걸로 시작한다.
 */
export const getPnlInputs = cache(async function getPnlInputs(
  storeId: string,
  /**
   * 'YYYY-MM'. 주면 그 달 월정산 시트에 적힌 실제 인건비·고정비를 우선 적용한다.
   * 안 주면 직원 명단·고정비 설정으로 추정한다.
   */
  ym?: string
): Promise<PnlInputs> {
  const supabase = createClient()

  const [staffRes, fixedRes, settingsRes] = await Promise.all([
    supabase.from('staff').select('*').eq('store_id', storeId).eq('is_active', true),
    supabase.from('fixed_costs').select('*').eq('store_id', storeId).maybeSingle(),
    supabase.from('store_settings').select('*').eq('store_id', storeId).maybeSingle(),
  ])

  const base: PnlInputs = {
    staff: (staffRes.data ?? []) as Staff[],
    fixedCosts: (fixedRes.data ?? null) as FixedCosts | null,
    settings: (settingsRes.data ?? null) as StoreSettings | null,
  }

  if (!ym) return base

  const { items } = await getSettlement(storeId, ym)
  if (items.length === 0) return base

  const sumOf = (cats: SettlementCategory[]) =>
    items
      .filter((i) => cats.includes(i.category))
      .reduce((s, i) => s + Number(i.amount || 0), 0)

  const labor = sumOf(['labor_staff', 'labor_part'])
  const fixed = sumOf(['fixed'])

  return {
    ...base,
    // 0원짜리 시트(아직 안 적음)는 무시하고 추정값을 그대로 쓴다
    laborOverride: labor > 0 ? labor : null,
    fixedOverride: fixed > 0 ? fixed : null,
  }
})

/** 특정 날짜의 마감 (없으면 null) */
export async function getClosing(
  storeId: string,
  date: string
): Promise<DailyClosing | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('store_id', storeId)
    .eq('date', date)
    .maybeSingle()
  return (data ?? null) as DailyClosing | null
}

/** 기간 내 마감 목록 (날짜 오름차순) */
export async function getClosingsBetween(
  storeId: string,
  from: string,
  to: string
): Promise<DailyClosing[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('store_id', storeId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
  return (data ?? []) as DailyClosing[]
}

/** 가장 최근에 마감된 날 (없으면 null) */
export async function getLatestClosing(
  storeId: string
): Promise<DailyClosing | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('store_id', storeId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data ?? null) as DailyClosing | null
}

/** 해당 월(1~12)의 마감 목록 */
export async function getMonthClosings(
  storeId: string,
  year: number,
  month: number
): Promise<DailyClosing[]> {
  const from = toISODate(new Date(year, month - 1, 1))
  const to = toISODate(new Date(year, month, 0)) // 다음 달 0일 = 이번 달 말일
  return getClosingsBetween(storeId, from, to)
}

/** anchor 날짜를 마지막으로 하는 최근 N일 — 마감이 없는 날은 매출 0으로 채운다 */
export async function getRecentDays(
  storeId: string,
  anchor: string,
  days = 7
): Promise<Array<{ date: string; closing: DailyClosing | null }>> {
  const end = parseISODate(anchor)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))

  const rows = await getClosingsBetween(storeId, toISODate(start), anchor)
  const byDate = new Map(rows.map((r) => [r.date, r]))

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const iso = toISODate(d)
    return { date: iso, closing: byDate.get(iso) ?? null }
  })
}

export async function getTodos(storeId: string): Promise<Todo[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('store_id', storeId)
    .order('done', { ascending: true })
    .order('created_at', { ascending: false })
  return (data ?? []) as Todo[]
}

/** 기간 내 예약 (시간 오름차순 — 시간 미정은 맨 뒤로 보낸다) */
export async function getReservationsBetween(
  storeId: string,
  from: string,
  to: string
): Promise<Reservation[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('reservations')
    .select('*')
    .eq('store_id', storeId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .order('created_at', { ascending: true })
  const rows = (data ?? []) as Reservation[]
  // 'HH:MM' 텍스트 정렬이라 빈 문자열(시간 미정)이 앞에 온다. 뒤로 돌린다.
  return [
    ...rows.filter((r) => r.time),
    ...rows.filter((r) => !r.time),
  ]
}

export async function getReviews(storeId: string, limit = 50): Promise<Review[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('store_id', storeId)
    .order('posted_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Review[]
}

/**
 * 월정산 시트 + 항목.
 * 시트가 없으면(그 달을 아직 안 만들었으면) null과 빈 배열을 준다.
 * 화면에서 빈 시트로 시작해 저장할 때 만들어진다.
 */
export const getSettlement = cache(async function getSettlement(
  storeId: string,
  ym: string
): Promise<{ settlement: MonthlySettlement | null; items: SettlementItem[] }> {
  const supabase = createClient()

  const { data: settlement } = await supabase
    .from('monthly_settlements')
    .select('*')
    .eq('store_id', storeId)
    .eq('ym', ym)
    .maybeSingle()

  if (!settlement) return { settlement: null, items: [] }

  const { data: items } = await supabase
    .from('settlement_items')
    .select('*')
    .eq('settlement_id', settlement.id)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  return {
    settlement: settlement as MonthlySettlement,
    items: (items ?? []) as SettlementItem[],
  }
})

/**
 * 매입 거래처 목록 (엑셀 열 순서).
 * 거래를 끊은 곳(is_active=false)도 과거 기록을 보려면 필요하므로 전부 준다.
 * 입력 격자에 그릴지 말지는 화면이 is_active 로 판단한다.
 */
export async function getPurchaseVendors(
  storeId: string
): Promise<PurchaseVendor[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('purchase_vendors')
    .select('*')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []) as PurchaseVendor[]
}

/**
 * 그 달의 매입 칸 + 주별 비고.
 * 요약표·거래처 블록·비율표가 모두 이 한 번의 조회로 그려진다.
 */
export async function getPurchaseMonth(
  storeId: string,
  ym: string
): Promise<{ entries: PurchaseEntry[]; notes: PurchaseWeekNote[] }> {
  const [y, m] = ym.split('-').map(Number)
  const from = toISODate(new Date(y, m - 1, 1))
  const to = toISODate(new Date(y, m, 0))

  const supabase = createClient()
  const [entryRes, noteRes] = await Promise.all([
    supabase
      .from('purchase_entries')
      .select('*')
      .eq('store_id', storeId)
      .gte('date', from)
      .lte('date', to),
    supabase
      .from('purchase_week_notes')
      .select('*')
      .eq('store_id', storeId)
      .eq('ym', ym),
  ])

  return {
    entries: (entryRes.data ?? []) as PurchaseEntry[],
    notes: (noteRes.data ?? []) as PurchaseWeekNote[],
  }
}

export async function getStaff(storeId: string): Promise<Staff[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('staff')
    .select('*')
    .eq('store_id', storeId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true })
  return (data ?? []) as Staff[]
}
