/**
 * 임원전용 · 매장 오픈 체크리스트.
 *
 * 매장을 하나 열 때마다 "오픈 건"을 만들고 단계별 할 일을 채운다.
 * 아래 OPEN_TEMPLATE은 새 오픈 건을 만들 때 기본으로 깔리는 표준 절차다.
 * 실제로 돌려보고 빠진 게 나오면 여기에 더하면, 다음 오픈부터 자동으로 따라온다.
 *
 * 점주센터의 [오픈 발주]와 역할이 다르다.
 *   오픈 발주      = 브랜드 공통 품목 마스터 (무엇을 얼마에 사는가)
 *   오픈 체크리스트 = 매장 한 곳의 오픈 진행 (언제 누가 어디까지 했는가)
 */

import type { OpenChecklistStatus, OpenTask } from './types'

export interface OpenSection {
  key: string
  icon: string
  desc: string
}

/** 오픈 단계 — 실제 진행 순서대로 */
export const OPEN_SECTIONS: OpenSection[] = [
  { key: '계약·행정', icon: '📑', desc: '입지·계약·인허가' },
  { key: '공사·인테리어', icon: '🔨', desc: '설계부터 준공까지' },
  { key: '장비·집기', icon: '🍳', desc: '주방·홀 설비 발주와 설치' },
  { key: '식자재·소모품', icon: '📦', desc: '거래처 계약과 초도 물량' },
  { key: '인력', icon: '👥', desc: '채용·근로계약·교육' },
  { key: '마케팅·오픈', icon: '📣', desc: '노출 세팅과 오픈 이벤트' },
  { key: '기타', icon: '🗂️', desc: '위 단계에 없는 항목' },
]

export function sectionMeta(key: string): OpenSection {
  return (
    OPEN_SECTIONS.find((s) => s.key === key) ??
    OPEN_SECTIONS[OPEN_SECTIONS.length - 1]
  )
}

export interface TemplateTask {
  section: string
  title: string
  /** 오픈일 기준 며칠 전에 끝내야 하는가 (마감일 자동 계산에 쓴다) */
  dday: number
}

