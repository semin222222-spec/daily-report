/** 예약현황 화면·액션이 함께 쓰는 상수 */

import type { ReservationStatus } from './types'

/**
 * 예약이 들어오는 경로.
 * DB에는 제약 없이 텍스트로 저장한다(새 채널이 생겨도 마이그레이션 없이 늘리려고).
 * 화면 셀렉트와 저장 검증은 이 목록을 쓴다.
 */
export const RESERVATION_CHANNELS = [
  '전화',
  '네이버',
  '캐치테이블',
  '인스타',
  '워크인',
  '기타',
] as const

export interface StatusMeta {
  value: ReservationStatus
  label: string
  /** 목록 배지 색 */
  pill: string
  /** 상태 전환 버튼이 선택돼 있을 때의 색 */
  active: string
}

export const RESERVATION_STATUSES: StatusMeta[] = [
  {
    value: 'booked',
    label: '예약',
    pill: 'bg-s1/10 text-s1',
    active: 'bg-s1 text-white',
  },
  {
    value: 'visited',
    label: '방문완료',
    pill: 'bg-good/10 text-[#0a7d0a]',
    active: 'bg-good text-white',
  },
  {
    value: 'noshow',
    label: '노쇼',
    pill: 'bg-bad/10 text-bad',
    active: 'bg-bad text-white',
  },
  {
    value: 'canceled',
    label: '취소',
    pill: 'bg-line-soft text-muted',
    active: 'bg-ink-2 text-white',
  },
]

export function statusMeta(s: ReservationStatus): StatusMeta {
  return RESERVATION_STATUSES.find((x) => x.value === s) ?? RESERVATION_STATUSES[0]
}

/** '01012345678' → '010-1234-5678'. 형식이 안 맞으면 원문 그대로 */
export function formatPhone(raw: string): string {
  const d = raw.replace(/[^0-9]/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return raw
}
