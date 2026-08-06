import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import Link from 'next/link'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { todayKST } from '@/lib/format'
import { getSettlement, getStaff } from '@/lib/queries'
import { getSessionContext, guardMenu } from '@/lib/session'
import { LABOR_CATEGORIES, shiftYm, ymLabel } from '@/lib/settlement'
import { SettlementSheet } from '../monthly/SettlementSheet'
import { HealthCerts } from './HealthCerts'

export const dynamic = 'force-dynamic'

export default async function LaborPage({
  searchParams,
}: {
  searchParams: { ym?: string }
}) {
  const { activeStore, readOnly } = await guardMenu('/labor')

  const today = todayKST()
  const ym =
    searchParams.ym && /^\d{4}-\d{2}$/.test(searchParams.ym)
      ? searchParams.ym
      : today.slice(0, 7)

  // 월정산과 같은 시트를 본다. 여기서 고치면 월정산에도 그대로 반영된다.
  const { items } = await getSettlement(activeStore.id, ym)
  // 지난달 항목 — 카테고리별 "지난달 복사"에 쓴다
  const { items: prevItems } = await getSettlement(activeStore.id, shiftYm(ym, -1))
  // 보건증은 달과 무관한 사람 정보라 근무 인원 명단에서 가져온다
  const staff = await getStaff(activeStore.id)
  const isCurrentMonth = ym === today.slice(0, 7)

  return (
    <>
      {readOnly && <ReadOnlyBanner />}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/labor?ym=${shiftYm(ym, -1)}`} className="btn-ghost !py-2 text-[13px]">
          ← 지난달
        </Link>
        <MonthPicker value={ym} basePath="/labor" />
        <Link
          href={`/labor?ym=${shiftYm(ym, 1)}`}
          className={`btn-ghost !py-2 text-[13px] ${
            isCurrentMonth ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          다음달 →
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-line bg-surface px-4 py-3 text-[12.5px] shadow-card">
        <span className="font-bold text-ink">
          {activeStore.name} · {ymLabel(ym)} 인건비
        </span>
        <span className="text-muted">
          달마다 따로 저장됩니다. 다음 달로 넘어가도 이 달 기록은 그대로
          남습니다.
        </span>
        <Link
          href={`/monthly?ym=${ym}`}
          className="ml-auto font-bold text-brand-deep hover:underline"
        >
          월정산에서 전체 보기 →
        </Link>
      </div>

      <SettlementSheet
        key={`${activeStore.id}-${ym}`}
        ym={ym}
        items={items}
        prevItems={prevItems}
        categories={LABOR_CATEGORIES}
        autoSales={0}
        savedSales={0}
        savedSalesAuto={false}
        showSummary={false}
      />

      <HealthCerts staff={staff.filter((s) => s.is_active)} />
    </>
  )
}
