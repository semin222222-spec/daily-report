/**
 * 점주센터 · 가맹점 셋팅 체크리스트.
 * 가맹점 하나 = 체크리스트 한 장. 새로 만들 때 아래 표준 항목이 깔리고,
 * 매장마다 항목을 더하거나 지워서 쓴다. 다음 매장은 지난 매장 것을 복사해도 된다.
 */

export interface SetupChecklist {
  id: string
  store_name: string
  open_date: string | null
  memo: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SetupItem {
  id: string
  checklist_id: string
  section: string
  title: string
  note: string
  done: boolean
  done_at: string | null
  sort_order: number
}

/** 체크리스트 칸 — 번호·이름 순서가 화면 순서 */
export const SETUP_SECTIONS = [
  { no: '01', key: '인테리어 & 설비' },
  { no: '02', key: '발주 품목' },
  { no: '03', key: '발주 업체' },
  { no: '04', key: '추가 체크사항' },
  { no: '05', key: '최종 점검' },
] as const

export function sectionNo(key: string): string {
  return SETUP_SECTIONS.find((s) => s.key === key)?.no ?? '··'
}

/** 표준 항목 (가맹점 셋팅 체크리스트 양식 그대로). 04·05 는 매장마다 채운다 */
export const SETUP_TEMPLATE: Record<string, string[]> = {
  '인테리어 & 설비': [
    '메가룩스 조명 설치',
    '멘포틴 조명 설치',
    '간판 설치 (외부·내부)',
    '티오더 설치 및 세팅',
    '인터넷 설치 (유선·와이파이)',
    'CCTV 설치 및 작동 확인',
    '스피커 설치 및 음향 테스트',
    '대광토탈키친 시공 및 점검',
    '테이블·의자·바테이블 의자 설치',
    '테라스 테이블 + 의자 설치',
    '생맥주 다이 설치',
    '생맥주 기계 설치 및 작동 확인',
    '포스기 다이 설치',
    '제빙기·정수기·주류냉장고 설치',
    '포스기 설치 및 세팅',
    '빌지 기계 선 뽑기 (정산기)',
    '도시가스 확인하기 (연결 및 안전점검)',
    '소방 확인하기 (소화기, 감지기 등)',
    '정화조 청소했는지 확인',
    '에어컨 설치 및 작동 확인',
    '후드 설치 및 흡입 테스트',
    '시트지 신청 + A형간판 시트지',
  ],
  '발주 품목': [
    '감자칼 기계 (슬라이스)',
    '고추기계 (슬라이스)',
    'LED A형간판',
    '스티커 (로고·안내문 등)',
    '종이컵',
    '냅킨',
    '티셔츠 (직원 유니폼)',
    '길흥주방 (주방집기·도구)',
    '주류 (초도 발주)',
    '쿠팡 (소모품 등)',
    '네이버 (소모품 등)',
    '다이소 (청소용품·잡화 등)',
  ],
  '발주 업체': [
    '동원 (식자재)',
    '태산 (식자재)',
    '심도주류 (주류)',
    '쿠팡 (소모품)',
    '네이버 (소모품)',
  ],
  '추가 체크사항': [],
  '최종 점검': [],
}

/** 섹션 순서대로 묶기 (항목이 없어도 섹션은 모두 보여준다) */
export function groupSetup(items: SetupItem[]): [string, SetupItem[]][] {
  const map = new Map<string, SetupItem[]>()
  for (const s of SETUP_SECTIONS) map.set(s.key, [])
  for (const it of items) {
    if (!map.has(it.section)) map.set(it.section, [])
    map.get(it.section)!.push(it)
  }
  return Array.from(map.entries())
}
