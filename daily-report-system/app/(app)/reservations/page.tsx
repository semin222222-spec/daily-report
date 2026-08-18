import Link from 'next/link'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import {
  formatDateKo,
  num,
  parseISODate,
  toISODate,
  todayKST,
  weekRange,
  won,
} from '@/lib/format'
import { getReservationsBetween } from '@/lib/queries'
import { guardMenu } from '@/lib/session'
import { addReservation } from './actions'
import { Fields, ReservationList } from './ReservationList'

export const dynamic = 'force-dynamic'

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

/** 주간 스트립에 쓸 월~일 7일 */
function weekDays(anchor: string): string[] {
  const { start } = weekRange(anchor)
  const d = parseISODate(start)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d)
    day.setDate(d.getDate() + i)
    return toISODate(day)
  })
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const { activeStore, readOnly } = await guardMenu('/reservations')

  const date =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : todayKST()

  // 한 주를 한 번에 읽어서 스트립(요일별 건수)과 그날 목록에 같이 쓴다
  const days = weekDays(date)
  const week = await getReservationsBetween(activeStore.id, days[0], days[6])
  const rows = week.filter((r) => r.date === date)

  const step = (dir: number) => {
    const d = parseISODate(date)
    d.setDate(d.getDate() + dir)
    return toISODate(d)
  }
  const link = (d: string) => `/reservations?date=${d}`

  const live = rows.filter(
    (r) => r.status === 'booked' || r.status === 'visited'
  )
  const guests = live.reduce((s, r) => s + Number(r.party_size || 0), 0)
  const deposit = live.reduce((s, r) => s + Number(r.deposit || 0), 0)
  const waiting = rows.filter((r) => r.status === 'booked').length

  return (
    <>
      {readOnly && <ReadOnlyBanner />}

      {/* ── 날짜 이동 ─────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="text-[15px] font-extrabold">{formatDateKo(date)}</div>

        <div className="ml-auto flex items-center gap-2">
          <Link href={link(step(-1))} className="btn-ghost !py-2 !text-[13px]">
            ←
          </Link>
          <Link href={link(step(1))} className="btn-ghost !py-2 !text-[13px]">
            →
          </Link>
          <Link href={link(todayKST())} className="btn-ghost !py-2 !text-[13px]">
            오늘
          </Link>
          {/* 먼 날짜로 한 번에 — 자바스크립트 없이 GET 폼으로 이동한다 */}
          <form method="get" className="flex items-center gap-1.5">
            <input
              type="date"
              name="date"
              defaultValue={date}
              aria-label="날짜 선택"
              className="fld-input !w-[150px] !py-2 !text-[13px]"
            />
            <button type="submit" className="btn-ghost !px-3 !py-2 !text-[13px]">
              이동
            </button>
          </form>
        </div>
      </div>

      {/* ── 이번 주 한눈에 ────────────────────────── */}
      <div className="mb-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const dayRows = week.filter(
            (r) => r.date === d && r.status !== 'canceled'
          )
          const dow = parseISODate(d).getDay()
          const active = d === date
          return (
            <Link
              key={d}
              href={link(d)}
              className={`rounded-[11px] border px-1 py-2 text-center transition ${
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-surface hover:border-brand/50'
              }`}
            >
              <div
                className={`text-[10.5px] font-bold ${
                  active
                    ? 'text-white/70'
                    : dow === 0
                      ? 'text-bad'
                      : dow === 6
                        ? 'text-s1'
                        : 'text-muted'
                }`}
              >
                {DAY_KO[dow]}
              </div>
              <div className="text-[14px] font-extrabold tabular-nums">
                {parseISODate(d).getDate()}
              </div>
              <div
                className={`text-[10.5px] font-semibold tabular-nums ${
                  active ? 'text-white/80' : 'text-muted'
                }`}
              >
                {dayRows.length > 0 ? `${dayRows.length}팀` : '—'}
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── 그날 요약 ─────────────────────────────── */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 shell:grid-cols-4">
        <div className="tile">
          <div className="tile-lab">📋 예약 팀수</div>
          <div className="tile-val">{num(live.length)}팀</div>
        </div>
        <div className="tile">
          <div className="tile-lab">👥 예약 인원</div>
          <div className="tile-val">{num(guests)}명</div>
        </div>
        <div className="tile">
          <div className="tile-lab">⏳ 방문 대기</div>
          <div className="tile-val">{num(waiting)}팀</div>
        </div>
        <div className="tile">
          <div className="tile-lab">💳 예약금 합계</div>
          <div className="tile-val">{won(deposit)}</div>
        </div>
      </div>

      <ReservationList
        key={`${activeStore.id}-${date}`}
        rows={rows}
        date={date}
        readOnly={readOnly}
      />

      {/* ── 예약 추가 ─────────────────────────────── */}
      {!readOnly && (
        <div className="card mt-4">
          <h3 className="card-title">예약 추가</h3>
          <p className="card-sub">
            전화·네이버 등으로 들어온 예약을 바로 적어두세요. 날짜를 바꾸면 그
            날짜로 등록됩니다.
          </p>

          <form action={addReservation} key={date}>
            <Fields date={date} />
            <div className="btn-row">
              <button type="submit" className="btn">
                예약 등록
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
