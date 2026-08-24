'use client'

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { pct, won } from '@/lib/format'
import {
  cellKey,
  dayLabel,
  purchaseRate,
  sumMonth,
  sumVendor,
  sumWeek,
  sumWeekAll,
  toAmountMap,
  WEEKDAY_KO,
  type PurchaseWeek,
} from '@/lib/purchases'
import type {
  PurchaseEntry,
  PurchaseVendor,
  PurchaseWeekNote,
} from '@/lib/types'
import { savePurchases } from './actions'

const onlyDigits = (s: string) => s.replace(/[^\d]/g, '')
const digits = (s: string) => Number(onlyDigits(s)) || 0

/** 입력칸에 3자리 콤마를 붙여 보여준다 (100000 → 100,000) */
const comma = (s: string) => {
  const d = onlyDigits(s)
  return d ? Number(d).toLocaleString('ko-KR') : ''
}

/**
 * 거래처 매입 격자 — 엑셀 「거래처 매입 현황」 그대로.
 *
 *   위    요약표   : 주(週) × 거래처 합계 + 비고
 *   가운데 거래처 블록: 거래처마다 "주 5칸 × 요일 7줄" 격자에 금액을 적는다
 *   아래  비율표   : 주별 매출(일마감) 대비 매입 비율
 *
 * 저장 버튼은 없다. 입력이 1초간 멈추면 바뀐 칸만 알아서 저장한다.
 */
