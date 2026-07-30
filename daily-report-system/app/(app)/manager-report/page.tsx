import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import Link from 'next/link'
import {
  formatDateShort,
  monthRange,
  num,
  parseISODate,
  pct,
  toISODate,
  todayKST,
  weekRange,
  won,
} from '@/lib/format'
import { calcPeriod, resolveFixed, resolveLabor } from '@/lib/pnl'
import { getClosingsBetween, getPnlInputs } from '@/lib/queries'
import { getSessionContext, guardMenu } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import type { ManagerReport, ReportPeriod } from '@/lib/types'
import { deleteReport } from './actions'
import { ReportForm } from './ReportForm'

export const dynamic = 'force-dynamic'

/** 그 달의 몇 주차인지 — '7월 3주차' */
function weekLabel(iso: string): string {
  const d = parseISODate(iso)
  const nth = Math.floor((d.getDate() - 1) / 7) + 1
  return `${d.getMonth() + 1}월 ${nth}주차`
}

export default async function ManagerReportPage({
  searchParams,
}: {
  searchParams: { type?: string; start?: string }
}) {
  const { activeStore, readOnly } = await guardMenu('/manager-report')
  const supabase = createClient()

  const periodType: ReportPeriod =
    searchParams.type === 'monthly' ? 'monthly' : 'weekly'
  const anchor =
    searchParams.start && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.start)
      ? searchParams.start
      : todayKST()

  const span = periodType === 'weekly' ? weekRange(anchor) : monthRange(anchor)

  // 기간 실적 — 점장이 숫자를 다시 계산·타이핑하지 않게 미리 뽑아준다.
  // 그 달 월정산 시트에 실제 인건비·고정비가 적혀 있으면 그 값을 쓴다.
  const ym = span.start.slice(0, 7)
  const inputs = await getPnlInputs(activeStore.id, ym)
  const closings = await getClosingsBetween(activeStore.id, span.start, span.end)
  const p = calcPeriod(closings, inputs)
  const costRate = p.sales ? (p.cost / p.sales) * 100 : 0
  const profitRate = p.sales ? (p.profit / p.sales) * 100 : 0

  const businessDays = inputs.settings?.business_days ?? 30
  const laborForPeriod = (resolveLabor(inputs) / businessDays) * p.days
  const fixedForPeriod = (resolveFixed(inputs) / businessDays) * p.days

  const label =
    periodType === 'weekly'
      ? weekLabel(span.start)
      : `${parseISODate(span.start).getMonth() + 1}월`

  // 매출분석 칸 자동 초안 — 시안의 "7월 3주차 매출 5,733,500 / 총 테이블 수 99팀" 형식
  const autoDraft =
    p.days > 0
      ? `${label} 매출 ${won(p.sales)} / 총 객수 ${num(p.guests)}명 (마감 ${p.days}일)\n` +
        `객단가 ${won(p.guests ? p.sales / p.guests : 0)} · 원가율 ${pct(costRate)}\n\n`
      : ''

  const { data: existingRow } = await supabase
    .from('manager_reports')
    .select('*')
    .eq('store_id', activeStore.id)
    .eq('period_type', periodType)
    .eq('period_start', span.start)
    .maybeSingle()

  const existing = (existingRow ?? null) as ManagerReport | null

  const { data: recentRows } = await supabase
    .from('manager_reports')
    .select('*')
    .eq('store_id', activeStore.id)
    .order('period_start', { ascending: false })
    .limit(12)

  const recent = (recentRows ?? []) as ManagerReport[]

  const step = (dir: number) => {
    const d = parseISODate(anchor)
    if (periodType === 'weekly') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    return toISODate(d)
  }

  const link = (t: ReportPeriod, start: string) =>
    `/manager-report?type=${t}&start=${start}`

  return (
    <>
      {readOnly && <ReadOnlyBanner />}
      {/* ── 기간 선택 ─────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
          {(['weekly', 'monthly'] as const).map((t) => (
            <Link
              key={t}
              href={link(t, anchor)}
              className={`rounded-[9px] px-3.5 py-1.5 text-[13px] font-bold transition ${
                periodType === t
                  ? 'bg-page text-ink shadow-[inset_0_0_0_1px_#e7e4dd]'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              {t === 'weekly' ? '주간' : '월간'}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href={link(periodType, step(-1))} className="btn-ghost !py-2 !text-[13px]">
            ←
          </Link>
          <span className="min-w-[150px] text-center text-[13px] font-semibold text-ink-2">
            {formatDateShort(span.start)} ~ {formatDateShort(span.end)}
          </span>
          <Link href={link(periodType, step(1))} className="btn-ghost !py-2 !text-[13px]">
            →
          </Link>
        </div>
      </div>

      {/* ── 기간 실적 요약 ────────────────────────── */}
      <div className="card">
        <h3 className="card-title">
          {activeStore.name} · {label} 실적{' '}
          {existing && <span className="pill pill-g ml-1">작성됨</span>}
        </h3>
        <p className="card-sub">
          마감 데이터에서 자동 계산한 숫자입니다. 보고서에 그대로 인용하세요.
        </p>

        <div className="grid grid-cols-2 gap-3 shell:grid-cols-4">
          {[
            { label: '매출 총액', value: won(p.sales) },
            { label: '총 객수', value: `${num(p.guests)}명` },
            { label: '객단가', value: won(p.guests ? p.sales / p.guests : 0) },
            { label: '마감 일수', value: `${p.days}일` },
            { label: '식자재 원가', value: `${won(p.cost)} (${pct(costRate)})` },
            { label: '인건비', value: won(laborForPeriod) },
            { label: '고정비', value: won(fixedForPeriod) },
            {
              label: '영업이익',
              value: `${won(p.profit)} (${pct(profitRate)})`,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-[10px] border border-line-soft bg-[#fbfaf8] px-3 py-2.5"
            >
              <div className="text-[11.5px] text-muted">{s.label}</div>
              <div className="mt-0.5 text-[14px] font-extrabold tabular-nums">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ReportForm
        periodType={periodType}
        periodStart={span.start}
        periodEnd={span.end}
        existing={existing}
        autoDraft={autoDraft}
      />

      {/* ── 지난 보고서 ───────────────────────────── */}
      {recent.length > 0 && (
        <div className="card mt-4">
          <h3 className="card-title">지난 보고서</h3>
          <p className="card-sub">클릭하면 해당 기간으로 이동합니다.</p>

          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>기간</th>
                  <th>구분</th>
                  <th>수정일</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={link(r.period_type, r.period_start)}
                        className="font-semibold hover:text-brand-deep hover:underline"
                      >
                        {formatDateShort(r.period_start)} ~{' '}
                        {formatDateShort(r.period_end)}
                      </Link>
                    </td>
                    <td>{r.period_type === 'weekly' ? '주간' : '월간'}</td>
                    <td className="tabular-nums text-muted">
                      {r.updated_at.slice(0, 10)}
                    </td>
                    <td className="text-right">
                      <form action={deleteReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="btn-ghost !px-3 !py-1.5 !text-xs hover:!border-bad hover:!text-bad"
                        >
                          삭제
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
