/** 특이사항 유형 — 서버 검증과 입력폼이 같이 쓴다 */
export const ISSUE_TYPES = ['추가결제', '사고', '클레임', '시설고장', '기타'] as const

/** 첫 마감일지에 기본으로 깔아둘 메뉴 (이후로는 직전 일지의 메뉴 목록을 이어 쓴다) */
export const DEFAULT_MENUS = ['한우육회 & 단새우', '찰랑', '무뼈닭발', '한우육회', '복분자']

/** 컨디션 점수 → 단계 */
export function conditionLevel(score: number): 'good' | 'warn' | 'bad' {
  return score >= 8 ? 'good' : score >= 5 ? 'warn' : 'bad'
}

export const CONDITION_LABEL = { good: '좋음', warn: '보통', bad: '나쁨' } as const
