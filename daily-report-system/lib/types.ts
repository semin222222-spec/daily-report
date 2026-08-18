/** 삐딱 데일리 리포트 — DB 행 타입 (supabase/migrations 스키마와 1:1) */

export type Role = 'owner' | 'manager'
export type PayType = 'hourly' | 'monthly'
export type Assignee = '홀' | '주방' | '점장'
export type ReviewSource = 'naver' | 'kakao'
export type StoreKind = 'main' | 'franchise'

export interface Store {
  id: string
  name: string // '삐딱'
  branch: string // '을지로점' — 없으면 빈 문자열
  /**
   * 브랜드 키. 같은 브랜드의 지점끼리 로고(/logos/{brand}.png)와 컬러를 공유한다.
   * 첫 매장은 tag 와 같고, 지점을 추가하면 원래 브랜드를 물려받는다.
   */
  brand: string
  tag: string // 'bbiddak-mullae' — 매장 고유 키 (매장마다 다르다)
  color: string // '#f0542d'
  badge: string // '삐' — 사이드바/스위처의 한 글자 배지
  kind: StoreKind
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  login_id: string // 'admin' | 'bbiddak' — 아이디 로그인용
  name: string
  role: Role
  store_id: string | null // owner는 null
  /** 메뉴별 권한 { '/closing': 'view', ... }. 없으면 전부 edit */
  permissions: Record<string, 'hidden' | 'view' | 'edit'>
  created_at: string
}

export interface DailyClosing {
  id: string
  store_id: string
  date: string // 'YYYY-MM-DD'
  guests: number
  sales_card: number
  sales_cash: number
  sales_delivery: number
  sales_etc: number
  cost: number // 식자재 매입(원가)
  expense: number // 당일 지출(소모품 등)
  memo: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type EmpType = '직원' | '알바'

export interface Staff {
  id: string
  store_id: string
  name: string
  position: string // 홀 / 주방 / 점장
  emp_type: EmpType // 스케줄표의 "구분" 열
  pay_type: PayType
  rate: number // 시급 또는 월급
  work_hours: number // 시급직의 월 근무시간
  is_active: boolean
  /** 보건증 발급일. 만료일은 +1년으로 계산한다 */
  health_cert_issued: string | null
  health_cert_memo: string
  created_at: string
}

/** 스케줄 셀 하나 = 직원 1명의 하루 */
export interface Shift {
  id: string
  store_id: string
  staff_id: string
  date: string // 'YYYY-MM-DD'
  code: string // 출근 / 휴무 / 홀 / 주방 / 오픈 / 마감 …
  memo: string
  created_at: string
  updated_at: string
}

/** 날짜별 근무인원 목표·특이사항 (스케줄표 하단) */
export interface ScheduleDay {
  id: string
  store_id: string
  date: string
  target_kitchen: number
  target_hall: number
  note: string
  /** 공휴일·대체공휴일 등 빨간날 */
  is_holiday: boolean
  holiday_name: string
  updated_at: string
}

export type SettlementCategory =
  | 'labor_staff' // 인건비 · 직원
  | 'labor_part' // 인건비 · 알바
  | 'food' // 식자재 비용
  | 'marketing' // 마케팅 및 기타
  | 'fixed' // 고정비용
  | 'etc' // 특이사항 및 기타

/** 월정산 시트 (매장 × 월 1건) */
export interface MonthlySettlement {
  id: string
  store_id: string
  ym: string // 'YYYY-MM'
  total_sales: number
  sales_auto: boolean // true면 일마감 합계를 따라간다
  memo: string
  created_by: string | null
  created_at: string
  updated_at: string
}

/** 월정산 시트의 항목 한 줄 */
export interface SettlementItem {
  id: string
  settlement_id: string
  store_id: string
  category: SettlementCategory
  name: string
  amount: number
  /** 알바(labor_part) 전용 — 시급 × 시간. 그 외 카테고리는 0 */
  rate: number
  hours: number
  sort_order: number
  created_at: string
}

export type ReportPeriod = 'weekly' | 'monthly'

/** 점장보고서 — 엑셀 시안의 6개 섹션 */
export interface ManagerReport {
  id: string
  store_id: string
  period_type: ReportPeriod
  period_start: string
  period_end: string
  sales_analysis: string
  cost_analysis: string
  inventory: string
  customer_service: string
  staff_performance: string
  etc: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FixedCosts {
  id: string
  store_id: string
  rent: number
  mgmt: number
  utility: number
  insurance_etc: number
  updated_at: string
}

export interface StoreSettings {
  id: string
  store_id: string
  monthly_goal: number
  target_cost_rate: number // %
  target_labor_rate: number // %
  business_days: number
  updated_at: string
}

export interface Todo {
  id: string
  store_id: string
  text: string
  done: boolean
  assignee: Assignee
  created_by: string | null
  created_at: string
  done_at: string | null
}

export interface Review {
  id: string
  store_id: string
  source: ReviewSource
  author: string
  rating: number
  text: string
  posted_at: string
  is_new: boolean
  external_id: string | null
  created_at: string
}

/** 예약 상태 — 예약 / 방문완료 / 노쇼 / 취소 */
export type ReservationStatus = 'booked' | 'visited' | 'noshow' | 'canceled'

/** 매장 예약 한 건 */
export interface Reservation {
  id: string
  store_id: string
  date: string // 'YYYY-MM-DD'
  time: string // 'HH:MM' — 빈 문자열이면 시간 미정
  name: string
  phone: string
  party_size: number
  channel: string // 전화 / 네이버 / 캐치테이블 …
  status: ReservationStatus
  deposit: number
  memo: string
  created_by: string | null
  created_at: string
  updated_at: string
}

/** 오픈 건 진행 상태 */
export type OpenChecklistStatus = 'preparing' | 'opened' | 'onhold'

/** 임원전용 · 매장 오픈 체크리스트 (매장 하나의 오픈 프로젝트) */
export interface OpenChecklist {
  id: string
  title: string
  open_date: string | null
  status: OpenChecklistStatus
  memo: string
  created_by: string | null
  created_at: string
  updated_at: string
}

/** 오픈 체크리스트 한 줄 */
export interface OpenTask {
  id: string
  checklist_id: string
  section: string
  title: string
  owner: string
  due_date: string
  cost: number
  vendor: string
  memo: string
  done: boolean
  done_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/** 임원전용 회의록 */
export interface MeetingNote {
  id: string
  title: string
  meeting_date: string | null
  attendees: string
  body: string
  created_by: string | null
  created_at: string
  updated_at: string
}

/** 로그인한 사용자 + 접근 가능한 매장 목록 — 앱 셸이 매 요청마다 조회한다 */
export interface SessionContext {
  profile: Profile
  stores: Store[] // owner: 전체, manager: 본인 매장 1개
  activeStore: Store
}
