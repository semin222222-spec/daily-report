'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { num, won } from '@/lib/format'
import { ALL_CATEGORIES, COST_GROUPS, SECTIONS, sumItems } from '@/lib/settlement'
import type { SettlementCategory, SettlementItem } from '@/lib/types'
import { saveSettlement } from './actions'

interface Row {
  key: string
  category: SettlementCategory
  name: string
  amount: string // 입력 중에는 문자열로 들고 있어야 지웠다 쓰기가 자연스럽다
  rate: string // 알바 시급
  hours: string // 알바 근무시간
}

let rowSeq = 0
const newKey = () => `r${++rowSeq}`

function toRows(items: SettlementItem[]): Row[] {
  return items.map((i) => ({
    key: newKey(),
    category: i.category,
    name: i.name,
    amount: String(i.amount || ''),
    rate: String(i.rate || ''),
    hours: String(i.hours || ''),
  }))
}

const digits = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0
const onlyDigits = (s: string) => s.replace(/[^\d]/g, '')

/** 입력칸에 3자리 콤마를 붙여 보여준다 (100000 → 100,000) */
const comma = (s: string) => {
  const d = onlyDigits(s)
  return d ? Number(d).toLocaleString('ko-KR') : ''
}

/**
 * 그 줄의 금액. 금액 칸을 그대로 신뢰한다.
 * 알바는 시급·시간을 입력하면 금액 칸이 자동으로 채워지고(아래 setAlbaRate/Hours),
 * 시급·시간 없이 금액만 직접 입력해도 된다.
 */
function amountOf(r: Row): number {
  return Math.round(digits(r.amount))
}

