import type { Role } from './types'

/** 메뉴별 권한 레벨 */
export type PermLevel = 'hidden' | 'view' | 'edit'

export const PERM_LEVELS: { value: PermLevel; label: string }[] = [
  { value: 'hidden', label: '숨김' },
  { value: 'view', label: '조회만' },
  { value: 'edit', label: '수정가능' },
]

export interface PermMenu {
  /** permissions JSON의 키이자 라우트 경로 */
  key: string
  label: string
  desc: string
  /**
   * 권한을 따로 안 준 점장에게 적용할 기본값.
   * 대부분 'edit'(그냥 쓸 수 있음)이지만, 임원전용처럼 민감한 메뉴는
   * 'hidden'으로 둬서 오너가 직접 열어주기 전까진 안 보이게 한다.
   */
  defaultLevel: PermLevel
}

/**
 * 권한을 줄 수 있는 메뉴들.
 * 대시보드는 홈이라 항상 보이고, 설정은 오너 전용이라 목록에서 뺀다.
 */
export const PERM_MENUS: PermMenu[] = [
  { key: '/closing', label: '일마감 입력', desc: '일별 매출·원가 마감', defaultLevel: 'edit' },
  { key: '/manager-report', label: '점장보고서', desc: '주간·월간 서술 보고', defaultLevel: 'edit' },
  { key: '/monthly', label: '월정산', desc: '월 손익·급여 정산', defaultLevel: 'edit' },
  { key: '/labor', label: '인건비', desc: '직원·알바 급여 · 보건증', defaultLevel: 'edit' },
  { key: '/schedule', label: '근무 스케줄', desc: '주간·월간 근무표', defaultLevel: 'edit' },
  { key: '/reservations', label: '예약현황', desc: '날짜별 예약 접수·방문 관리', defaultLevel: 'edit' },
  { key: '/todos', label: '오늘 할일', desc: '매장 to-do', defaultLevel: 'edit' },
  { key: '/owner-center', label: '점주센터', desc: '오픈발주·자료실', defaultLevel: 'edit' },
  {
    key: '/purchases',
    label: '거래처 매입 현황',
    desc: '거래처별 일자 매입 · 매출 대비 매입비율',
    defaultLevel: 'edit',
  },
  // 임원전용: 기본은 모두 숨김. 오너가 계정마다 직접 열어준다.
  { key: '/executive', label: '임원전용', desc: '임원 전용 자료 (기본 숨김)', defaultLevel: 'hidden' },
]

/** 메뉴별 기본 권한 (권한을 안 준 점장에게 적용) */
const MENU_DEFAULT: Record<string, PermLevel> = Object.fromEntries(
  PERM_MENUS.map((m) => [m.key, m.defaultLevel])
)

export type PermissionMap = Record<string, PermLevel>

/**
 * 이 사용자의 특정 메뉴 권한을 결정한다.
 *   owner   → 항상 edit (전권)
 *   manager → permissions[key], 없으면 그 메뉴의 기본값(대개 edit, 임원전용은 hidden)
 */
export function resolveLevel(
  role: Role,
  permissions: PermissionMap | null | undefined,
  key: string
): PermLevel {
  if (role === 'owner') return 'edit'
  const v = permissions?.[key]
  if (v === 'hidden' || v === 'view' || v === 'edit') return v
  return MENU_DEFAULT[key] ?? 'edit'
}

/** 메뉴가 사이드바·페이지에서 보이는가 */
export function canSee(
  role: Role,
  permissions: PermissionMap | null | undefined,
  key: string
): boolean {
  return resolveLevel(role, permissions, key) !== 'hidden'
}

/** 이 메뉴에서 저장·수정·삭제가 가능한가 */
export function canEdit(
  role: Role,
  permissions: PermissionMap | null | undefined,
  key: string
): boolean {
  return resolveLevel(role, permissions, key) === 'edit'
}
