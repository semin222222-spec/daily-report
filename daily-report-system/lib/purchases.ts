import { toISODate } from './format'
import type { PurchaseEntry } from './types'

/**
 * 거래처 매입 현황 — 엑셀 「거래처 매입 현황」의 구조 정의.
 *
 * 엑셀은 한 거래처가 블록 하나이고, 블록 안이 "주(週) 5칸 × 요일 7줄" 격자다.
 * 1주는 1일이 무슨 요일인지에 따라 위가 비어 있고(예: 7월 1일이 수요일이면
 * 월·화 칸이 빈다), 마지막 주는 아래가 빈다. 그 규칙을 monthWeeks 가 만든다.
 *
 * 화면(요약표·거래처 블록·비율표)과 서버 액션이 같은 정의를 보고 움직이도록
 * 한 곳에 모아둔다.
 */

/** 처음 쓰는 매장에 한 번에 넣어주는 기본 거래처 (엑셀 열 순서 그대로) */
export const DEFAULT_VENDORS = [
  '동원',
  '태산(고기)',
  '심도주류',
  '조한유통',
  '포정',
  '네이버',
  '오더히어로',
  '쿠팡',
]

/** 격자의 줄 = 요일. 엑셀과 같이 월요일이 맨 위 */
export const WEEKDAY_KO = ['월', '화', '수', '목', '금', '토', '일'] as const

export interface PurchaseWeek {
  /** 1부터 */
  no: number
  /** '1주' */
  label: string
  /** 월~일 7칸. 이 달에 속하지 않는 칸은 null (엑셀의 빈 칸) */
  days: (string | null)[]
  /** 이 주의 첫날·마지막날 (달 안쪽으로 자른 값) */
  start: string
  end: string
}

/**
 * 'YYYY-MM' → 그 달을 덮는 주(월~일) 목록.
 * 달의 첫 주는 위가, 마지막 주는 아래가 빌 수 있다.
 * 달 시작 요일에 따라 4~6주가 나온다 (엑셀은 5주 고정이었지만 계산해서 맞춘다).
 */
export function monthWeeks(ym: string): PurchaseWeek[] {
  const [y, m] = ym.split('-').map(Number)
  const lastDate = new Date(y, m, 0).getDate() // 다음 달 0일 = 이번 달 말일
  const weeks: PurchaseWeek[] = []

  let cursor = 1
  while (cursor <= lastDate) {
    // getDay(): 0=일 → 0=월 로 옮긴다
    const dow = (new Date(y, m - 1, cursor).getDay() + 6) % 7
    const days: (string | null)[] = Array(7).fill(null)

    let day = cursor
    for (let i = dow; i < 7 && day <= lastDate; i++, day++) {
      days[i] = toISODate(new Date(y, m - 1, day))
    }

    const filled = days.filter((d): d is string => d !== null)
    weeks.push({
      no: weeks.length + 1,
      label: `${weeks.length + 1}주`,
      days,
      start: filled[0],
      end: filled[filled.length - 1],
    })
    cursor = day
  }

  return weeks
}

/** '2026-07-13' → '13' — 격자 칸에 붙이는 날짜 라벨 */
export function dayLabel(iso: string): string {
  return String(Number(iso.slice(8, 10)))
}

/** 칸 하나의 키. 클라이언트 상태·서버 payload가 같은 키를 쓴다 */
export function cellKey(vendorId: string, date: string): string {
  return `${vendorId}|${date}`
}

/** 매입 줄 목록 → { 'vendorId|date': 금액 } */
export function toAmountMap(entries: PurchaseEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of entries) {
    if (e.amount) out[cellKey(e.vendor_id, e.date)] = Number(e.amount) || 0
  }
  return out
}

/** 특정 거래처 × 특정 주의 합계 */
export function sumWeek(
  amounts: Record<string, number>,
  vendorId: string,
  week: PurchaseWeek
): number {
  return week.days.reduce(
    (s, d) => s + (d ? amounts[cellKey(vendorId, d)] || 0 : 0),
    0
  )
}

/** 특정 거래처의 그 달 합계 */
export function sumVendor(
  amounts: Record<string, number>,
  vendorId: string,
  weeks: PurchaseWeek[]
): number {
  return weeks.reduce((s, w) => s + sumWeek(amounts, vendorId, w), 0)
}

/** 한 주의 전체 거래처 합계 */
export function sumWeekAll(
  amounts: Record<string, number>,
  vendorIds: string[],
  week: PurchaseWeek
): number {
  return vendorIds.reduce((s, v) => s + sumWeek(amounts, v, week), 0)
}

/** 그 달 전체 합계 */
export function sumMonth(
  amounts: Record<string, number>,
  vendorIds: string[],
  weeks: PurchaseWeek[]
): number {
  return weeks.reduce((s, w) => s + sumWeekAll(amounts, vendorIds, w), 0)
}

/** 매입 ÷ 매출 (%) — 매출이 0이면 0% */
export function purchaseRate(purchase: number, sales: number): number {
  if (!sales) return 0
  return (purchase / sales) * 100
}