/** 새 오픈 건의 기본 체크리스트 */
export const OPEN_TEMPLATE: TemplateTask[] = [
  // 계약·행정
  { section: '계약·행정', title: '상권·입지 조사 (유동인구·경쟁점·임대료)', dday: 120 },
  { section: '계약·행정', title: '임대차 계약 체결 (권리금·보증금·특약 확인)', dday: 110 },
  { section: '계약·행정', title: '사업자등록 신청', dday: 60 },
  { section: '계약·행정', title: '위생교육 이수 · 보건증 발급', dday: 45 },
  { section: '계약·행정', title: '영업신고 (일반음식점) · 영업신고증 수령', dday: 20 },
  { section: '계약·행정', title: '화재보험 · 영업배상책임보험 가입', dday: 15 },
  { section: '계약·행정', title: '카드 단말기 · 배달 정산 계좌 개설', dday: 15 },
  { section: '계약·행정', title: '세무 기장 계약 · 홈택스 사업용 계좌 등록', dday: 10 },

  // 공사·인테리어
  { section: '공사·인테리어', title: '평면도·동선 설계 확정', dday: 90 },
  { section: '공사·인테리어', title: '인테리어 업체 선정 · 계약 (공정표 수령)', dday: 80 },
  { section: '공사·인테리어', title: '철거 · 기초 공사', dday: 60 },
  { section: '공사·인테리어', title: '전기 증설 · 배선 (주방 부하 확인)', dday: 50 },
  { section: '공사·인테리어', title: '급배수 · 가스 공사 (완성검사 포함)', dday: 45 },
  { section: '공사·인테리어', title: '덕트 · 후드 · 환기 시공', dday: 40 },
  { section: '공사·인테리어', title: '소방 완비 증명 발급', dday: 30 },
  { section: '공사·인테리어', title: '간판 · 외부 사인 제작 설치', dday: 20 },
  { section: '공사·인테리어', title: '준공 점검 · 하자 보수 목록 정리', dday: 10 },

  // 장비·집기
  { section: '장비·집기', title: '주방 장비 발주 (냉장·냉동·화구·튀김기)', dday: 45 },
  { section: '장비·집기', title: '주방 기물 · 식기류 발주', dday: 30 },
  { section: '장비·집기', title: '홀 가구 (테이블·의자) 입고', dday: 20 },
  { section: '장비·집기', title: 'POS · 키오스크 · 주방 프린터 설치', dday: 15 },
  { section: '장비·집기', title: '인터넷 · 와이파이 · 음향 설치', dday: 15 },
  { section: '장비·집기', title: 'CCTV · 출입 보안 설치', dday: 12 },
  { section: '장비·집기', title: '냉난방기 설치 · 시운전', dday: 12 },
  { section: '장비·집기', title: '장비 시운전 · 사용법 교육', dday: 7 },

  // 식자재·소모품
  { section: '식자재·소모품', title: '식자재 거래처 계약 (단가표 확보)', dday: 30 },
  { section: '식자재·소모품', title: '초도 식자재 발주', dday: 5 },
  { section: '식자재·소모품', title: '포장재 · 배달 용기 발주', dday: 10 },
  { section: '식자재·소모품', title: '소모품 · 청소용품 입고', dday: 10 },
  { section: '식자재·소모품', title: '재고 관리 양식 · 발주 주기 세팅', dday: 7 },

  // 인력
  { section: '인력', title: '필요 인원 산정 · 채용 공고 게시', dday: 40 },
  { section: '인력', title: '면접 · 채용 확정', dday: 25 },
  { section: '인력', title: '근로계약서 작성 · 4대보험 신고', dday: 14 },
  { section: '인력', title: '레시피 · 조리 교육', dday: 10 },
  { section: '인력', title: '홀 서비스 · POS 교육', dday: 7 },
  { section: '인력', title: '오픈 첫 주 근무 스케줄 편성', dday: 5 },

  // 마케팅·오픈
  { section: '마케팅·오픈', title: '네이버 플레이스 등록 · 정보 세팅', dday: 21 },
  { section: '마케팅·오픈', title: '배달앱 입점 신청 (배민·쿠팡이츠·요기요)', dday: 21 },
  { section: '마케팅·오픈', title: '인스타그램 계정 개설 · 사전 홍보', dday: 20 },
  { section: '마케팅·오픈', title: '메뉴판 · 포스터 디자인 인쇄', dday: 14 },
  { section: '마케팅·오픈', title: '매장 사진 촬영 (외관·내부·메뉴)', dday: 10 },
  { section: '마케팅·오픈', title: '오픈 이벤트 기획 (할인·증정)', dday: 10 },
  { section: '마케팅·오픈', title: '전단 · 현수막 배포', dday: 5 },
  { section: '마케팅·오픈', title: '가오픈 리허설 (실제 주문 흐름 점검)', dday: 3 },
  { section: '마케팅·오픈', title: '그랜드 오픈', dday: 0 },
]

export const OPEN_STATUSES: {
  value: OpenChecklistStatus
  label: string
  pill: string
}[] = [
  { value: 'preparing', label: '준비중', pill: 'bg-s1/10 text-s1' },
  { value: 'opened', label: '오픈완료', pill: 'bg-good/10 text-[#0a7d0a]' },
  { value: 'onhold', label: '보류', pill: 'bg-line-soft text-muted' },
]

export function openStatusMeta(s: OpenChecklistStatus) {
  return OPEN_STATUSES.find((x) => x.value === s) ?? OPEN_STATUSES[0]
}

/** 단계 순서대로 묶는다. 템플릿에 없는 단계는 뒤에 붙인다. */
export function groupBySection(tasks: OpenTask[]): [string, OpenTask[]][] {
  const known = OPEN_SECTIONS.map((s) => s.key)
  const extra = Array.from(new Set(tasks.map((t) => t.section))).filter(
    (s) => !known.includes(s)
  )
  return [...known, ...extra]
    .map((key) => [key, tasks.filter((t) => t.section === key)] as [string, OpenTask[]])
    .filter(([, list]) => list.length > 0)
}

/** 오픈일까지 남은 날 — 'D-12' / 'D-DAY' / 'D+3' */
export function dday(openDate: string | null, today: string): string | null {
  if (!openDate) return null
  const ms =
    new Date(`${openDate}T00:00:00`).getTime() -
    new Date(`${today}T00:00:00`).getTime()
  const days = Math.round(ms / 86400000)
  if (days === 0) return 'D-DAY'
  return days > 0 ? `D-${days}` : `D+${-days}`
}
