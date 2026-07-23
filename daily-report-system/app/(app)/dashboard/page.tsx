import Link from 'next/link'
import { SalesTrend } from '@/components/charts/SalesTrend'
import { KpiTile, ProgressBar } from '@/components/ui/Kpi'
import {
  formatDateKo,
  formatDateShort,
  pct,
  todayKST,
  toISODate,
  parseISODate,
  won,
  wonMan,
} from '@/lib/format'
import { SalesSummary, rangeLabel } from '@/components/ui/SalesSummary'
import { monthRange, weekRange } from '@/lib/format'
import { calcDaily, calcMonthly, calcPeriod, deltaRate } from '@/lib/pnl'
import {
  getClosing,
  getClosingsBetween,
  getLatestClosing,
  getMonthClosings,
  getPnlInputs,
  getRecentDays,
} from '@/lib/queries'
import { getSessionContext } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { profile, stores, activeStore } = await getSessionContext()

  const today = todayKST()
  // 이번 달 월정산 시트에 실제 인건비·고정비가 적혀 있으면 그 값을 우선한다
  const inputs = await getPnlInputs(activeStore.id, today.slice(0, 7))

  // 오늘 마감이 아직이면 가장 최근 마감일 숫자를 보여준다.
  // (점장이 저녁에 마감을 넣기 전까지 대시보드가 0원으로 보이는 걸 막는다)
  const todayClosing = await getClosing(activeStore.id, today)
  const latest = todayClosing ?? (await getLatestClosing(activeStore.id))
  const anchorDate = latest?.date ?? today
  const isToday = anchorDate === today

  // 전일 대비
  const prevDate = (() => {
    const d = parseISODate(anchorDate)
    d.setDate(d.getDate() - 1)
    return toISODate(d)
  })()
  const prevClosing = await getClosing(activeStore.id, prevDate)

  const pnl = calcDaily(latest, inputs)
  const prevPnl = calcDaily(prevClosing, inputs)
  const salesDelta = deltaRate(pnl.sales, prevPnl.sales)

  // 최근 7일 추이
  const recent = await getRecentDays(activeStore.id, anchorDate, 7)
  const trendPoints = recent.map((r) => ({
    date: r.date,
    value: r.closing ? calcDaily(r.closing, inputs).sales : 0,
  }))

  // 이번 달 누적
  const anchor = parseISODate(anchorDate)
  const monthClosings = await getMonthClosings(
    activeStore.id,
    anchor.getFullYear(),
    anchor.getMonth() + 1
  )
  const month = calcMonthly(monthClosings, inputs)
  const goal = inputs.settings?.monthly_goal ?? 0
  const goalPct = goal > 0 ? (month.sales / goal) * 100 : 0

  const targetCostRate = inputs.settings?.target_cost_rate ?? 33
  const targetLaborRate = inputs.settings?.target_labor_rate ?? 20

  // ── 일 / 주 / 월 매출 합산 ──────────────────────────────────
  // 직전 같은 기간과 비교해야 "늘었나 줄었나"가 바로 읽힌다.
  const shiftDays = (iso: string, n: number) => {
    const d = parseISODate(iso)
    d.setDate(d.getDate() + n)
    return toISODate(d)
  }

  const week = weekRange(anchorDate)
  const prevWeek = {
    start: shiftDays(week.start, -7),
    end: shiftDays(week.end, -7),
  }
  const monthSpan = monthRange(anchorDate)
  const prevMonthAnchor = (() => {
    const d = parseISODate(anchorDate)
    return monthRange(toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)))
  })()

  const [weekRows, prevWeekRows, prevMonthRows] = await Promise.all([
    getClosingsBetween(activeStore.id, week.start, week.end),
    getClosingsBetween(activeStore.id, prevWeek.start, prevWeek.end),
    getClosingsBetween(
      activeStore.id,
      prevMonthAnchor.start,
      prevMonthAnchor.end
    ),
  ])

  const dayP = calcPeriod(latest ? [latest] : [], inputs)
  const prevDayP = calcPeriod(prevClosing ? [prevClosing] : [], inputs)
  const weekP = calcPeriod(weekRows, inputs)
  const prevWeekP = calcPeriod(prevWeekRows, inputs)
  const monthP = calcPeriod(monthClosings, inputs)
  const prevMonthP = calcPeriod(prevMonthRows, inputs)

  /**
   * 증감률은 총액이 아니라 "일평균 매출"로 비교한다.
   * 진행 중인 주·달은 지난 기간보다 날짜가 적어서, 총액끼리 비교하면
   * 장사가 잘 되고 있어도 항상 폭락으로 보인다.
   */
  const avgDelta = (cur: { sales: number; days: number }, prev: { sales: number; days: number }) => {
    if (!cur.days || !prev.days) return null
    return deltaRate(cur.sales / cur.days, prev.sales / prev.days)
  }

  const summaryPeriods = [
    {
      label: '일 매출',
      range: formatDateShort(anchorDate),
      sales: dayP.sales,
      profit: dayP.profit,
      days: dayP.days,
      delta: avgDelta(dayP, prevDayP),
    },
    {
      label: '주 매출',
      range: rangeLabel(week.start, week.end),
      sales: weekP.sales,
      profit: weekP.profit,
      days: weekP.days,
      delta: avgDelta(weekP, prevWeekP),
    },
    {
      label: '월 매출',
      range: `${anchor.getMonth() + 1}월`,
      sales: monthP.sales,
      profit: monthP.profit,
      days: monthP.days,
      delta: avgDelta(monthP, prevMonthP),
    },
  ]

  return (
    <>
      {!isToday && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-brand/25 bg-brand/[.06] px-4 py-3 text-[13px]">
          <span className="pill pill-w">오늘 마감 미입력</span>
          <span className="text-ink-2">
            아래 숫자는 <b>{formatDateKo(anchorDate)}</b> 마감 기준입니다.
          </span>
          <Link
            href="/closing"
            className="ml-auto font-bold text-brand-deep hover:underline"
          >
            일마감 입력하기 →
          </Link>
        </div>
      )}

      {/* ── KPI ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 shell:grid-cols-4">
        <KpiTile
          label={isToday ? '오늘 매출' : '최근 마감 매출'}
          value={won(pnl.sales)}
          tone={salesDelta >= 0 ? 'up' : 'down'}
          foot={
            <>
              {salesDelta >= 0 ? '▲' : '▼'} {pct(Math.abs(salesDelta))}
              <span className="font-medium text-muted">전일 대비</span>
            </>
          }
        />
        <KpiTile
          label={isToday ? '오늘 이익' : '최근 마감 이익'}
          value={won(pnl.operatingProfit)}
          tone={pnl.operatingProfit >= 0 ? 'up' : 'down'}
          foot={<>이익률 {pct(pnl.marginRate)}</>}
        />
        <KpiTile
          label="원가율"
          value={pnl.costRate.toFixed(1)}
          unit="%"
          tone={pnl.costRate <= targetCostRate ? 'up' : 'down'}
          foot={
            <>
              {pnl.costRate <= targetCostRate ? '양호' : '점검'}
              <span className="font-medium text-muted">
                목표 {targetCostRate}%
              </span>
            </>
          }
        />
        <KpiTile
          label="인건비율"
          value={pnl.laborRate.toFixed(1)}
          unit="%"
          tone={pnl.laborRate <= targetLaborRate ? 'up' : 'down'}
          foot={<span className="font-medium text-muted">객수 {pnl.guests}명</span>}
        />
      </div>

      {/* ── 일 / 주 / 월 합산 ───────────────────── */}
      <div className="mt-4">
        <SalesSummary periods={summaryPeriods} />
      </div>

      {/* ── 추이 + 목표 ─────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-4 shell:grid-cols-[1.5fr_1fr]">
        <div className="card">
          <h3 className="card-title">최근 7일 매출 추이</h3>
          <p className="card-sub">{activeStore.name} · 일 매출 흐름</p>
          <SalesTrend points={trendPoints} color={activeStore.color} />
        </div>

        <div className="card">
          <h3 className="card-title">월 목표 달성률</h3>
          <p className="card-sub">
            {anchor.getMonth() + 1}월 목표{' '}
            {goal > 0 ? `${wonMan(goal)}원` : '미설정'}
          </p>

          <div className="text-[30px] font-extrabold tabular-nums">
            {goalPct.toFixed(0)}
            <small className="text-base text-ink-2">%</small>
          </div>
          <div className="mt-1 flex items-center gap-3.5">
            <ProgressBar pct={goalPct} />
          </div>
          <div className="mt-2 flex justify-between text-[12.5px] text-muted">
            <span>현재 {wonMan(month.sales)}원</span>
            <span>
              남은 목표 {wonMan(Math.max(goal - month.sales, 0))}원
            </span>
          </div>

          <div className="mt-[18px] border-t border-line-soft pt-3.5">
            {/* 위 합산 카드와 같은 calcPeriod 결과를 쓴다.
                월 전액 기준(calcMonthly)은 월정산 화면 몫 — 한 화면에 두 숫자가
                섞이면 어느 쪽이 맞는지 알 수 없게 된다. */}
            <div className="mb-2 flex justify-between text-[13px]">
              <span className="text-ink-2">이번 달 누적 이익</span>
              <b className="tabular-nums">{won(monthP.profit)}</b>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-2">일 평균 매출</span>
              <b className="tabular-nums">
                {won(monthP.days ? monthP.sales / monthP.days : 0)}
              </b>
            </div>
          </div>
        </div>
      </div>

      {/* ── 매장 비교 (오너 전용) ───────────────── */}
      {profile.role === 'owner' && stores.length > 1 && (
        <StoreCompare stores={stores} anchorDate={anchorDate} />
      )}
    </>
  )
}

