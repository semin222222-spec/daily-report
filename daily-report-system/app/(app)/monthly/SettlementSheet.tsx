'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { num, won } from '@/lib/format'
import { COST_GROUPS, SECTIONS, sumItems } from '@/lib/settlement'
import type { SettlementCategory, SettlementItem } from '@/lib/types'
import { saveSettlement } from './actions'

interface Row {
  key: string
  category: SettlementCategory
  name: string
  amount: string // 입력 중에는 문자열로 들고 있어야 지웠다 쓰기가 자연스럽다
}

let rowSeq = 0
const newKey = () => `r${++rowSeq}`

function toRows(items: SettlementItem[]): Row[] {
  return items.map((i) => ({
    key: newKey(),
    category: i.category,
    name: i.name,
    amount: String(i.amount || ''),
  }))
}

const amountOf = (r: Row) => Number(r.amount.replace(/[^\d]/g, '')) || 0

export function SettlementSheet({
  ym,
  items,
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
  categories: SettlementCategory[]
  autoSales: number
  savedSales: number
  savedSalesAuto: boolean
  showSummary: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [rows, setRows] = useState<Row[]>(() => toRows(items))
  const [salesAuto, setSalesAuto] = useState(savedSalesAuto)
  const [salesInput, setSalesInput] = useState(
    String(savedSalesAuto ? autoSales : savedSales || '')
  )
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

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
  const net = totalSales - sumItems(rowsAsItems, [
    'labor_staff',
    'labor_part',
    'food',
    'marketing',
    'fixed',
  ])

  function addRow(category: SettlementCategory) {
    setRows((rs) => [...rs, { key: newKey(), category, name: '', amount: '' }])
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
  }

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function save() {
    startTransition(async () => {
      const res = await saveSettlement({
        ym,
        categories,
        items: rows.map((r) => ({
          category: r.category,
          name: r.name,
          amount: amountOf(r),
        })),
        ...(showSummary
          ? { totalSales: salesAuto ? autoSales : totalSales, salesAuto }
          : {}),
      })
      setFlash({ ok: res.ok, msg: res.message })
      if (res.ok) router.refresh()
    })
  }

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
              value={salesAuto ? num(autoSales) : salesInput}
              onChange={(e) => setSalesInput(e.target.value)}
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
                    {sectionRows.map((r) => (
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
                          value={r.amount}
                          onChange={(e) =>
                            patchRow(r.key, { amount: e.target.value })
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
                    ))}

                    {sectionRows.length === 0 && (
                      <p className="py-3 text-center text-[13px] text-muted">
                        항목이 없습니다.
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => addRow(def.category)}
                      className="btn-ghost !px-3 !py-1.5 !text-xs"
                    >
                      + {def.title} 추가
                    </button>
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
        {flash && (
          <span
            className={`rounded-[10px] bg-surface px-3 py-2 text-[13px] font-semibold shadow-card ${
              flash.ok ? 'text-good' : 'text-bad'
            }`}
            role="status"
          >
            {flash.msg}
          </span>
        )}
        {!showSummary && (
          <span className="rounded-[10px] bg-surface px-3 py-2 text-[13px] shadow-card">
            <span className="text-muted">인건비 합계 </span>
            <b className="tabular-nums">{won(costTotal)}</b>
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn shadow-card"
        >
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </>
  )
}