export function SettlementSheet({
  ym,
  items,
  /** 지난달 항목 — 카테고리별 "지난달 복사"에 쓴다 */
  prevItems,
  categories,
  /** 일마감에서 계산한 이번 달 매출 합계 */
  autoSales,
  savedSales,
  savedSalesAuto,
  /** 매출·총수익 요약을 보여줄지 (인건비 화면에서는 숨긴다) */
  showSummary,
}: {
  ym: string
  items: SettlementItem[]
  prevItems: SettlementItem[]
  categories: SettlementCategory[]
  autoSales: number
  savedSales: number
  savedSalesAuto: boolean
  showSummary: boolean
}) {
  const [, startTransition] = useTransition()

  const [rows, setRows] = useState<Row[]>(() => toRows(items))
  const [salesAuto, setSalesAuto] = useState(savedSalesAuto)
  const [salesInput, setSalesInput] = useState(
    String(savedSalesAuto ? autoSales : savedSales || '')
  )
  const [autoState, setAutoState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')

  const sections = useMemo(
    () => SECTIONS.filter((s) => categories.includes(s.category)),
    [categories]
  )

  const totalSales = salesAuto ? autoSales : Number(salesInput.replace(/[^\d]/g, '')) || 0

  const rowsAsItems = rows.map((r) => ({
    category: r.category,
    amount: amountOf(r),
  }))
  const costTotal = sumItems(rowsAsItems, categories)
  const net = totalSales - sumItems(rowsAsItems, ALL_CATEGORIES)

  function addRow(category: SettlementCategory) {
    setRows((rs) => [
      ...rs,
      { key: newKey(), category, name: '', amount: '', rate: '', hours: '' },
    ])
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
  }

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  /** 알바 시급·시간을 바꾸면 금액 칸을 자동으로 채운다 (둘 다 입력됐을 때만) */
  function patchAlba(r: Row, patch: Partial<Row>) {
    const next = { ...r, ...patch }
    if (digits(next.rate) > 0 && digits(next.hours) > 0) {
      next.amount = String(Math.round(digits(next.rate) * digits(next.hours)))
    }
    patchRow(r.key, next)
  }

  /** 지난달 그 카테고리 항목 수 */
  const prevCountOf = (category: SettlementCategory) =>
    prevItems.filter((i) => i.category === category).length

  /** 지난달 그 카테고리 내용을 이번 달로 복사 (기존 줄은 덮어쓴다) */
  function copyPrev(category: SettlementCategory) {
    const prev = prevItems.filter((i) => i.category === category)
    if (prev.length === 0) return
    setRows((rs) => [
      ...rs.filter((r) => r.category !== category),
      ...prev.map((i) => ({
        key: newKey(),
        category,
        name: i.name,
        amount: String(i.amount || ''),
        rate: String(i.rate || ''),
        hours: String(i.hours || ''),
      })),
    ])
  }

  /** 지금 화면 상태를 서버에 저장한다 (성공 여부 반환) */
  async function persist(): Promise<boolean> {
    const res = await saveSettlement({
      ym,
      categories,
      items: rows.map((r) => ({
        category: r.category,
        name: r.name,
        amount: amountOf(r),
        rate: digits(r.rate),
        hours: digits(r.hours),
      })),
      ...(showSummary
        ? { totalSales: salesAuto ? autoSales : totalSales, salesAuto }
        : {}),
    })
    return res.ok
  }

  // 항상 최신 persist 를 가리키는 ref — 언마운트 시점에 최신 내용을 저장하려고
  const persistRef = useRef(persist)
  persistRef.current = persist
  // 저장 안 된 변경이 남아 있는지
  const dirtyRef = useRef(false)

  // ── 자동 저장 ──────────────────────────────────────────────
  // 입력이 1초간 멈추면 알아서 저장한다. 저장 버튼이 따로 없다.
  // 첫 렌더(초기 로드·매장 전환 직후)에는 저장하지 않는다.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    dirtyRef.current = true
    setAutoState('saving')
    const t = setTimeout(() => {
      startTransition(async () => {
        const ok = await persist()
        dirtyRef.current = !ok
        setAutoState(ok ? 'saved' : 'error')
      })
    }, 1000)
    return () => clearTimeout(t)
    // rows·매출 입력이 바뀔 때마다 타이머를 재설정(디바운스)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, salesInput, salesAuto])

  // 저장 대기(1초) 중에 매장을 바꾸거나 화면을 떠나면, 마지막 변경을 즉시 저장한다.
  // (Next 화면 전환은 브라우저를 새로 띄우지 않으므로 이 요청은 정상적으로 완료된다)
  useEffect(() => {
    return () => {
      if (dirtyRef.current) persistRef.current()
    }
    // 언마운트 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 인건비처럼 두 섹션이 한 묶음인 경우를 위해 group으로 나눈다
  const groups = useMemo(() => {
    const out: Array<{ title: string | null; defs: typeof sections }> = []
    for (const s of sections) {
      const title = s.group ?? null
      const last = out[out.length - 1]
      if (last && last.title === title && title !== null) last.defs.push(s)
      else out.push({ title, defs: [s] })
    }
    return out
  }, [sections])

  return (
    <>
      {/* ── 총 매출 ────────────────────────────────── */}
      {showSummary && (
        <div className="card">
          <h3 className="card-title">이번달 총 매출</h3>
          <p className="card-sub">
            일마감 합계를 자동으로 가져옵니다. 직접 고치려면 자동 계산을
            끄세요.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
              <input
                type="checkbox"
                checked={salesAuto}
                onChange={(e) => {
                  setSalesAuto(e.target.checked)
                  if (!e.target.checked) setSalesInput(String(totalSales))
                }}
                className="h-4 w-4 accent-brand"
              />
              일마감에서 자동 계산
            </label>

            <input
              value={salesAuto ? num(autoSales) : comma(salesInput)}
              onChange={(e) => setSalesInput(onlyDigits(e.target.value))}
              disabled={salesAuto}
              inputMode="numeric"
              placeholder="원"
              className="fld-input min-w-0 flex-1 text-right font-extrabold tabular-nums sm:max-w-[240px] sm:flex-none sm:w-full
                         disabled:cursor-not-allowed disabled:opacity-70"
            />
            <span className="text-[22px] font-extrabold tabular-nums">
              {won(totalSales)}
            </span>
          </div>
        </div>
      )}

      {/* ── 비용 섹션들 ───────────────────────────── */}
      {groups.map((group) => {
        const groupTotal = sumItems(
          rowsAsItems,
          group.defs.map((d) => d.category)
        )

        return (
          <div
            key={group.title ?? group.defs[0].category}
            className={showSummary || groups.length > 1 ? 'card mt-4' : 'card'}
          >
            <h3 className="card-title">
              {group.title ?? group.defs[0].title}
            </h3>
            <p className="card-sub">
              항목을 원하는 만큼 추가할 수 있습니다.
            </p>

            {group.defs.map((def) => {
              const sectionRows = rows.filter((r) => r.category === def.category)
              const sectionTotal = sumItems(
                sectionRows.map((r) => ({
                  category: r.category,
                  amount: amountOf(r),
                })),
                [def.category]
              )

              return (
                <div key={def.category} className="mb-5 last:mb-0">
                  {group.title && (
                    <div className="mb-2 text-[13px] font-extrabold text-ink-2">
                      {def.title}
                    </div>
                  )}

                  <div className="space-y-2">
                    {sectionRows.map((r) =>
                      def.category === 'labor_part' ? (
                        // 알바: 이름 + 시급 × 시간 = 금액.
                        // 시급·시간을 넣으면 금액이 자동 계산되고, 금액만 직접 입력해도 된다.
                        <div key={r.key} className="flex flex-wrap items-center gap-2">
                          <input
                            value={r.name}
                            onChange={(e) =>
                              patchRow(r.key, { name: e.target.value })
                            }
                            placeholder="알바 이름"
                            className="fld-input min-w-0 flex-1 basis-full sm:basis-0"
                          />
                          <input
                            value={comma(r.rate)}
                            onChange={(e) =>
                              patchAlba(r, { rate: onlyDigits(e.target.value) })
                            }
                            inputMode="numeric"
                            placeholder="시급"
                            className="fld-input w-[80px] shrink-0 text-right tabular-nums sm:w-[104px]"
                          />
                          <span className="shrink-0 text-[13px] text-muted">×</span>
                          <input
                            value={r.hours}
                            onChange={(e) =>
                              patchAlba(r, { hours: e.target.value })
                            }
                            inputMode="decimal"
                            placeholder="시간"
                            className="fld-input w-[64px] shrink-0 text-right tabular-nums sm:w-[80px]"
                          />
                          <span className="shrink-0 text-[13px] text-muted">=</span>
                          <input
                            value={comma(r.amount)}
                            onChange={(e) =>
                              patchRow(r.key, { amount: onlyDigits(e.target.value) })
                            }
                            inputMode="numeric"
                            placeholder="금액"
                            aria-label="알바 금액"
                            className="fld-input w-[100px] shrink-0 text-right font-bold tabular-nums sm:w-[124px]"
                          />
                          <button
                            type="button"
                            onClick={() => removeRow(r.key)}
                            aria-label="삭제"
                            className="grid w-11 shrink-0 place-items-center rounded-[10px]
                                       border border-line text-muted transition
                                       hover:border-bad hover:text-bad"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        // 직원·식자재·마케팅·고정비: 이름 + 금액
                        <div key={r.key} className="flex gap-2">
                          <input
                            value={r.name}
                            onChange={(e) =>
                              patchRow(r.key, { name: e.target.value })
                            }
                            placeholder={def.namePlaceholder}
                            className="fld-input min-w-0 flex-1"
                          />
                          <input
                            value={comma(r.amount)}
                            onChange={(e) =>
                              patchRow(r.key, { amount: onlyDigits(e.target.value) })
                            }
                            inputMode="numeric"
                            placeholder="금액"
                            className="fld-input w-[104px] shrink-0 text-right tabular-nums
                                       sm:w-[140px] shell:w-[170px]"
                          />
                          <button
                            type="button"
                            onClick={() => removeRow(r.key)}
                            aria-label="삭제"
                            className="grid w-11 shrink-0 place-items-center rounded-[10px]
                                       border border-line text-muted transition
                                       hover:border-bad hover:text-bad"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    )}

                    {sectionRows.length === 0 && (
                      <p className="py-3 text-center text-[13px] text-muted">
                        항목이 없습니다.
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addRow(def.category)}
                        className="btn-ghost !px-3 !py-1.5 !text-xs"
                      >
                        + {def.title} 추가
                      </button>
                      {prevCountOf(def.category) > 0 && (
                        <button
                          type="button"
                          onClick={() => copyPrev(def.category)}
                          title="지난달 항목을 이번 달로 불러옵니다 (기존 줄은 덮어씀)"
                          className="btn-ghost !px-3 !py-1.5 !text-xs"
                        >
                          ↩ 지난달 복사 ({prevCountOf(def.category)})
                        </button>
                      )}
                    </div>
                    <span className="text-[13px]">
                      <span className="text-muted">{def.title} 합계 </span>
                      <b className="tabular-nums">{won(sectionTotal)}</b>
                    </span>
                  </div>
                </div>
              )
            })}

            {group.defs.length > 1 && (
              <div className="mt-3 flex justify-between border-t-2 border-line pt-3 text-[14px] font-extrabold">
                <span>{group.title} 총 합산금액</span>
                <span className="tabular-nums">{won(groupTotal)}</span>
              </div>
            )}
          </div>
        )
      })}

      {/* ── 최종 요약 ─────────────────────────────── */}
      {showSummary && (
        <div className="card mt-4">
          <h3 className="card-title">이번달 정산</h3>
          <p className="card-sub">총 매출에서 아래 네 가지를 뺀 금액입니다.</p>

          <table className="tbl">
            <tbody>
              <tr>
                <td className="font-bold">이번달 총 매출</td>
                <td className="tabular-nums font-bold">{won(totalSales)}</td>
              </tr>
              {COST_GROUPS.map((g) => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  <td className="tabular-nums text-bad">
                    {won(-sumItems(rowsAsItems, g.categories))}
                  </td>
                </tr>
              ))}
              <tr className="pl-total">
                <td>총 수익</td>
                <td
                  className={`tabular-nums ${net >= 0 ? 'text-good' : 'text-bad'}`}
                >
                  {won(net)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── 저장 ──────────────────────────────────── */}
      <div className="sticky bottom-4 z-10 mt-4 flex items-center justify-end gap-3">
        {/* 자동 저장 상태 — 저장 버튼을 안 눌러도 입력이 멈추면 저장된다 */}
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
        {!showSummary && (
          <span className="rounded-[10px] bg-surface px-3 py-2 text-[13px] shadow-card">
            <span className="text-muted">인건비 합계 </span>
            <b className="tabular-nums">{won(costTotal)}</b>
          </span>
        )}
      </div>
    </>
  )
}
