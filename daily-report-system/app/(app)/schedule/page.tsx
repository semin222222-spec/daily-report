import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import Link from 'next/link'
import {
  formatDateShort,
  monthRange,
  parseISODate,
  toISODate,
  todayKST,
  weekRange,
} from '@/lib/format'
import { getSessionContext, guardMenu } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import type { ScheduleDay, Shift, Staff } from '@/lib/types'
import { addScheduleStaff, removeScheduleStaff } from './actions'
import { ScheduleBoard } from './ScheduleBoard'

export const dynamic = 'force-dynamic'

type View = 'week' | 'month'

/** start~end 사이의 모든 날짜 */
function dateRange(start: string, end: string): string[] {
  const out: string[] = []
  const d = parseISODate(start)
  const last = parseISODate(end)
  while (d <= last) {
    out.push(toISODate(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { view?: string; start?: string }
}) {
  const { activeStore, readOnly } = await guardMenu('/schedule')
  const supabase = createClient()

  const view: View = searchParams.view === 'month' ? 'month' : 'week'
  const anchor =
    searchParams.start && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.start)
      ? searchParams.start
      : todayKST()

  const span = view === 'week' ? weekRange(anchor) : monthRange(anchor)
  const dates = dateRange(span.start, span.end)

  const [staffRes, shiftRes, dayRes] = await Promise.all([
    supabase
      .from('staff')
      .select('*')
      .eq('store_id', activeStore.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('shifts')
      .select('*')
      .eq('store_id', activeStore.id)
      .gte('date', span.start)
      .lte('date', span.end),
    supabase
      .from('schedule_days')
      .select('*')
      .eq('store_id', activeStore.id)
      .gte('date', span.start)
      .lte('date', span.end),
  ])

  const staff = (staffRes.data ?? []) as Staff[]
  const shifts = (shiftRes.data ?? []) as Shift[]
  const days = (dayRes.data ?? []) as ScheduleDay[]

  // 이전/다음 기간
  const step = (dir: number) => {
    const d = parseISODate(anchor)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    return toISODate(d)
  }

  const link = (v: View, start: string) => `/schedule?view=${v}&start=${start}`

  return (
    <>
      {readOnly && <ReadOnlyBanner />}
      {/* ── 기간 전환 ─────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
          {(['week', 'month'] as const).map((v) => (
            <Link
              key={v}
              href={link(v, anchor)}
              className={`rounded-[9px] px-3.5 py-1.5 text-[13px] font-bold transition ${
                view === v
                  ? 'bg-page text-ink shadow-[inset_0_0_0_1px_#e7e4dd]'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              {v === 'week' ? '주간' : '월간'}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link href={link(view, step(-1))} className="btn-ghost !py-2 !text-[13px]">
            ←
          </Link>
          <span className="min-w-[150px] text-center text-[13px] font-semibold text-ink-2">
            {formatDateShort(span.start)} ~ {formatDateShort(span.end)}
          </span>
          <Link href={link(view, step(1))} className="btn-ghost !py-2 !text-[13px]">
            →
          </Link>
          <Link href={link(view, todayKST())} className="btn-ghost !py-2 !text-[13px]">
            오늘
          </Link>
        </div>
      </div>

      <ScheduleBoard
        staff={staff}
        shifts={shifts}
        days={days}
        dates={dates}
        view={view}
      />

      {/* ── 인원 명단 ─────────────────────────────── */}
      <div className="card mt-4">
        <h3 className="card-title">근무 인원 명단</h3>
        <p className="card-sub">
          여기 올린 사람이 위 스케줄표의 행이 됩니다. 급여는 [인건비] 화면에서
          달마다 따로 적습니다.
        </p>

        {staff.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>직책</th>
                  <th>포지션</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.emp_type}</td>
                    <td>{s.position || '—'}</td>
                    <td className="text-right">
                      <form action={removeScheduleStaff}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="btn-ghost !px-3 !py-1.5 !text-xs hover:!border-bad hover:!text-bad"
                        >
                          명단에서 내리기
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={addScheduleStaff} className="flex flex-wrap gap-2">
          <input
            name="name"
            required
            placeholder="이름"
            className="fld-input min-w-0 flex-1"
          />
          <select
            name="emp_type"
            defaultValue="직원"
            aria-label="직책"
            className="fld-input w-full shell:w-[110px]"
          >
            <option value="직원">직원</option>
            <option value="알바">알바</option>
          </select>
          <input
            name="position"
            placeholder="홀 / 주방"
            className="fld-input w-full shell:w-[140px]"
          />
          <button type="submit" className="btn">
            추가
          </button>
        </form>
      </div>
    </>
  )
}
