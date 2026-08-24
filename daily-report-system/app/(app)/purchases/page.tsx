import Link from 'next/link'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { todayKST, won } from '@/lib/format'
import { closingSales } from '@/lib/pnl'
import { monthWeeks } from '@/lib/purchases'
import { getMonthClosings, getPurchaseMonth, getPurchaseVendors } from '@/lib/queries'
import { guardMenu } from '@/lib/session'
import { shiftYm, ymLabel } from '@/lib/settlement'
import { PurchaseSheet } from './PurchaseSheet'
import { VendorManager } from './VendorManager'

export const dynamic = 'force-dynamic'

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: { ym?: string }
}) {
  const { activeStore, readOnly } = await guardMenu('/purchases')

  const today = todayKST()
  const ym =
    searchParams.ym && /^\d{4}-\d{2}$/.test(searchParams.ym)
      ? searchParams.ym
      : today.slice(0, 7)
  const [year, month] = ym.split('-').map(Number)

  // 거래처 목록 · 이달 매입 · 이달 일마감은 서로 독립적이라 동시에 가져온다
  const [vendors, { entries, notes }, closings] = await Promise.all([
    getPurchaseVendors(activeStore.id),
    getPurchaseMonth(activeStore.id, ym),
    getMonthClosings(activeStore.id, year, month),
  ])

  const weeks = monthWeeks(ym)

  // 주별 매출 — 매입비율의 분모. 일마감에서 그대로 가져온다.
  const salesByDate = new Map(closings.map((c) => [c.date, closingSales(c)]))
  const weekSales = weeks.map((w) =>
    w.days.reduce((s, d) => s + (d ? salesByDate.get(d) ?? 0 : 0), 0)
  )
  const monthSales = weekSales.reduce((s, v) => s + v, 0)

  const activeVendors = vendors.filter((v) => v.is_active)
  const isCurrentMonth = ym === today.slice(0, 7)

  return (
    <>
      {readOnly && <ReadOnlyBanner />}

      {/* ── 월 이동 ────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/purchases?ym=${shiftYm(ym, -1)}`}
          className="btn-ghost !py-2 text-[13px]"
        >
          ← 지난달
        </Link>
        <MonthPicker value={ym} basePath="/purchases" />
        <Link
          href={`/purchases?ym=${shiftYm(ym, 1)}`}
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
          {activeStore.name} · {ymLabel(ym)} 매입 현황
        </span>
        <span className="text-muted">(VAT 포함)</span>
        <span className="text-muted">
          거래처 <b className="text-ink-2 tabular-nums">{activeVendors.length}곳</b>
        </span>
        <span className="text-muted">
          이달 매출{' '}
          <b className="text-ink-2 tabular-nums">{won(monthSales)}</b>
        </span>
      </div>

      {activeVendors.length === 0 ? (
        <div className="card">
          <h3 className="card-title">거래처를 먼저 등록하세요</h3>
          <p className="card-sub">
            등록한 거래처가 매입표의 열이 됩니다. 아래에서 기본 거래처를 한 번에
            넣거나, 직접 추가할 수 있습니다.
          </p>
        </div>
      ) : (
        <PurchaseSheet
          key={`${activeStore.id}-${ym}`}
          ym={ym}
          vendors={activeVendors}
          entries={entries}
          notes={notes}
          weeks={weeks}
          weekSales={weekSales}
          monthSales={monthSales}
          readOnly={readOnly}
        />
      )}

      <VendorManager vendors={vendors} readOnly={readOnly} />

      {activeVendors.length > 0 && (
        <div className="btn-row">
          <a
            href={`/api/export/purchases?ym=${ym}`}
            className="btn-ghost inline-block"
            download
          >
            엑셀 내보내기 (CSV)
          </a>
        </div>
      )}
    </>
  )
}
