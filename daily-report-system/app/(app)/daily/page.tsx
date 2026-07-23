import Link from 'next/link'
import { KpiTile } from '@/components/ui/Kpi'
import {
  formatDateKo,
  pct,
  todayKST,
  toISODate,
  parseISODate,
  won,
} from '@/lib/format'
import { calcDaily } from '@/lib/pnl'
import { getClosing, getLatestClosing, getPnlInputs } from '@/lib/queries'
import { getSessionContext } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const { activeStore } = await getSessionContext()
  const today = todayKST()

  const requested = searchParams.date
  const inputs = await getPnlInputs(activeStore.id, (requested ?? today).slice(0, 7))

  // 날짜를 지정하지 않으면 오늘 → 없으면 최근 마감일
  let date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today
  let closing = await getClosing(activeStore.id, date)
  if (!closing && !requested) {
    const latest = await getLatestClosing(activeStore.id)
    if (latest) {
      date = latest.date
      closing = latest
    }
  }

  const p = calcDaily(closing, inputs)

  const prev = (() => {
    const d = parseISODate(date)
    d.setDate(d.getDate() - 1)
    return toISODate(d)
  })()
  const next = (() => {
    const d = parseISODate(date)
    d.setDate(d.getDate() + 1)
    return toISODate(d)
  })()

  /** 손익표 한 줄 — 금액과 매출대비 비율을 같은 공식으로 찍는다 */
  const Row = ({
    label,
    amount,
    rate,
    negative = false,
    total = false,
  }: {
    label: string
    amount: number
    rate: number
    negative?: boolean
    total?: boolean
  }) => (
    <tr className={total ? 'pl-total' : ''}>
      <td>{label}</td>
      <td
        className={`tabular-nums ${
          negative ? 'text-bad' : total ? (amount >= 0 ? 'text-good' : 'text-bad') : ''
        }`}
      >
        {won(negative ? -amount : amount)}
      </td>
      <td className="tabular-nums text-muted">{pct(rate)}</td>
    </tr>
  )

  return (
    <>
      {/* 날짜 이동 */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/daily?date=${prev}`} className="btn-ghost !py-2 text-[13px]">
          ← 전날
        </Link>
        <div className="text-center text-[13px] font-semibold text-ink-2">
          {formatDateKo(date)}
        </div>
        <Link
          href={`/daily?date=${next}`}
          className={`btn-ghost !py-2 text-[13px] ${
            next > today ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          다음날 →
        </Link>
      </div>

      {!closing && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-brand/25 bg-brand/[.06] px-4 py-3 text-[13px]">
          <span className="pill pill-w">마감 미입력</span>
          <span className="text-ink-2">
            이 날짜의 마감 기록이 없습니다. 매출이 0원으로 계산됩니다.
          </span>
          <Link
            href={`/closing?date=${date}`}
            className="ml-auto font-bold text-brand-deep hover:underline"
          >
            이 날 마감 입력 →
          </Link>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">
          일일 손익계산서 <span className="pill pill-w">{date}</span>
        </h3>
        <p className="card-sub">
          {activeStore.name} · 그날 하루의 손익을 자동 계산합니다.
        </p>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>항목</th>
                <th>금액</th>
                <th>매출대비</th>
              </tr>
            </thead>
            <tbody>
              <Row label="총매출" amount={p.sales} rate={p.sales ? 100 : 0} />
              <Row
                label="(-) 식자재 원가"
                amount={p.cost}
                rate={p.costRate}
                negative
              />
              <Row
                label="매출총이익"
                amount={p.grossProfit}
                rate={p.sales ? (p.grossProfit / p.sales) * 100 : 0}
                total
              />
              <Row
                label="(-) 인건비 (일할)"
                amount={p.labor}
                rate={p.laborRate}
                negative
              />
              <Row
                label="(-) 고정비 (일할)"
                amount={p.fixed}
                rate={p.fixedRate}
                negative
              />
              <Row
                label="(-) 당일 지출"
                amount={p.expense}
                rate={p.sales ? (p.expense / p.sales) * 100 : 0}
                negative
              />
              <Row
                label="영업이익"
                amount={p.operatingProfit}
                rate={p.marginRate}
                total
              />
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          인건비·고정비는 월 총액을 영업일수(
          {inputs.settings?.business_days ?? 30}일)로 나눈 일할 금액입니다.
          설정에서 바꿀 수 있습니다.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 shell:grid-cols-2">
        <KpiTile
          label="객단가"
          value={won(p.avgTicket)}
          foot={<span className="font-medium text-muted">객수 {p.guests}명</span>}
        />
        <KpiTile
          label="손익분기 대비"
          value={p.aboveBep ? '달성 ✓' : '미달'}
          tone={p.aboveBep ? 'up' : 'down'}
          foot={
            <>
              BEP {won(p.bepSales)}{' '}
              <span className="font-medium text-muted">
                {p.aboveBep
                  ? `${won(p.sales - p.bepSales)} 초과`
                  : `${won(p.bepSales - p.sales)} 부족`}
              </span>
            </>
          }
        />
      </div>

      {closing?.memo && (
        <div className="card mt-4">
          <h3 className="card-title">특이사항 메모</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">
            {closing.memo}
          </p>
        </div>
      )}
    </>
  )
}
