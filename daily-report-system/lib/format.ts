/** 표시 포맷 — 시안의 won() / wonMan() 과 동일하게 맞춘다 */

export function won(n: number): string {
  if (!Number.isFinite(n)) return '₩0'
  return '₩' + Math.round(n).toLocaleString('ko-KR')
}

/** 큰 금액을 "만" 단위로 — 목표/누적 매출 표시용 */
export function wonMan(n: number): string {
  if (!Number.isFinite(n)) return '0만'
  return (n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + '만'
}

export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '0.0%'
  return n.toFixed(digits) + '%'
}

export function num(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return Math.round(n).toLocaleString('ko-KR')
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

/** 'YYYY-MM-DD' → '2026년 7월 20일 (월)' */
export function formatDateKo(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`
}

/** 'YYYY-MM-DD' → '7/20 월' — 표의 짧은 날짜 */
export function formatDateShort(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${DAY_KO[d.getDay()]}`
}

/**
 * 'YYYY-MM-DD'를 로컬 자정으로 파싱한다.
 * new Date('2026-07-20')은 UTC로 해석돼 KST에서 하루 밀리므로 직접 파싱한다.
 */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** 해당 날짜가 속한 주(월~일)의 시작·끝 — 매출 주간 합산에 쓴다 */
export function weekRange(iso: string): { start: string; end: string } {
  const d = parseISODate(iso)
  const dow = d.getDay() // 0=일
  const back = dow === 0 ? 6 : dow - 1
  const start = new Date(d)
  start.setDate(d.getDate() - back)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: toISODate(start), end: toISODate(end) }
}

/** 해당 날짜가 속한 달의 시작·끝 */
export function monthRange(iso: string): { start: string; end: string } {
  const d = parseISODate(iso)
  return {
    start: toISODate(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  }
}

/** Date → 'YYYY-MM-DD' (로컬 기준) */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 오늘 날짜 — 서버(UTC)에서도 한국 날짜가 나오도록 KST로 고정 */
export function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000)
  return toISODate(kst)
}

/** 상대 시간 — '방금 전' / '3시간 전' / '어제' */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMin = Math.floor((Date.now() - then) / 60000)
  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return '어제'
  if (diffDay < 7) return `${diffDay}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}
