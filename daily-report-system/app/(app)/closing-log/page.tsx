import Link from 'next/link'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { formatDateShort, parseISODate, todayKST, toISODate } from '@/lib/format'
import { getClosingLog, getClosingLogsBetween, getPrevClosingLog } from '@/lib/queries'
import { guardMenu } from '@/lib/session'
import { ClosingLogForm } from './ClosingLogForm'
import { DEFAULT_MENUS, conditionLevel } from './constants'

export const dynamic = 'force-dynamic'

/** iso 날짜가 속한 주의 월요일 */
function weekStart(iso: string): Date {
  const d = parseISODate(iso)
  const dow = d.getDay() // 0=일
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d
}

const DOT = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' } as const

export default async function ClosingLogPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const { activeStore, readOnly } = await guardMenu('/closing-log')
  const today = todayKST()
  const requested = searchParams.date
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today

  const start = weekStart(date)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return toISODate(d)
  })

  const [existing, prev, weekRows] = await Promise.all([
    getClosingLog(activeStore.id, date),
    getPrevClosingLog(activeStore.id, date),
    getClosingLogsBetween(activeStore.id, days[0], days[6]),
  ])
  const byDate = new Map(weekRows.map((r) => [r.date, r]))

  const menuNames = prev?.menu_sales?.length
    ? prev.menu_sales.map((m) => m.name)
    : DEFAULT_MENUS

  const d = parseISODate(date)
  const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`

  return (
    <>
      {readOnly && <ReadOnlyBanner />}

      <ClosingLogForm
        key={`${activeStore.id}-${date}`}
        storeId={activeStore.id}
        storeName={activeStore.name}
        date={date}
        dateLabel={dateLabel}
        existing={existing}
        menuNames={menuNames}
        readOnly={readOnly}
      />

      <div className="card mt-5">
        <h3 className="card-title">이번 주 마감일지</h3>
        <p className="card-sub">
          빠진 날은 &lsquo;미작성&rsquo;으로 표시됩니다. 날짜를 누르면 그날 일지를 보거나
          고칠 수 있습니다.
        </p>
        <div className="overflow-x-auto">
          {/* 폰에서는 줄바꿈 대신 가로로 밀어 본다 */}
          <table className="tbl min-w-[480px] whitespace-nowrap">
            <thead>
              <tr>
                <th>날짜</th>
                <th>컨디션</th>
                <th>오픈런</th>
                <th>예약</th>
                <th>만석</th>
                <th>이슈</th>
              </tr>
            </thead>
            <tbody>
              {days.map((iso) => {
                const r = byDate.get(iso)
                const flags = r
                  ? [
                      r.late && '지각',
                      r.complaint && '컴플레인',
                      r.stock_issue && '재고',
                      r.issues?.length ? `특이 ${r.issues.length}` : '',
                    ].filter(Boolean)
                  : []
                return (
                  <tr key={iso}>
                    <td>
                      <Link
                        href={`/closing-log?date=${iso}`}
                        className={`font-semibold hover:text-brand-deep hover:underline ${
                          iso === date ? 'text-brand-deep' : ''
                        }`}
                      >
                        {formatDateShort(iso)}
                      </Link>
                    </td>
                    {r ? (
                      <>
                        <td className="tabular-nums font-bold">
                          <span
                            className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${
                              DOT[conditionLevel(r.condition)]
                            }`}
                          />
                          {r.condition}
                        </td>
                        <td className="tabular-nums">{r.open_run}</td>
                        <td className="tabular-nums">{r.naver_bookings}</td>
                        <td className="tabular-nums">{r.full_at || '—'}</td>
                        <td>
                          {flags.length ? (
                            <span className="font-bold text-bad">{flags.join(' · ')}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <td colSpan={5}>
                        {iso > today ? (
                          <span className="text-[11px] text-muted">—</span>
                        ) : (
                          <span className="pill pill-w">미작성</span>
                        )}
                      </td>
                    )}
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
