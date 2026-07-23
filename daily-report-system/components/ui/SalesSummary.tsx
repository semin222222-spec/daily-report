import { formatDateShort, pct, won } from '@/lib/format'

export interface SummaryPeriod {
  label: string
  /** '7/20 월 ~ 7/26 일' 같은 기간 설명 */
  range: string
  sales: number
  profit: number
  /** 마감이 입력된 날 수 */
  days: number
  /** 직전 같은 기간 대비 증감률(%). null이면 표시하지 않는다 */
  delta: number | null
}

/**
 * 일 / 주 / 월 매출 합산.
 * 점장이 "오늘만 보고 끝"이 아니라 흐름을 보게 하려고 세 기간을 나란히 둔다.
 */
export function SalesSummary({ periods }: { periods: SummaryPeriod[] }) {
  return (
    <div className="card">
      <h3 className="card-title">매출 합산</h3>
      <p className="card-sub">일 · 주 · 월 매출과 영업이익을 한눈에</p>

      <div className="grid grid-cols-1 gap-3 shell:grid-cols-3">
        {periods.map((p) => (
          <div
            key={p.label}
            className="rounded-[12px] border border-line-soft bg-[#fbfaf8] p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-bold text-ink">{p.label}</span>
              <span className="text-[11px] text-muted">{p.range}</span>
            </div>

            <div className="mt-2 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums">
              {won(p.sales)}
            </div>

            {p.delta !== null && (
              <div
                className={`mt-1 text-[12px] font-bold ${
                  p.delta >= 0 ? 'text-good' : 'text-bad'
                }`}
              >
                {p.delta >= 0 ? '▲' : '▼'} {pct(Math.abs(p.delta))}
                <span className="ml-1 font-medium text-muted">
                  직전 대비 (일평균)
                </span>
              </div>
            )}

            <div className="mt-3 flex justify-between border-t border-line-soft pt-2.5 text-[12.5px]">
              <span className="text-muted">영업이익</span>
              <b
                className={`tabular-nums ${
                  p.profit >= 0 ? 'text-ink' : 'text-bad'
                }`}
              >
                {won(p.profit)}
              </b>
            </div>
            <div className="mt-1 flex justify-between text-[12.5px]">
              <span className="text-muted">마감</span>
              <b className="tabular-nums text-ink-2">{p.days}일</b>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 'YYYY-MM-DD' 두 개 → '7/20 월 ~ 7/26 일' */
export function rangeLabel(start: string, end: string): string {
  return `${formatDateShort(start)} ~ ${formatDateShort(end)}`
}
