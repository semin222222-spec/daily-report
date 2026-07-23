'use client'

import { useMemo, useState, useTransition } from 'react'
import { parseISODate } from '@/lib/format'
import type { ScheduleDay, Shift, Staff } from '@/lib/types'
import { setScheduleDay, setShift } from './actions'

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

/** 매장에서 쓰는 화이트보드처럼, 하루에 누가 나오는지 이름만 세워둔다 */
const ON_DUTY = '출근'

function cellKey(staffId: string, date: string) {
  return `${staffId}|${date}`
}

export function ScheduleBoard({
  staff,
  shifts,
  days,
  dates,
  view,
}: {
  staff: Staff[]
  shifts: Shift[]
  days: ScheduleDay[]
  dates: string[]
  view: 'week' | 'month'
}) {
  const [, startTransition] = useTransition()

  // 저장을 기다리지 않고 바로 그린다. 실패하면 되돌린다.
  const [assigned, setAssigned] = useState<Set<string>>(
    () => new Set(shifts.filter((s) => s.code).map((s) => cellKey(s.staff_id, s.date)))
  )
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(days.map((d) => [d.date, d.note]))
  )
  const [holidays, setHolidays] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(days.filter((d) => d.is_holiday).map((d) => [d.date, true]))
  )
  const [failed, setFailed] = useState<string | null>(null)

  const staffById = useMemo(
    () => Object.fromEntries(staff.map((s) => [s.id, s])),
    [staff]
  )

  function assign(staffId: string, date: string, on: boolean) {
    const key = cellKey(staffId, date)
    setAssigned((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

    startTransition(async () => {
      const res = await setShift(staffId, date, on ? ON_DUTY : '')
      if (!res.ok) {
        setAssigned((prev) => {
          const next = new Set(prev)
          if (on) next.delete(key)
          else next.add(key)
          return next
        })
        setFailed(res.message ?? '저장에 실패했습니다.')
      }
    })
  }

  function toggleHoliday(date: string) {
    const next = !holidays[date]
    setHolidays((h) => ({ ...h, [date]: next }))
    startTransition(async () => {
      const res = await setScheduleDay(date, { is_holiday: next })
      if (!res.ok) {
        setHolidays((h) => ({ ...h, [date]: !next }))
        setFailed(res.message ?? '저장에 실패했습니다.')
      }
    })
  }

  function saveNote(date: string, note: string) {
    startTransition(async () => {
      await setScheduleDay(date, { note })
    })
  }

  /** 그날 배정된 사람들 — 직원 먼저, 그 다음 알바 */
  const rosterOf = (date: string) =>
    staff
      .filter((s) => assigned.has(cellKey(s.id, date)))
      .sort((a, b) =>
        a.emp_type === b.emp_type ? 0 : a.emp_type === '직원' ? -1 : 1
      )

  const countsOf = (date: string) => {
    const list = rosterOf(date)
    const staffCount = list.filter((s) => s.emp_type === '직원').length
    return {
      staffCount,
      partCount: list.length - staffCount,
      total: list.length,
    }
  }

  const isRed = (d: string) =>
    parseISODate(d).getDay() === 0 || holidays[d] === true

  // 이 기간 전체 합계
  const grand = dates.reduce(
    (acc, d) => {
      const c = countsOf(d)
      return {
        staffCount: acc.staffCount + c.staffCount,
        partCount: acc.partCount + c.partCount,
        total: acc.total + c.total,
      }
    },
    { staffCount: 0, partCount: 0, total: 0 }
  )

  return (
    <div className="card">
      <h3 className="card-title">근무 스케줄</h3>
      <p className="card-sub">
        날짜별로 나오는 사람을 세워둡니다. <b>+ 인원</b>으로 추가하고 이름 옆
        ✕로 뺍니다. 날짜를 누르면 <b>공휴일(빨간날)</b>이 됩니다. 저장은
        자동입니다.
      </p>

      {failed && (
        <div className="mb-3 rounded-[10px] border border-bad/30 bg-bad/[.06] px-3.5 py-2.5 text-[13px] text-bad">
          {failed}
        </div>
      )}

      {staff.length === 0 && (
        <p className="py-8 text-center text-[13px] text-muted">
          등록된 인원이 없습니다. 아래 [근무 인원 명단]에서 먼저 추가해주세요.
        </p>
      )}

      {/* 주간=7칸 한 줄, 월간=달력처럼 7칸씩 줄바꿈 */}
      <div
        className={`grid gap-2 ${
          view === 'week'
            ? 'grid-cols-1 sm:grid-cols-2 shell:grid-cols-7'
            : 'grid-cols-1 sm:grid-cols-2 shell:grid-cols-7'
        }`}
      >
        {dates.map((d) => {
          const dow = parseISODate(d).getDay()
          const red = isRed(d)
          const roster = rosterOf(d)
          const c = countsOf(d)
          const available = staff.filter(
            (s) => !assigned.has(cellKey(s.id, d))
          )

          return (
            <div
              key={d}
              className={`flex min-h-[190px] flex-col rounded-[12px] border ${
                red ? 'border-bad/30 bg-bad/[.04]' : 'border-line bg-[#fbfaf8]'
              }`}
            >
              {/* 날짜 머리 — 누르면 공휴일 토글 */}
              <button
                type="button"
                onClick={() => toggleHoliday(d)}
                title={holidays[d] ? '공휴일 해제' : '공휴일로 지정'}
                className={`rounded-t-[11px] border-b px-2 py-1.5 text-center transition hover:bg-brand/10 ${
                  red ? 'border-bad/20' : 'border-line'
                }`}
              >
                <div
                  className={`text-[13px] font-extrabold ${
                    red ? 'text-bad' : dow === 6 ? 'text-s1' : 'text-ink'
                  }`}
                >
                  {DAY_KO[dow]}
                  {holidays[d] && <span className="ml-1 text-[10px]">●</span>}
                </div>
                <div className="text-[10.5px] text-muted tabular-nums">
                  {d.slice(5).replace('-', '/')}
                </div>
              </button>

              {/* 배정된 사람들 */}
              <div className="flex-1 space-y-1 p-1.5">
                {roster.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-1 rounded-[7px] px-1.5 py-1 text-[12px] font-semibold ${
                      s.emp_type === '직원'
                        ? 'bg-s2/10 text-s2'
                        : 'bg-s3/15 text-[#8a5a00]'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {s.name}
                      <span className="ml-0.5 font-normal opacity-70">
                        ({s.emp_type})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => assign(s.id, d, false)}
                      aria-label={`${s.name} 빼기`}
                      className="shrink-0 px-0.5 opacity-50 transition hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {roster.length === 0 && (
                  <p className="py-3 text-center text-[11.5px] text-muted">
                    없음
                  </p>
                )}

                {/* 추가 — 아직 안 넣은 사람만 목록에 뜬다 */}
                {available.length > 0 && (
                  <select
                    value=""
                    aria-label={`${d} 인원 추가`}
                    onChange={(e) => {
                      if (e.target.value) assign(e.target.value, d, true)
                    }}
                    className="w-full rounded-[7px] border border-dashed border-line bg-transparent
                               px-1.5 py-1 text-[11.5px] text-muted outline-none
                               transition hover:border-brand hover:text-brand-deep
                               focus:border-brand"
                  >
                    <option value="">+ 인원</option>
                    {available.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.emp_type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 특이사항 */}
              <input
                value={notes[d] ?? ''}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [d]: e.target.value }))
                }
                onBlur={(e) => saveNote(d, e.target.value)}
                placeholder="특이사항"
                className="border-t border-line bg-transparent px-2 py-1.5 text-center
                           text-[11px] outline-none focus:bg-brand/[.06]"
              />

              {/* 합계 — 직원 / 알바 분리 */}
              <div
                className={`rounded-b-[11px] border-t px-2 py-1.5 text-center ${
                  red ? 'border-bad/20 bg-bad/[.06]' : 'border-line bg-line-soft'
                }`}
              >
                <div className="text-[13px] font-extrabold tabular-nums">
                  {c.total}명
                </div>
                <div className="text-[10.5px] text-muted tabular-nums">
                  직원 {c.staffCount} · 알바 {c.partCount}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 기간 전체 합계 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-line-soft/60 px-4 py-3">
        <span className="text-[13px] font-bold text-ink-2">
          기간 합계 ({dates.length}일)
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
          <span>
            <span className="text-muted">연인원 </span>
            <b className="tabular-nums">{grand.total}명</b>
          </span>
          <span className="text-s2">
            <span className="opacity-70">직원 </span>
            <b className="tabular-nums">{grand.staffCount}명</b>
          </span>
          <span className="text-[#8a5a00]">
            <span className="opacity-70">알바 </span>
            <b className="tabular-nums">{grand.partCount}명</b>
          </span>
          <span>
            <span className="text-muted">일평균 </span>
            <b className="tabular-nums">
              {dates.length ? (grand.total / dates.length).toFixed(1) : '0'}명
            </b>
          </span>
        </div>
      </div>
    </div>
  )
}
