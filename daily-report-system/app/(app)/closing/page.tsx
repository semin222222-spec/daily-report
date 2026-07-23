import Link from 'next/link'
import {
  closingSales,
} from '@/lib/pnl'
import {
  formatDateShort,
  num,
  parseISODate,
  todayKST,
  toISODate,
  won,
} from '@/lib/format'
import { getClosing, getClosingsBetween } from '@/lib/queries'
import { getSessionContext } from '@/lib/session'
import { ClosingForm } from './ClosingForm'

export const dynamic = 'force-dynamic'

/** iso 날짜가 속한 주의 월요일 */
function weekStart(iso: string): Date {
  const d = parseISODate(iso)
  const dow = d.getDay() // 0=일
  const back = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - back)
  return d
}

export default async function ClosingPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const { activeStore } = await getSessionContext()
  const today = todayKST()

  const requested = searchParams.date
  const date =
    requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today

  const existing = await getClosing(activeStore.id, date)

  // 이번 주(월~일) 마감 현황
  const start = weekStart(date)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return toISODate(d)
  })
  const weekRows = await getClosingsBetween(
    activeStore.id,
    days[0],
    days[6]
  )
  const byDate = new Map(weekRows.map((r) => [r.date, r]))

  return (
    <>
      <ClosingForm
        storeId={activeStore.id}
        storeName={activeStore.name}
        date={date}
        existing={existing}
      />

      <div className="card mt-4">
        <h3 className="card-title">이번 주 마감 현황</h3>
        <p className="card-sub">
          빠진 날은 자동으로 표시됩니다. 날짜를 누르면 그날 마감을 입력·수정할 수
          있습니다.
        </p>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>날짜</th>
                <th>매출</th>
                <th>객수</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {days.map((iso) => {
                const row = byDate.get(iso)
                const isFuture = iso > today
                return (
                  <tr key={iso}>
                    <td>
                      <Link
                        href={`/closing?date=${iso}`}
                        className={`font-semibold hover:text-brand-deep hover:underline ${
                          iso === date ? 'text-brand-deep' : ''
                        }`}
                      >
                        {formatDateShort(iso)}
                      </Link>
                    </td>
                    <td className={`tabular-nums ${row ? '' : 'text-muted'}`}>
                      {row ? won(closingSales(row)) : '—'}
                    </td>
                    <td className={`tabular-nums ${row ? '' : 'text-muted'}`}>
                      {row ? num(row.guests) : '—'}
                    </td>
                    <td>
                      {row ? (
                        <span className="pill pill-g">완료</span>
                      ) : isFuture ? (
                        <span className="text-[11px] text-muted">—</span>
                      ) : (
                        <span className="pill pill-w">미입력</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
