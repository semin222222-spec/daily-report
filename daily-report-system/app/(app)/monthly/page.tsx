import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import Link from 'next/link'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { closingSales } from '@/lib/pnl'
import { num, todayKST, won } from '@/lib/format'
import { getMonthClosings, getSettlement } from '@/lib/queries'
import { getSessionContext, guardMenu } from '@/lib/session'
import { ALL_CATEGORIES, shiftYm, ymLabel } from '@/lib/settlement'
import { SettlementSheet } from './SettlementSheet'

export const dynamic = 'force-dynamic'

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: { ym?: string }
}) {
  const { activeStore, readOnly } = await guardMenu('/monthly')

  const today = todayKST()
  const ym =
    searchParams.ym && /^\d{4}-\d{2}$/.test(searchParams.ym)
      ? searchParams.ym
      : today.slice(0, 7)
  const [year, month] = ym.split('-').map(Number)

  // 일마감·이번달 시트·지난달 시트를 동시에 가져온다 (서로 독립적)
  const [closings, { settlement, items }, { items: prevItems }] =
    await Promise.all([
      getMonthClosings(activeStore.id, year, month),
      getSettlement(activeStore.id, ym),
      getSettlement(activeStore.id, shiftYm(ym, -1)),
    ])
  // 총매출 기본값 — 일마감 합계
  const autoSales = closings.reduce((s, c) => s + closingSales(c), 0)
  const guests = closings.reduce((s, c) => s + c.guests, 0)

  const isCurrentMonth = ym === today.slice(0, 7)

  return (
    <>
      {readOnly && <ReadOnlyBanner />}
      {/* ── 월 이동 ────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/monthly?ym=${shiftYm(ym, -1)}`} className="btn-ghost !py-2 text-[13px]">
          ← 지난달
        </Link>
        <MonthPicker value={ym} basePath="/monthly" />
        <Link
          href={`/monthly?ym=${shiftYm(ym, 1)}`}
          className={`btn-ghost !py-2 text-[13px] ${
            isCurrentMonth ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          다음달 →
        </Link>
      </div>

      {/* ── 참고 정보 ──────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-card border border-line bg-surface px-4 py-3 text-[12.5px] shadow-card">
        <span className="font-bold text-ink">
          {activeStore.name} · {ymLabel(ym)}
        </span>
        <span className="text-muted">
          일마감 {closings.length}일 · 합계{' '}
          <b className="text-ink-2 tabular-nums">{won(autoSales)}</b>
        </span>
        <span className="text-muted">
          객수 <b className="text-ink-2 tabular-nums">{num(guests)}명</b>
        </span>
        {!settlement && (
          <span className="pill pill-w ml-auto">아직 저장 안 됨</span>
        )}
      </div>

      <SettlementSheet
        key={`${activeStore.id}-${ym}`}
        ym={ym}
        items={items}
        prevItems={prevItems}
        categories={ALL_CATEGORIES}
        autoSales={autoSales}
        savedSales={settlement?.total_sales ?? 0}
        savedSalesAuto={settlement?.sales_auto ?? true}
        showSummary
      />

      <div className="btn-row">
        <a
          href={`/api/export/monthly?ym=${ym}`}
          className="btn-ghost inline-block"
          download
        >
          엑셀 내보내기 (CSV)
        </a>
      </div>
    </>
  )
}
