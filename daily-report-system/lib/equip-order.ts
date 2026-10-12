/**
 * 주방 집기 발주리스트 — 타입 · 계산 · 엑셀 해석 · 지난 발주와 비교.
 * 화면(클라이언트)과 서버 액션이 같이 쓰므로 순수 함수만 둔다.
 */

export type EquipOrderStatus = 'quote' | 'ordered' | 'delivered'

/** 발주서 종류 — 임원전용의 탭이 갈린다 */
export type EquipOrderKind = 'equip' | 'coupang'

/** kind 칸이 생기기 전(026 이전) 데이터는 부가세 포함 여부로 가른다 */
export function orderKind(o: { kind?: EquipOrderKind | null; vat_included?: boolean }): EquipOrderKind {
  return o.kind ?? (o.vat_included ? 'coupang' : 'equip')
}

export interface EquipOrder {
  id: string
  kind?: EquipOrderKind
  title: string
  vendor: string
  quote_date: string | null
  status: EquipOrderStatus
  open_checklist_id: string | null
  memo: string
  /** 단가가 부가세 포함가인지 (쿠팡 등 소매 구매). false 면 단가 + 10% */
  vat_included: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EquipItem {
  id: string
  order_id: string
  section: string
  name: string
  spec: string
  qty: number
  unit_price: number
  note: string
  /** 구매 링크 (쿠팡 상품 주소). 비어 있으면 품명으로 검색 링크를 만든다 */
  link: string
  /** 이번 발주에서 주문(장바구니 담기) 끝냈는지 */
  checked: boolean
  sort_order: number
}

/** 엑셀에서 읽었거나 화면에서 저장할 품목 한 줄 (id 없음) */
export interface EquipLine {
  section: string
  name: string
  spec: string
  qty: number
  unit_price: number
  note: string
  link?: string
}

/** 섹션 표시 순서. 집기 업체 견적은 앞 둘, 쿠팡 발주는 나머지를 주로 쓴다 */
export const EQUIP_SECTIONS = [
  '주방 기물',
  '홀 기물',
  '식자재·음료',
  '주방 가전',
  '홀·매장 비품',
  '청소·위생',
  '소모품·포장',
] as const

/** 쿠팡에서 품명으로 검색하는 주소 */
export function coupangSearchUrl(name: string, spec = ''): string {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(`${name} ${spec}`.trim())}`
}

/**
 * 품목의 구매 링크 — 직접 넣은 주소가 있으면 그것, 없으면 쿠팡 검색.
 * 규격('본품, 블랙' 등)까지 넣으면 검색이 흐려져 품명만 쓴다.
 */
export function buyUrl(l: { name: string; link?: string }): string {
  return l.link && /^https?:\/\//.test(l.link) ? l.link : coupangSearchUrl(l.name)
}

export const EQUIP_STATUSES: { value: EquipOrderStatus; label: string; pill: string }[] = [
  { value: 'quote', label: '견적', pill: 'bg-line-soft text-muted' },
  { value: 'ordered', label: '발주완료', pill: 'pill-w' },
  { value: 'delivered', label: '입고완료', pill: 'pill-g' },
]

export function equipStatusMeta(s: EquipOrderStatus) {
  return EQUIP_STATUSES.find((x) => x.value === s) ?? EQUIP_STATUSES[0]
}

export const VAT_RATE = 0.1

export function lineAmount(l: { qty: number; unit_price: number }): number {
  return Math.round(Number(l.qty || 0) * Number(l.unit_price || 0))
}

/**
 * 합계(공급가) · 부가세 · 총계.
 * vatIncluded = true 면 단가가 이미 부가세 포함가(쿠팡) — 총계는 그대로, 공급가·부가세는 역산.
 */
export function orderTotals(lines: { qty: number; unit_price: number }[], vatIncluded = false) {
  const sum = lines.reduce((s, l) => s + lineAmount(l), 0)
  if (vatIncluded) {
    const supply = Math.round(sum / (1 + VAT_RATE))
    return { supply, vat: sum - supply, total: sum }
  }
  const vat = Math.round(sum * VAT_RATE)
  return { supply: sum, vat, total: sum + vat }
}

/** 섹션 순서를 지키며 묶는다 (기본 섹션 먼저, 그 외는 나온 순서대로) */
export function groupBySection<T extends { section: string }>(rows: T[]): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const s of EQUIP_SECTIONS) map.set(s, [])
  for (const r of rows) {
    const key = r.section || '기타'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).filter(([, list]) => list.length > 0)
}

// ═══════════════════════════════════════════════════════════════
// 숫자를 한글로 (견적서 상단 "칠백삼십일만육천팔백일십오 원整")
// ═══════════════════════════════════════════════════════════════

const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const SMALL = ['', '십', '백', '천']
const BIG = ['', '만', '억', '조']

export function wonInKorean(n: number): string {
  n = Math.floor(Math.abs(n))
  if (n === 0) return '영'
  let out = ''
  let group = 0
  while (n > 0) {
    const chunk = n % 10000
    if (chunk > 0) {
      let s = ''
      let c = chunk
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10
        if (d > 0) s = DIGITS[d] + SMALL[i] + s
        c = Math.floor(c / 10)
      }
      out = s + BIG[group] + out
    }
    n = Math.floor(n / 10000)
    group++
  }
  return out
}

// ═══════════════════════════════════════════════════════════════
// 엑셀 해석
// ═══════════════════════════════════════════════════════════════

type Cell = string | number | null | undefined

/** 머리글 칸 → 우리 필드. 업체마다 이름이 달라서 넉넉히 받는다. */
const HEADER_KEYS: Record<keyof EquipLine | 'amount' | 'no', RegExp> = {
  no: /^(no|번호|순번)$/i,
  name: /(품명|품목|상품명|제품명|品名|description|item)/i,
  spec: /(규격|사양|規格|size|spec)/i,
  qty: /(수량|數量|quantity|qty)/i,
  unit_price: /(단가|單價|unit\s*price|unitprice|price)/i,
  amount: /(금액|金額|amount)/i,
  note: /(단위|單位|비고|unit$|메모|note|remark)/i,
  section: /(구분|분류|카테고리|category)/i,
  link: /(링크|주소|url|link)/i,
}

function clean(v: Cell): string {
  if (v == null) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

/** '27,000' · '₩27,000' · 27000 → 27000. 숫자가 아니면 NaN */
export function toNumber(v: Cell): number {
  if (typeof v === 'number') return v
  const s = clean(v).replace(/[₩원,\s]/g, '')
  if (s === '') return NaN
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/** 한 줄이 머리글이면 칸 위치를, 아니면 null */
function detectHeader(row: Cell[]): Partial<Record<keyof typeof HEADER_KEYS, number>> | null {
  const found: Partial<Record<keyof typeof HEADER_KEYS, number>> = {}
  row.forEach((cell, i) => {
    // '품 명' · '數 量 Quantity' 처럼 띄어쓰기·한자가 섞여 있어 공백을 없애고 본다
    const text = clean(cell).replace(/\s+/g, '')
    if (!text) return
    for (const key of Object.keys(HEADER_KEYS) as (keyof typeof HEADER_KEYS)[]) {
      if (found[key] !== undefined) continue
      // '단위' 칸이 '단가'보다 먼저 잡히지 않도록 단가 정규식을 먼저 확인
      if (key === 'note' && HEADER_KEYS.unit_price.test(text)) continue
      if (HEADER_KEYS[key].test(text)) {
        found[key] = i
        break
      }
    }
  })
  return found.name !== undefined && (found.qty !== undefined || found.unit_price !== undefined)
    ? found
    : null
}

const SKIP_NAME = /^(합계|소계|부가세|총계|합계금액|total|subtotal|vat)$/i

export interface ParseResult {
  lines: EquipLine[]
  /** 읽다가 건너뛴 줄 (사용자에게 보여준다) */
  warnings: string[]
}

/**
 * 시트 여러 장의 2차원 배열 → 품목 목록.
 *  · 머리글 줄(품명·수량·단가…)을 찾아 칸 위치를 정한다. 페이지마다 머리글이
 *    반복돼도 다시 잡을 뿐 품목으로 넣지 않는다.
 *  · 품명만 있고 수량·단가가 비어 있는 줄('주방 기물', '홀 기물')은 섹션 제목.
 *  · 합계·부가세·총계 줄은 건너뛴다.
 */
export function parseSheets(sheets: Cell[][][]): ParseResult {
  const lines: EquipLine[] = []
  const warnings: string[] = []
  let section: string = EQUIP_SECTIONS[0]

  for (const rows of sheets) {
    let cols: ReturnType<typeof detectHeader> = null
    rows.forEach((row, r) => {
      if (!row || row.every((c) => clean(c) === '')) return

      const header = detectHeader(row)
      if (header) {
        cols = header
        return
      }
      if (!cols) return

      const get = (k: keyof typeof HEADER_KEYS) =>
        cols![k] !== undefined ? row[cols![k]!] : undefined

      const name = clean(get('name'))
      const spec = clean(get('spec'))
      const qty = toNumber(get('qty'))
      let price = toNumber(get('unit_price'))
      const amount = toNumber(get('amount'))

      if (!name) return
      if (SKIP_NAME.test(name.replace(/\s+/g, ''))) return

      // 수량·단가·금액이 모두 비었으면 섹션 제목
      if (Number.isNaN(qty) && Number.isNaN(price) && Number.isNaN(amount) && !spec) {
        section = name.replace(/\s+/g, ' ')
        return
      }

      // 단가가 비었는데 금액·수량이 있으면 역산
      if (Number.isNaN(price) && !Number.isNaN(amount) && qty > 0) {
        price = Math.round(amount / qty)
      }
      if (Number.isNaN(qty) || Number.isNaN(price)) {
        warnings.push(`${r + 1}행 "${name}" — 수량 또는 단가를 읽지 못해 0으로 넣었습니다.`)
      }

      const explicitSection = clean(get('section'))
      lines.push({
        section: explicitSection || section,
        name,
        spec,
        qty: Number.isNaN(qty) ? 0 : qty,
        unit_price: Number.isNaN(price) ? 0 : Math.round(price),
        note: clean(get('note')),
        link: clean(get('link')),
      })
    })
  }

  if (lines.length === 0) {
    warnings.push(
      '품목을 찾지 못했습니다. 엑셀에 "품명", "수량", "단가" 머리글이 있는지 확인해주세요.'
    )
  }
  return { lines, warnings }
}

// ═══════════════════════════════════════════════════════════════
// 지난 발주와 비교
// ═══════════════════════════════════════════════════════════════

/** 띄어쓰기·대소문자·기호 차이는 같은 품목으로 본다 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s·.,/\\()[\]\-_'"]/g, '')
    .replace(/[×xX＊]/g, '*')
    .replace(/셋트/g, '세트')
    .replace(/프라스틱/g, '플라스틱')
}

export type DiffKind = 'same' | 'price' | 'qty' | 'spec' | 'new' | 'missing'

export interface DiffRow {
  kind: DiffKind
  /** 지난 발주의 줄 (신규면 없음) */
  before?: EquipLine
  /** 이번 엑셀의 줄 (누락이면 없음) */
  after?: EquipLine
  /** 단가가 바뀐 경우 함께 표시 (spec 변경과 겹칠 수 있음) */
  priceChanged: boolean
  qtyChanged: boolean
}

export interface DiffSummary {
  rows: DiffRow[]
  counts: Record<DiffKind, number>
  /** 같은 수량 기준으로 단가 변동이 합계에 준 영향 (이번 수량 × 단가 차이) */
  priceImpact: number
  before: ReturnType<typeof orderTotals>
  after: ReturnType<typeof orderTotals>
}

/**
 * 비교 규칙
 *  1) 품명+규격이 같으면 같은 품목 → 단가/수량 변동 확인
 *  2) 남은 것 중 품명이 같은 줄이 양쪽에 하나씩뿐이면 규격만 바뀐 것으로 본다
 *  3) 그래도 남으면 지난 쪽 = 누락, 이번 쪽 = 신규
 * 결과는 이번 엑셀 순서대로, 누락 품목은 지난 발주 순서대로 뒤에 붙인다.
 */
export function compareLines(
  before: EquipLine[],
  after: EquipLine[],
  vatIncluded = false
): DiffSummary {
  const fullKey = (l: EquipLine) => normalize(l.name) + '|' + normalize(l.spec)
  const nameKey = (l: EquipLine) => normalize(l.name)

  const usedBefore = new Set<number>()
  const match: (number | null)[] = after.map(() => null)

  // 1) 품명+규격
  const byFull = new Map<string, number[]>()
  before.forEach((b, i) => {
    const k = fullKey(b)
    if (!byFull.has(k)) byFull.set(k, [])
    byFull.get(k)!.push(i)
  })
  after.forEach((a, j) => {
    const cand = byFull.get(fullKey(a))?.find((i) => !usedBefore.has(i))
    if (cand !== undefined) {
      usedBefore.add(cand)
      match[j] = cand
    }
  })

  // 2) 품명만 같고 양쪽에 하나씩 남은 경우
  const leftBefore = new Map<string, number[]>()
  before.forEach((b, i) => {
    if (usedBefore.has(i)) return
    const k = nameKey(b)
    if (!leftBefore.has(k)) leftBefore.set(k, [])
    leftBefore.get(k)!.push(i)
  })
  const leftAfter = new Map<string, number[]>()
  after.forEach((a, j) => {
    if (match[j] !== null) return
    const k = nameKey(a)
    if (!leftAfter.has(k)) leftAfter.set(k, [])
    leftAfter.get(k)!.push(j)
  })
  leftAfter.forEach((js, k) => {
    const is = leftBefore.get(k)
    if (js.length === 1 && is?.length === 1) {
      match[js[0]] = is[0]
      usedBefore.add(is[0])
    }
  })

  const rows: DiffRow[] = []
  let priceImpact = 0

  after.forEach((a, j) => {
    const bi = match[j]
    if (bi === null) {
      rows.push({ kind: 'new', after: a, priceChanged: false, qtyChanged: false })
      return
    }
    const b = before[bi]
    const priceChanged = Number(b.unit_price) !== Number(a.unit_price)
    const qtyChanged = Number(b.qty) !== Number(a.qty)
    const specChanged = normalize(b.spec) !== normalize(a.spec)
    if (priceChanged) priceImpact += (a.unit_price - b.unit_price) * a.qty
    rows.push({
      kind: specChanged ? 'spec' : priceChanged ? 'price' : qtyChanged ? 'qty' : 'same',
      before: b,
      // 엑셀에 링크 칸이 없으면 지난 발주의 링크를 이어받는다
      after: a.link || !b.link ? a : { ...a, link: b.link },
      priceChanged,
      qtyChanged,
    })
  })

  before.forEach((b, i) => {
    if (!usedBefore.has(i)) {
      rows.push({ kind: 'missing', before: b, priceChanged: false, qtyChanged: false })
    }
  })

  const counts: Record<DiffKind, number> = {
    same: 0, price: 0, qty: 0, spec: 0, new: 0, missing: 0,
  }
  rows.forEach((r) => counts[r.kind]++)

  return {
    rows,
    counts,
    priceImpact,
    before: orderTotals(before, vatIncluded),
    after: orderTotals(after, vatIncluded),
  }
}

/**
 * 엑셀 내려받기용 행 (견적서와 같은 칸 순서) — 다음 견적 때 이 양식 그대로 받으면 된다.
 * 링크 칸이 있어 엑셀에서 눌러 바로 구매 페이지로 갈 수 있다.
 */
export function toSheetRows(items: EquipLine[], vatIncluded = false): (string | number)[][] {
  const head = ['NO', '구분', '품명', '규격', '수량', '단가', '금액', '비고', '링크']
  const body = items.map((l, i) => [
    i + 1,
    l.section,
    l.name,
    l.spec,
    l.qty,
    l.unit_price,
    lineAmount(l),
    l.note,
    // 쿠팡(부가세 포함) 발주는 링크가 없어도 검색 주소를 채워 엑셀에서 바로 누를 수 있게
    l.link || (vatIncluded ? buyUrl(l) : ''),
  ])
  const t = orderTotals(items, vatIncluded)
  return [
    head,
    ...body,
    [],
    ['', '', vatIncluded ? '공급가 (역산)' : '합계', '', '', '', t.supply, ''],
    ['', '', '부가세', '', '', '', t.vat, vatIncluded ? '단가에 포함' : ''],
    ['', '', '총계', '', '', '', t.total, ''],
  ]
}
