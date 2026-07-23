import type { SettlementCategory, SettlementItem } from './types'

/**
 * 월정산 시트의 구조 정의.
 * 화면(월정산·인건비)과 서버 액션이 같은 정의를 보고 움직이도록 한 곳에 모아둔다.
 */

export interface SectionDef {
  category: SettlementCategory
  title: string
  /** 이름 칸 placeholder — 뭘 적는 칸인지 바로 알게 */
  namePlaceholder: string
  /** 비용 그룹 묶음 제목 (인건비처럼 두 그룹이 한 덩어리인 경우) */
  group?: string
}

export const SECTIONS: SectionDef[] = [
  {
    category: 'labor_staff',
    title: '직원',
    namePlaceholder: '직원 이름',
    group: '인건비',
  },
  {
    category: 'labor_part',
    title: '알바',
    namePlaceholder: '알바 이름',
    group: '인건비',
  },
  {
    category: 'food',
    title: '식자재 비용',
    namePlaceholder: '거래처 / 항목명',
  },
  {
    category: 'marketing',
    title: '마케팅 및 기타',
    namePlaceholder: '항목명 (예: 배민 광고비)',
  },
  {
    category: 'fixed',
    title: '고정비용',
    namePlaceholder: '항목명 (예: 임대료)',
  },
]

/** 최종 요약에 쓰는 4개 비용 묶음 */
export const COST_GROUPS = [
  { label: '총 인건비', categories: ['labor_staff', 'labor_part'] },
  { label: '식자재비용', categories: ['food'] },
  { label: '마케팅 및 기타', categories: ['marketing'] },
  { label: '고정비용', categories: ['fixed'] },
] as const

export const ALL_CATEGORIES: SettlementCategory[] = [
  'labor_staff',
  'labor_part',
  'food',
  'marketing',
  'fixed',
]

/** 인건비 화면에서만 다루는 카테고리 */
export const LABOR_CATEGORIES: SettlementCategory[] = [
  'labor_staff',
  'labor_part',
]

export function sumItems(
  items: Pick<SettlementItem, 'category' | 'amount'>[],
  categories: readonly SettlementCategory[]
): number {
  return items
    .filter((i) => categories.includes(i.category))
    .reduce((s, i) => s + (Number(i.amount) || 0), 0)
}

/** 총 비용 = 인건비 + 식자재 + 마케팅및기타 + 고정비 */
export function totalCost(
  items: Pick<SettlementItem, 'category' | 'amount'>[]
): number {
  return sumItems(items, ALL_CATEGORIES)
}

/** 총 수익 = 총매출 − 총 비용 */
export function netProfit(
  totalSales: number,
  items: Pick<SettlementItem, 'category' | 'amount'>[]
): number {
  return totalSales - totalCost(items)
}

/** 'YYYY-MM' → '2026년 7월' */
export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}년 ${Number(m)}월`
}

/** 오늘이 속한 'YYYY-MM' */
export function currentYm(iso: string): string {
  return iso.slice(0, 7)
}

/** 'YYYY-MM' 을 n개월 이동 */
export function shiftYm(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
