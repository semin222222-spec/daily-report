/** 사이드바 "매장정산" 메뉴 — 시안의 MENU 배열과 순서·아이콘·라벨을 그대로 맞춘다 */

export interface NavItem {
  href: string
  icon: string
  label: string
  /**
   * true면 사이드바에 노출하지 않는다. 라우트와 코드는 그대로 살아 있어서
   * 주소로 직접 들어가면 동작하고, 상단바 제목도 정상으로 나온다.
   * 다시 쓰려면 이 줄만 지우면 된다.
   */
  hidden?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: '📊', label: '대시보드' },
  { href: '/closing', icon: '📝', label: '일마감 입력' },
  // 당장 쓰지 않아 숨김. /daily 로 직접 들어가면 여전히 동작한다.
  { href: '/daily', icon: '📄', label: '일일 보고서', hidden: true },
  { href: '/manager-report', icon: '📋', label: '점장보고서' },
  { href: '/monthly', icon: '📅', label: '월정산' },
  { href: '/labor', icon: '👥', label: '인건비' },
  { href: '/schedule', icon: '🗓️', label: '근무 스케줄' },
  { href: '/todos', icon: '✅', label: '오늘 할일' },
  // 네이버·카카오가 리뷰를 외부로 내보내는 공식 API가 없어 수동 입력뿐이라 숨김.
  // 블로그 리뷰 자동 수집을 붙이면 그때 다시 켠다. /reviews 로 직접 들어가면 동작한다.
  { href: '/reviews', icon: '⭐', label: '리뷰 모아보기', hidden: true },
  { href: '/owner-center', icon: '🔐', label: '점주센터' },
  { href: '/settings', icon: '⚙️', label: '설정' },
]

/** 사이드바에 실제로 그릴 항목 */
export const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter((n) => !n.hidden)

/** 상단바 제목 — 숨긴 화면도 제목은 제대로 나와야 하므로 전체 목록에서 찾는다 */
export function navLabel(pathname: string): string {
  return NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? '대시보드'
}
