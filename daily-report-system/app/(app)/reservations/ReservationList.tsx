'use client'

import { useMemo, useState, useTransition } from 'react'
import { num, won } from '@/lib/format'
import {
  RESERVATION_CHANNELS,
  RESERVATION_STATUSES,
  formatPhone,
  statusMeta,
} from '@/lib/reservations'
import type { Reservation, ReservationStatus } from '@/lib/types'
import {
  deleteReservation,
  setReservationStatus,
  updateReservation,
} from './actions'

/**
 * 하루치 예약 목록.
 * 상태 전환·삭제는 화면을 먼저 바꾸고 저장이 뒤를 따른다(할일 목록과 같은 방식).
 * 매장이나 날짜가 바뀌면 page.tsx가 key로 이 컴포넌트를 새로 만들어
 * 낙관적 상태가 이전 날짜의 것으로 남지 않게 한다.
 */
export function ReservationList({
  rows,
  date,
  readOnly,
}: {
  rows: Reservation[]
  date: string
  readOnly: boolean
}) {
  const [statusMap, setStatusMap] = useState<Record<string, ReservationStatus>>(
    () => Object.fromEntries(rows.map((r) => [r.id, r.status]))
  )
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const visible = useMemo(
    () => rows.filter((r) => !removed.has(r.id)),
    [rows, removed]
  )

  // 취소·노쇼는 인원 집계에서 뺀다
  const live = visible.filter(
    (r) => statusMap[r.id] === 'booked' || statusMap[r.id] === 'visited'
  )
  const guests = live.reduce((s, r) => s + Number(r.party_size || 0), 0)
  const visited = visible.filter((r) => statusMap[r.id] === 'visited').length
  const noshow = visible.filter((r) => statusMap[r.id] === 'noshow').length

  function changeStatus(id: string, status: ReservationStatus) {
    if (readOnly) return
    setStatusMap((m) => ({ ...m, [id]: status }))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      fd.set('status', status)
      await setReservationStatus(fd)
    })
  }

  function remove(id: string) {
    if (readOnly) return
    setRemoved((s) => new Set(s).add(id))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteReservation(fd)
    })
  }

  function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setEditing(null)
    startTransition(async () => {
      await updateReservation(fd)
    })
  }

  return (
    <div className="card">
      <h3 className="card-title">
        예약 목록 <span className="pill pill-w">{live.length}팀</span>
      </h3>
      <p className="card-sub">
        총 <b className="text-brand-deep">{num(guests)}명</b> · 방문완료 {visited}팀
        {noshow > 0 && <> · 노쇼 {noshow}팀</>}
      </p>

      {visible.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          이 날짜에 등록된 예약이 없습니다. 아래에서 추가하세요.
        </p>
      )}

      <div className="space-y-2">
        {visible.map((r) => {
          const status = statusMap[r.id] ?? r.status
          const meta = statusMeta(status)
          const dimmed = status === 'canceled' || status === 'noshow'

          if (editing === r.id) {
            return (
              <form
                key={r.id}
                onSubmit={submitEdit}
                className="rounded-[12px] border border-brand/40 bg-brand/[.03] p-3"
              >
                <input type="hidden" name="id" value={r.id} />
                <Fields row={r} date={date} />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="btn-ghost !py-2 !text-[13px]"
                  >
                    취소
                  </button>
                  <button type="submit" className="btn !py-2 !text-[13px]">
                    수정 저장
                  </button>
                </div>
              </form>
            )
          }

          return (
            <div
              key={r.id}
              className={`rounded-[12px] border border-line bg-[#fbfaf8] p-3 transition ${
                dimmed ? 'opacity-55' : ''
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-[15px] font-extrabold tabular-nums">
                  {r.time || '시간미정'}
                </span>
                <span className="text-[14px] font-bold">
                  {r.name || '이름없음'}
                </span>
                {r.party_size > 0 && (
                  <span className="text-[13px] font-semibold text-ink-2">
                    {r.party_size}명
                  </span>
                )}
                <span className="rounded-full bg-line-soft px-2 py-[3px] text-[11px] font-semibold text-muted">
                  {r.channel}
                </span>
                <span className={`pill ${meta.pill}`}>{meta.label}</span>

                {!readOnly && (
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(r.id)}
                      className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
                    >
                      삭제
                    </button>
                  </span>
                )}
              </div>

              {(r.phone || r.deposit > 0 || r.memo) && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-ink-2">
                  {r.phone && (
                    <a
                      href={`tel:${r.phone.replace(/[^0-9+]/g, '')}`}
                      className="font-semibold text-s1 hover:underline"
                    >
                      📞 {formatPhone(r.phone)}
                    </a>
                  )}
                  {r.deposit > 0 && <span>💳 예약금 {won(r.deposit)}</span>}
                  {r.memo && <span className="text-muted">📝 {r.memo}</span>}
                </div>
              )}

              {!readOnly && (
                <div className="mt-2.5 flex overflow-hidden rounded-[9px] border border-line">
                  {RESERVATION_STATUSES.map((s) => {
                    const active = status === s.value
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => changeStatus(r.id, s.value)}
                        className={`flex-1 px-2 py-1.5 text-[12px] font-bold transition ${
                          active
                            ? s.active
                            : 'bg-white text-ink-2 hover:bg-line-soft'
                        }`}
                      >
                        {active && '✓ '}
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 예약 입력칸 한 벌 — 수정 폼과 추가 폼이 같은 모양을 쓰도록 공유한다.
 * row가 없으면 새 예약(빈 값)이다.
 */
export function Fields({
  row,
  date,
}: {
  row?: Reservation
  date: string
}) {
  return (
    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5 shell:grid-cols-4">
      <div>
        <label className="fld-label">날짜</label>
        <input
          name="date"
          type="date"
          defaultValue={row?.date ?? date}
          className="fld-input"
        />
      </div>
      <div>
        <label className="fld-label">시간</label>
        <input
          name="time"
          type="time"
          step={300}
          defaultValue={row?.time ?? ''}
          className="fld-input"
        />
      </div>
      <div>
        <label className="fld-label">예약자</label>
        <input
          name="name"
          defaultValue={row?.name ?? ''}
          placeholder="이름"
          className="fld-input"
        />
      </div>
      <div>
        <label className="fld-label">인원</label>
        <input
          name="party_size"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={row?.party_size || ''}
          placeholder="4"
          className="fld-input"
        />
      </div>
      <div>
        <label className="fld-label">연락처</label>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={row?.phone ?? ''}
          placeholder="010-0000-0000"
          className="fld-input"
        />
      </div>
      <div>
        <label className="fld-label">경로</label>
        <select
          name="channel"
          defaultValue={row?.channel ?? '전화'}
          className="fld-input"
        >
          {RESERVATION_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="fld-label">예약금</label>
        <input
          name="deposit"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={row?.deposit || ''}
          placeholder="0"
          className="fld-input"
        />
      </div>
      <div className="col-span-2 shell:col-span-1">
        <label className="fld-label">요청사항</label>
        <input
          name="memo"
          defaultValue={row?.memo ?? ''}
          placeholder="창가석, 아기의자…"
          className="fld-input"
        />
      </div>
    </div>
  )
}
