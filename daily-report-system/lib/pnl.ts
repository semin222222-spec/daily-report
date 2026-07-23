import type { DailyClosing, FixedCosts, Staff, StoreSettings } from './types'

/**
 * ─────────────────────────────────────────────────────────────
 * 손익 계산 — 단일 소스
 * ─────────────────────────────────────────────────────────────
 * 대시보드·일일 보고서·월정산이 전부 이 파일의 함수만 쓴다.
 * 화면마다 공식을 따로 쓰면 숫자가 어긋나므로 절대 인라인 계산하지 말 것.
 *
 *   총매출     = 카드 + 현금 + 배달 + 기타
 *   매출총이익 = 총매출 − 식자재 원가
 *   영업이익   = 매출총이익 − 인건비 − 고정비 − 당일 지출
 *
 * 일 단위에서는 인건비/고정비를 영업일수로 나눈 "일할" 금액을 쓰고,
 * 월 단위에서는 월 전액을 쓴다.
 */

/** 0으로 나누기 방지 — 매출 0인 날의 비율은 0%로 표시한다 */
function safeRate(part: number, whole: number): number {
  if (!whole) return 0
  return (part / whole) * 100
}

export const DEFAULT_SETTINGS = {
  monthly_goal: 0,
  target_cost_rate: 33,
  target_labor_rate: 20,
  business_days: 30,
} as const

/** 매장의 월 인건비 총액 — 월급직은 그대로, 시급직은 시급 × 월 근무시간 */
export function monthlyLabor(staff: Staff[]): number {
  return staff
    .filter((s) => s.is_active)
    .reduce(
      (sum, s) =>
        sum + (s.pay_type === 'monthly' ? s.rate : s.rate * s.work_hours),
      0
    )
}

/** 직원 1명의 이번 달 예상 급여 */
export function staffPay(s: Staff): number {
  return s.pay_type === 'monthly' ? s.rate : s.rate * s.work_hours
}

/** 매장의 월 고정비 총액 */
export function monthlyFixed(fc: FixedCosts | null): number {
  if (!fc) return 0
  return fc.rent + fc.mgmt + fc.utility + fc.insurance_etc
}

/** 하루치 매출 합계 */
export function closingSales(c: DailyClosing): number {
  return c.sales_card + c.sales_cash + c.sales_delivery + c.sales_etc
}

export interface DailyPnl {
  sales: number
  cost: number
  grossProfit: number
  labor: number // 일할
  fixed: number // 일할
  expense: number
  operatingProfit: number
  costRate: number
  laborRate: number
  fixedRate: number
  marginRate: number
  guests: number
  avgTicket: number // 객단가
  /** 손익분기 일매출 — 목표 원가율을 유지한다고 가정했을 때 */
  bepSales: number
  aboveBep: boolean
}

export interface PnlInputs {
  staff: Staff[]
  fixedCosts: FixedCosts | null
  settings: StoreSettings | null
  /**
   * 그 달 월정산 시트에 적힌 실제 인건비 / 고정비 합계.
   *
   * 시트에 값이 적혀 있으면 그게 진짜 나간 돈이므로 무조건 우선한다.
   * 시트가 비어 있으면(아직 안 적었으면) 직원 명단·고정비 설정으로 추정한다.
   * 이 우선순위 덕분에 화면마다 인건비가 달라지는 일이 없다.
   */
  laborOverride?: number | null
  fixedOverride?: number | null
}

/** 이 매장·이 달의 월 인건비 총액 (시트 우선) */
export function resolveLabor(i: PnlInputs): number {
  return i.laborOverride ?? monthlyLabor(i.staff)
}

/** 이 매장·이 달의 월 고정비 총액 (시트 우선) */
export function resolveFixed(i: PnlInputs): number {
  return i.fixedOverride ?? monthlyFixed(i.fixedCosts)
}

