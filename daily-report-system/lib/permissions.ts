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
}

/**
 * 권한을 줄 수 있는 메뉴들.
 * 대시보드는 홈이라 항상 보이고, 설정은 오너 전용이라 목록에서 뺀다.
 */
export const PERM_MENUS: PermMenu[] = [
  { key: '/closing', label: '일마감 입력', desc: '일별 매출·원가 마감' },
  { key: '/manager-report', label: '점장보고서', desc: '주간·월간 서술 보고' },
  { key: '/monthly', label: '월정산', desc: '월 손익·급여 정산' },
  { key: '/labor', label: '인건비', desc: '직원·알바 급여 · 보건증' },
  { key: '/schedule', label: '근무 스케줄', desc: '주간·월간 근무표' },
  { key: '/todos', label: '오늘 할일', desc: '매장 to-do' },
  { key: '/owner-center', label: '점주센터', desc: '오픈발주·자료실' },
]

export type PermissionMap = Record<string, PermLevel>

/**
 * 이 사용자의 특정 메뉴 권한을 결정한다.
 *   owner        → 항상 edit (전권)
 *   manager      → permissions[key] (없으면 edit)
 */
export function resolveLevel(
  role: Role,
  permissions: PermissionMap | null | undefined,
  key: string
): PermLevel {
  if (role === 'owner') return 'edit'
  const v = permissions?.[key]
  return v === 'hidden' || v === 'view' || v === 'edit' ? v : 'edit'
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