/** 3개 매장의 같은 날짜 매출·이익 비교 — 시안의 compareBars() */
async function StoreCompare({
  stores,
  anchorDate,
}: {
  stores: Awaited<ReturnType<typeof getSessionContext>>['stores']
  anchorDate: string
}) {
  const rows = await Promise.all(
    stores.map(async (s) => {
      const inputs = await getPnlInputs(s.id, anchorDate.slice(0, 7))
      // 각 매장의 마감 진도가 다를 수 있으므로 해당 날짜가 없으면 그 매장의 최근 마감을 쓴다
      const closing =
        (await getClosing(s.id, anchorDate)) ?? (await getLatestClosing(s.id))
      const p = calcDaily(closing, inputs)
      return { store: s, sales: p.sales, profit: p.operatingProfit }
    })
  )

  const max = Math.max(...rows.map((r) => r.sales), 1)

  return (
    <div className="card mt-4">
      <h3 className="card-title">
        매장 비교 <span className="adminonly-tag">관리자 전용</span>
      </h3>
      <p className="card-sub">최근 마감 기준 매출·이익 한눈에 보기</p>

      {rows.map((r) => (
        <div key={r.store.id} className="mb-3.5">
          <div className="mb-1.5 flex flex-wrap justify-between gap-1 text-[13px]">
            <span className="font-bold">
              <span
                className="mr-1.5 inline-block h-[9px] w-[9px] rounded-[3px] align-middle"
                style={{ background: r.store.color }}
              />
              {r.store.name}
            </span>
            <span className="tabular-nums text-ink-2">
              {won(r.sales)}{' '}
              <span className="text-muted">· 이익 {won(r.profit)}</span>
            </span>
          </div>
          <ProgressBar pct={(r.sales / max) * 100} color={r.store.color} />
        </div>
      ))}
    </div>
  )
}