/** 하루치 손익 */
export function calcDaily(
  closing: DailyClosing | null,
  inputs: PnlInputs
): DailyPnl {
  const { settings } = inputs
  const businessDays = settings?.business_days || DEFAULT_SETTINGS.business_days
  const targetCostRate =
    settings?.target_cost_rate ?? DEFAULT_SETTINGS.target_cost_rate

  const sales = closing ? closingSales(closing) : 0
  const cost = closing?.cost ?? 0
  const expense = closing?.expense ?? 0
  const guests = closing?.guests ?? 0

  const labor = resolveLabor(inputs) / businessDays
  const fixed = resolveFixed(inputs) / businessDays

  const grossProfit = sales - cost
  const operatingProfit = grossProfit - labor - fixed - expense

  // 원가율이 100% 이상이면 BEP가 성립하지 않으므로 무한대 대신 0을 준다
  const contribution = 1 - targetCostRate / 100
  const bepSales = contribution > 0 ? (labor + fixed) / contribution : 0

  return {
    sales,
    cost,
    grossProfit,
    labor,
    fixed,
    expense,
    operatingProfit,
    costRate: safeRate(cost, sales),
    laborRate: safeRate(labor, sales),
    fixedRate: safeRate(fixed, sales),
    marginRate: safeRate(operatingProfit, sales),
    guests,
    avgTicket: guests > 0 ? sales / guests : 0,
    bepSales,
    aboveBep: sales >= bepSales && sales > 0,
  }
}

export interface MonthlyPnl {
  sales: number
  cost: number
  grossProfit: number
  labor: number // 월 전액
  fixed: number // 월 전액
  expense: number
  operatingProfit: number
  costRate: number
  laborRate: number
  fixedRate: number
  marginRate: number
  guests: number
  avgTicket: number
  closedDays: number // 마감 입력된 날 수
  avgDailySales: number
}

/** 한 달 누적 손익 — 인건비·고정비는 일할하지 않고 월 전액을 반영한다 */
export function calcMonthly(
  closings: DailyClosing[],
  inputs: PnlInputs
): MonthlyPnl {
  const sales = closings.reduce((s, c) => s + closingSales(c), 0)
  const cost = closings.reduce((s, c) => s + c.cost, 0)
  const expense = closings.reduce((s, c) => s + c.expense, 0)
  const guests = closings.reduce((s, c) => s + c.guests, 0)

  const labor = resolveLabor(inputs)
  const fixed = resolveFixed(inputs)

  const grossProfit = sales - cost
  const operatingProfit = grossProfit - labor - fixed - expense
  const closedDays = closings.length

  return {
    sales,
    cost,
    grossProfit,
    labor,
    fixed,
    expense,
    operatingProfit,
    costRate: safeRate(cost, sales),
    laborRate: safeRate(labor, sales),
    fixedRate: safeRate(fixed, sales),
    marginRate: safeRate(operatingProfit, sales),
    guests,
    avgTicket: guests > 0 ? sales / guests : 0,
    closedDays,
    avgDailySales: closedDays > 0 ? sales / closedDays : 0,
  }
}

export interface PeriodPnl {
  sales: number
  cost: number
  profit: number
  days: number // 마감이 입력된 날 수
  guests: number
}

/**
 * 임의 기간(일·주·월)의 합산.
 *
 * 인건비·고정비는 "마감된 날 수 × 일할 금액"으로 잡는다.
 * 이렇게 해야 일 + 일 + ... = 주 = 월 이 정확히 맞아떨어져서
 * 대시보드의 세 숫자를 나란히 놓고 비교할 수 있다.
 *
 * ※ 월정산 화면은 이것과 달리 월 전액(실제 지출액)을 쓴다.
 *    거기는 "실제로 나간 돈"을 봐야 하는 정산 문서이기 때문.
 */
export function calcPeriod(
  closings: DailyClosing[],
  inputs: PnlInputs
): PeriodPnl {
  const businessDays =
    inputs.settings?.business_days || DEFAULT_SETTINGS.business_days

  const sales = closings.reduce((s, c) => s + closingSales(c), 0)
  const cost = closings.reduce((s, c) => s + c.cost, 0)
  const expense = closings.reduce((s, c) => s + c.expense, 0)
  const guests = closings.reduce((s, c) => s + c.guests, 0)
  const days = closings.length

  const dailyLabor = resolveLabor(inputs) / businessDays
  const dailyFixed = resolveFixed(inputs) / businessDays

  return {
    sales,
    cost,
    profit: sales - cost - expense - (dailyLabor + dailyFixed) * days,
    days,
    guests,
  }
}

/** 전일 대비 증감률 (%) */
export function deltaRate(today: number, prev: number): number {
  if (!prev) return 0
  return ((today - prev) / prev) * 100
}