export function PurchaseSheet({
  ym,
  vendors,
  entries,
  notes,
  weeks,
  weekSales,
  monthSales,
  readOnly,
}: {
  ym: string
  vendors: PurchaseVendor[]
  entries: PurchaseEntry[]
  notes: PurchaseWeekNote[]
  weeks: PurchaseWeek[]
  /** 주별 매출 (weeks와 같은 순서) */
  weekSales: number[]
  monthSales: number
  readOnly: boolean
}) {
  const [, startTransition] = useTransition()

  // 입력 중에는 문자열로 들고 있어야 지웠다 쓰기가 자연스럽다
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const map = toAmountMap(entries)
    return Object.fromEntries(
      Object.entries(map).map(([k, v]) => [k, String(v)])
    )
  })
  const [noteVals, setNoteVals] = useState<Record<number, string>>(() =>
    Object.fromEntries(notes.map((n) => [n.week_no, n.note]))
  )
  const [autoState, setAutoState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')

  const vendorIds = useMemo(() => vendors.map((v) => v.id), [vendors])

  // 계산용 숫자 맵 — 화면 표시와 합계가 같은 값을 보게 한다
  const nums = useMemo(() => {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(amounts)) {
      const n = digits(v)
      if (n) out[k] = n
    }
    return out
  }, [amounts])

  const monthTotal = sumMonth(nums, vendorIds, weeks)

  // ── 저장 ────────────────────────────────────────────────────
  // 바뀐 칸만 모아둔다. 한 달 250칸을 매번 다 보내면 저장이 무거워진다.
  const dirtyCells = useRef<Set<string>>(new Set())
  const dirtyNotes = useRef<Set<number>>(new Set())
  const amountsRef = useRef(amounts)
  amountsRef.current = amounts
  const notesRef = useRef(noteVals)
  notesRef.current = noteVals

  function setCell(vendorId: string, date: string, raw: string) {
    const key = cellKey(vendorId, date)
    dirtyCells.current.add(key)
    setAmounts((a) => ({ ...a, [key]: onlyDigits(raw) }))
  }

  function setNote(weekNo: number, raw: string) {
    dirtyNotes.current.add(weekNo)
    setNoteVals((n) => ({ ...n, [weekNo]: raw }))
  }

  async function persist(): Promise<boolean> {
    const cellKeys = Array.from(dirtyCells.current)
    const noteNos = Array.from(dirtyNotes.current)
    if (cellKeys.length === 0 && noteNos.length === 0) return true

    dirtyCells.current = new Set()
    dirtyNotes.current = new Set()

    const res = await savePurchases({
      ym,
      cells: cellKeys.map((k) => {
        const [vendorId, date] = k.split('|')
        return { vendorId, date, amount: digits(amountsRef.current[k] ?? '') }
      }),
      notes: noteNos.map((n) => ({ weekNo: n, note: notesRef.current[n] ?? '' })),
    })

    // 실패하면 다시 "안 저장됨"으로 되돌려 다음 저장에서 재시도한다
    if (!res.ok) {
      cellKeys.forEach((k) => dirtyCells.current.add(k))
      noteNos.forEach((n) => dirtyNotes.current.add(n))
    }
    return res.ok
  }

  const persistRef = useRef(persist)
  persistRef.current = persist

  // 입력이 1초간 멈추면 알아서 저장한다. 첫 렌더(초기 로드·월 전환)에는 저장하지 않는다.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (readOnly) return
    // 바뀐 칸이 없으면 아무것도 하지 않는다. (개발 모드의 이펙트 2회 실행처럼
    // 입력 없이 이 이펙트가 돌 때 "저장됨"이 잘못 뜨는 걸 막는다)
    if (dirtyCells.current.size === 0 && dirtyNotes.current.size === 0) return
    setAutoState('saving')
    const t = setTimeout(() => {
      startTransition(async () => {
        const ok = await persistRef.current()
        setAutoState(ok ? 'saved' : 'error')
      })
    }, 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amounts, noteVals])

  // 저장 대기(1초) 중에 월을 바꾸거나 화면을 떠나면 마지막 변경을 즉시 저장한다
  useEffect(() => {
    return () => {
      if (dirtyCells.current.size || dirtyNotes.current.size) {
        persistRef.current()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* ── 요약표 : 주 × 거래처 ───────────────────── */}
      <div className="card">
        <h3 className="card-title">업체별 분류</h3>
        <p className="card-sub">
          아래 거래처별 표에 적은 금액이 주(월~일)별로 자동 합산됩니다.
        </p>

        <div className="-mx-2 overflow-x-auto px-2">
          <table className="tbl min-w-[640px]">
            <thead>
              <tr>
                <th className="whitespace-nowrap">일자</th>
                {vendors.map((v) => (
                  <th key={v.id} className="whitespace-nowrap">
                    {v.name}
                  </th>
                ))}
                <th className="whitespace-nowrap">합계</th>
                <th className="whitespace-nowrap">비고</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={w.no}>
                  <td className="whitespace-nowrap font-bold">
                    {w.label}
                    <span className="ml-1 text-[11px] font-normal text-muted">
                      {dayLabel(w.start)}~{dayLabel(w.end)}일
                    </span>
                  </td>
                  {vendors.map((v) => {
                    const n = sumWeek(nums, v.id, w)
                    return (
                      <td
                        key={v.id}
                        className={`tabular-nums ${n ? '' : 'text-muted'}`}
                      >
                        {n ? n.toLocaleString('ko-KR') : '–'}
                      </td>
                    )
                  })}
                  <td className="tabular-nums font-bold">
                    {sumWeekAll(nums, vendorIds, w).toLocaleString('ko-KR')}
                  </td>
                  <td className="!px-1">
                    <input
                      value={noteVals[w.no] ?? ''}
                      onChange={(e) => setNote(w.no, e.target.value)}
                      disabled={readOnly}
                      placeholder="—"
                      aria-label={`${w.label} 비고`}
                      className="fld-input w-[130px] !py-1.5 !text-[13px] disabled:opacity-60"
                    />
                  </td>
                </tr>
              ))}
              <tr className="pl-total">
                <td>계</td>
                {vendors.map((v) => (
                  <td key={v.id} className="tabular-nums">
                    {sumVendor(nums, v.id, weeks).toLocaleString('ko-KR')}
                  </td>
                ))}
                <td className="tabular-nums">
                  {monthTotal.toLocaleString('ko-KR')}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 거래처별 입력 격자 ─────────────────────── */}
      {vendors.map((v) => {
        const vendorTotal = sumVendor(nums, v.id, weeks)
        return (
          <div key={v.id} className="card mt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="card-title">{v.name}</h3>
              <span className="text-[13px]">
                <span className="text-muted">총합계 </span>
                <b className="tabular-nums">{won(vendorTotal)}</b>
              </span>
            </div>

            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="border-b border-line pb-2 pr-2 text-left text-xs font-semibold text-muted">
                      요일
                    </th>
                    {weeks.map((w) => (
                      <th
                        key={w.no}
                        colSpan={2}
                        className="border-b border-line px-2 pb-2 text-center text-xs font-semibold text-muted"
                      >
                        {w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAY_KO.map((dow, row) => (
                    <tr key={dow}>
                      <td className="border-b border-line-soft py-1 pr-2 text-left text-[12px] font-semibold text-muted">
                        {dow}
                      </td>
                      {weeks.map((w) => {
                        const date = w.days[row]
                        if (!date) {
                          return (
                            <td
                              key={w.no}
                              colSpan={2}
                              className="border-b border-line-soft bg-line-soft/40 py-1"
                            />
                          )
                        }
                        const key = cellKey(v.id, date)
                        return (
                          <Fragment key={w.no}>
                            <td className="whitespace-nowrap border-b border-line-soft py-1 pl-2 text-right text-[12px] text-ink-2">
                              {dayLabel(date)}일
                            </td>
                            <td className="border-b border-line-soft py-1 pl-1 pr-2">
                              <input
                                value={comma(amounts[key] ?? '')}
                                onChange={(e) =>
                                  setCell(v.id, date, e.target.value)
                                }
                                disabled={readOnly}
                                inputMode="numeric"
                                placeholder="0"
                                aria-label={`${v.name} ${date} 매입액`}
                                className="w-[96px] rounded-[8px] border border-line bg-[#fbfaf8]
                                           px-2 py-[7px] text-right text-[13px] tabular-nums outline-none
                                           transition focus:border-brand focus:bg-white
                                           focus:ring-[3px] focus:ring-brand/10
                                           disabled:cursor-not-allowed disabled:opacity-60"
                              />
                            </td>
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="border-t-2 border-line py-2 pr-2 text-left text-[12px] font-extrabold">
                      합계
                    </td>
                    {weeks.map((w) => (
                      <td
                        key={w.no}
                        colSpan={2}
                        className="border-t-2 border-line py-2 pr-2 text-right font-extrabold tabular-nums"
                      >
                        {sumWeek(nums, v.id, w).toLocaleString('ko-KR')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* ── 매출 대비 매입 비율 ────────────────────── */}
      <div className="card mt-4">
        <h3 className="card-title">매출 대비 매입 비율</h3>
        <p className="card-sub">
          매출은 일마감 합계를 그대로 가져옵니다. 일마감이 비어 있는 주는
          비율이 0%로 나옵니다.
        </p>

        <table className="tbl">
          <thead>
            <tr>
              <th>주</th>
              <th>매출</th>
              <th>매입</th>
              <th>비율</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => {
              const purchase = sumWeekAll(nums, vendorIds, w)
              const rate = purchaseRate(purchase, weekSales[i])
              return (
                <tr key={w.no}>
                  <td className="font-bold">{w.label}</td>
                  <td className="tabular-nums">{won(weekSales[i])}</td>
                  <td className="tabular-nums">{won(purchase)}</td>
                  <td
                    className={`tabular-nums font-bold ${
                      rate > 40 ? 'text-bad' : rate > 33 ? 'text-warn' : ''
                    }`}
                  >
                    {pct(rate)}
                  </td>
                </tr>
              )
            })}
            <tr className="pl-total">
              <td>{Number(ym.slice(5, 7))}월</td>
              <td className="tabular-nums">{won(monthSales)}</td>
              <td className="tabular-nums">{won(monthTotal)}</td>
              <td className="tabular-nums">
                {pct(purchaseRate(monthTotal, monthSales))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 자동 저장 상태 ─────────────────────────── */}
      {!readOnly && (
        <div className="sticky bottom-4 z-10 mt-4 flex items-center justify-end gap-3">
          <span
            className={`rounded-[10px] bg-surface px-3 py-2 text-[13px] font-semibold shadow-card ${
              autoState === 'error' ? 'text-bad' : 'text-muted'
            }`}
            role="status"
          >
            {autoState === 'saving'
              ? '자동 저장 중…'
              : autoState === 'saved'
                ? '✓ 자동 저장됨'
                : autoState === 'error'
                  ? '저장 실패 — 다시 시도하세요'
                  : '입력하면 자동 저장됩니다'}
          </span>
          <span className="rounded-[10px] bg-surface px-3 py-2 text-[13px] shadow-card">
            <span className="text-muted">이달 매입 </span>
            <b className="tabular-nums">{won(monthTotal)}</b>
          </span>
        </div>
      )}
    </>
  )
}
