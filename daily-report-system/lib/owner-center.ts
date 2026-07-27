/**
 * 점주센터 구조 + 오픈 발주 데이터.
 *
 * 오픈 발주 품목은 삐딱_점주센터_MASTER 엑셀에서 옮긴 것.
 * 지금은 상수로 두고 화면에 보여주는 단계(UI 우선).
 * 확정되면 DB로 옮겨 점주가 직접 편집·체크·저장할 수 있게 한다.
 */

/** 점주센터 PIN 통과 여부를 담는 쿠키 이름 */
export const OC_COOKIE = 'oc_ok'

export type FolderKind = 'order' | 'files'

export interface OwnerFolder {
  slug: string
  no: string // '01'
  title: string
  desc: string
  icon: string
  /** 'order' = 오픈발주 체크리스트 / 'files' = 자료 파일 보관함 */
  kind: FolderKind
}

/** DB 파일 (oc_files) */
export interface OcFile {
  id: string
  folder: string
  name: string
  path: string
  size: number
  mime: string
  /** AI·PDF 업로드 시 만든 미리보기 PNG 경로 (없으면 빈 문자열) */
  preview_path: string
  created_at: string
}

/** 바이트 → 사람이 읽는 크기 */
export function humanSize(bytes: number): string {
  if (!bytes) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), u.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`
}

/** 좌측 5개 폴더 */
export const OWNER_FOLDERS: OwnerFolder[] = [
  {
    slug: 'open-order',
    no: '01',
    title: '오픈 발주',
    desc: '신규 오픈 시 카테고리별 발주 체크리스트',
    icon: '📦',
    kind: 'order',
  },
  {
    slug: 'manual',
    no: '02',
    title: '운영 매뉴얼',
    desc: '오픈·마감·응대 등 매장 운영 표준',
    icon: '📘',
    kind: 'files',
  },
  {
    slug: 'recipe',
    no: '03',
    title: '레시피',
    desc: '메뉴별 조리 표준 레시피',
    icon: '🍳',
    kind: 'files',
  },
  {
    slug: 'design',
    no: '04',
    title: '디자인',
    desc: '로고·간판·메뉴판 등 브랜드 자산 (AI·PDF·이미지)',
    icon: '🎨',
    kind: 'files',
  },
  {
    slug: 'edu',
    no: '05',
    title: '교육자료',
    desc: '신규 직원 교육·위생 자료',
    icon: '🎓',
    kind: 'files',
  },
]

export function ownerFolder(slug: string): OwnerFolder | undefined {
  return OWNER_FOLDERS.find((f) => f.slug === slug)
}

/** DB 카테고리 (oc_categories) */
export interface OcCategory {
  id: string
  folder: string
  name: string
  sort_order: number
  created_at: string
}

export type OcPriority = '필수' | '권장' | '선택'
export type OcStatus = '미구매' | '구매중' | '구매완료' | '보류'

export const OC_PRIORITIES: OcPriority[] = ['필수', '권장', '선택']
export const OC_STATUSES: OcStatus[] = ['미구매', '구매중', '구매완료', '보류']

/** DB 품목 (oc_items) */
export interface OcItem {
  id: string
  category_id: string
  name: string
  spec: string
  qty: string
  unit: string
  est_price: number
  buy_price: number
  priority: OcPriority
  status: OcStatus
  manager: string
  vendor: string
  link: string
  due_date: string
  location: string
  note: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** 필수여부 배지 색 */
export const PRIORITY_STYLE: Record<OcPriority, string> = {
  필수: 'bg-good/10 text-[#0a7d0a]',
  권장: 'bg-warn/25 text-[#8a5a00]',
  선택: 'bg-line-soft text-muted',
}

/** 구매상태 배지 색 */
export const STATUS_STYLE: Record<OcStatus, string> = {
  미구매: 'bg-bad/10 text-bad',
  구매중: 'bg-s1/10 text-s1',
  구매완료: 'bg-good/10 text-[#0a7d0a]',
  보류: 'bg-line-soft text-muted',
}

export interface OrderItem {
  code: string
  name: string
  spec: string
  qty: string
  unit: string
}

export interface OrderCategory {
  slug: string
  no: string
  name: string
  items: OrderItem[]
}

/** 01. 오픈 발주 — 카테고리별 품목 (엑셀 원본) */
export const OPEN_ORDER: OrderCategory[] = [
  {
    slug: 'kitchen-equip',
    no: '01',
    name: '주방 장비',
    items: [
      { code: 'EQ-001', name: '업소용 냉장고', spec: '1500 테이블형', qty: '2', unit: 'EA' },
      { code: 'EQ-002', name: '업소용 냉동고', spec: '박스형', qty: '1', unit: 'EA' },
      { code: 'EQ-003', name: '튀김기', spec: '가정용/업소용 확인', qty: '2', unit: 'EA' },
      { code: 'EQ-004', name: '식기세척기', spec: '', qty: '1', unit: 'EA' },
    ],
  },
  {
    slug: 'kitchen-tools',
    no: '02',
    name: '주방 기물',
    items: [
      { code: 'KT-001', name: '스테인리스 믹싱볼', spec: '대/중/소', qty: '6', unit: 'SET' },
      { code: 'KT-002', name: '집게', spec: '튀김/플레이팅', qty: '12', unit: 'EA' },
      { code: 'KT-003', name: '칼/도마 세트', spec: '용도별 색상', qty: '1', unit: 'SET' },
    ],
  },
  {
    slug: 'tableware',
    no: '03',
    name: '식기류',
    items: [
      { code: 'DS-001', name: '메인 접시', spec: '메뉴별 지정', qty: '30', unit: 'EA' },
      { code: 'DS-002', name: '앞접시', spec: '', qty: '80', unit: 'EA' },
      { code: 'DS-003', name: '수저 세트', spec: '', qty: '80', unit: 'SET' },
    ],
  },
  {
    slug: 'hall',
    no: '04',
    name: '홀 비품',
    items: [
      { code: 'HL-001', name: '테이블 번호판', spec: '', qty: '15', unit: 'EA' },
      { code: 'HL-002', name: '웨이팅 안내물', spec: '', qty: '1', unit: 'EA' },
      { code: 'HL-003', name: '무전기', spec: '', qty: '4', unit: 'EA' },
    ],
  },
  {
    slug: 'cleaning',
    no: '05',
    name: '청소용품',
    items: [
      { code: 'CL-001', name: '주방 세정제', spec: '', qty: '2', unit: 'EA' },
      { code: 'CL-002', name: '바닥 밀대', spec: '', qty: '3', unit: 'EA' },
      { code: 'CL-003', name: '고무장갑', spec: '', qty: '10', unit: 'PAIR' },
    ],
  },
  {
    slug: 'consumable',
    no: '06',
    name: '소모품',
    items: [
      { code: 'CS-001', name: '키친타월', spec: '', qty: '12', unit: 'ROLL' },
      { code: 'CS-002', name: '위생장갑', spec: '', qty: '20', unit: 'BOX' },
      { code: 'CS-003', name: '포스 롤지', spec: '', qty: '10', unit: 'ROLL' },
    ],
  },
  {
    slug: 'packaging',
    no: '07',
    name: '포장재',
    items: [
      { code: 'PK-001', name: '배달 용기', spec: '메인메뉴용', qty: '5', unit: 'BOX' },
      { code: 'PK-002', name: '소스컵', spec: '', qty: '3', unit: 'BOX' },
      { code: 'PK-003', name: '쇼핑백', spec: '', qty: '2', unit: 'BOX' },
    ],
  },
  {
    slug: 'ingredient',
    no: '08',
    name: '초도 식자재',
    items: [
      { code: 'FD-001', name: '수육 원육', spec: '본사 지정 규격', qty: '1', unit: 'BOX' },
      { code: 'FD-002', name: '김치', spec: '본사 지정', qty: '1', unit: 'BOX' },
      { code: 'FD-003', name: '소스류', spec: '초도 세트', qty: '1', unit: 'SET' },
    ],
  },
  {
    slug: 'extra',
    no: '09',
    name: '추가 구매 추천',
    items: [
      { code: 'AD-001', name: '(점주가 직접 추가하는 품목)', spec: '', qty: '', unit: 'EA' },
    ],
  },
]

export function openOrderCategory(slug: string): OrderCategory | undefined {
  return OPEN_ORDER.find((c) => c.slug === slug)
}

/** 전체 품목 수 (진행률 표시용) */
export const OPEN_ORDER_TOTAL = OPEN_ORDER.reduce(
  (n, c) => n + c.items.length,
  0
)
