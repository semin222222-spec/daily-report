'use client'

import { useEffect, useState } from 'react'
import { won } from '@/lib/format'
import {
  OC_PRIORITIES,
  OC_STATUSES,
  PRIORITY_STYLE,
  STATUS_STYLE,
  type OcItem,
} from '@/lib/owner-center'
import { addItem, deleteItem, setItemStatus, updateItem } from '../actions'

/**
 * 품목 표 + 추가·수정·삭제 + 입고 체크 + 발주 관리 항목.
 * 컬럼이 많아 가로 스크롤된다. 구매상태는 표에서 바로 바꿀 수 있고,
 * 나머지 항목은 [수정]에서 한 번에 편집한다.
 * 입고 체크는 아직 브라우저(localStorage)에 저장한다(품목 id 기준).
 */
export function ItemManager({
  categoryId,
  items,
  isOwner,
}: {
  categoryId: string
  items: OcItem[]
  /** 관리자만 추가·수정·삭제·상태변경을 할 수 있다 */
  isOwner: boolean
}) {
  const storeKey = `oc_check_${categoryId}`
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey)
      if (raw) setChecked(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [storeKey])

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem(storeKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const doneCount = items.filter((i) => checked[i.id]).length
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const estTotal = items.reduce((s, i) => s + (i.est_price || 0), 0)
  const buyTotal = items.reduce((s, i) => s + (i.buy_price || 0), 0)

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="card-title !mb-0">품목 목록</h3>
        <span className="text-[13px] text-muted">
          입고 완료{' '}
          <b className="text-ink">
            {doneCount}/{items.length}
          </b>{' '}
          ({pct}%)
        </span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="tbl min-w-[1100px]">
          <thead>
            <tr>
              <th className="!text-center">입고</th>
              <th>필수</th>
              <th>품목명</th>
              <th>규격/모델</th>
              <th>수량</th>
              <th>예상금액</th>
              <th>실구매금액</th>
              <th>구매상태</th>
              <th>담당</th>
              <th>구매처</th>
              <th>링크</th>
              <th>입고예정일</th>
              <th>설치/보관</th>
              <th>비고</th>
              <th>최종수정</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={16} className="py-6 text-center text-muted">
                  품목이 없습니다. 아래에서 추가하세요.
                </td>
              </tr>
            )}

            {items.map((it) => {
              if (editing === it.id) {
                return (
                  <tr key={it.id}>
                    <td colSpan={16} className="!text-left">
                      <ItemForm
                        action={updateItem}
                        hidden={{ id: it.id }}
                        initial={it}
                        submitLabel="저장"
                        onDone={() => setEditing(null)}
                      />
                    </td>
                  </tr>
                )
              }

              const on = loaded && checked[it.id]
              return (
                <tr key={it.id} className={on ? 'opacity-55' : ''}>
                  <td className="!text-center">
                    <button
                      type="button"
                      onClick={() => toggle(it.id)}
                      aria-label={on ? '입고 취소' : '입고 완료'}
                      className="-m-2 grid h-10 w-10 place-items-center p-2"
                    >
                      <span
                        className={`grid h-[22px] w-[22px] place-items-center rounded border-2 text-[12px] font-bold transition ${
                          on ? 'border-brand bg-brand text-white' : 'border-line'
                        }`}
                      >
                        {on ? '✓' : ''}
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className={`pill ${PRIORITY_STYLE[it.priority]}`}>
                      {it.priority}
                    </span>
                  </td>
                  <td className="!text-left">
                    <span className={`font-semibold ${on ? 'line-through' : ''}`}>
                      {it.name}
                    </span>
                  </td>
                  <td className="!text-left text-ink-2">{it.spec || '—'}</td>
                  <td className="tabular-nums">
                    {it.qty || '—'} <span className="text-muted">{it.unit}</span>
                  </td>
                  <td className="tabular-nums">{won(it.est_price)}</td>
                  <td className="tabular-nums">{won(it.buy_price)}</td>
                  <td>
                    {isOwner ? (
                      // 관리자는 표에서 구매상태를 바로 변경
                      <form action={setItemStatus} className="inline">
                        <input type="hidden" name="id" value={it.id} />
                        <select
                          name="status"
                          defaultValue={it.status}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className={`rounded-md border-0 px-2 py-1 text-[12px] font-bold outline-none ${STATUS_STYLE[it.status]}`}
                        >
                          {OC_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </form>
                    ) : (
                      <span className={`pill ${STATUS_STYLE[it.status]}`}>
                        {it.status}
                      </span>
                    )}
                  </td>
                  <td className="!text-left">{it.manager || '—'}</td>
                  <td className="!text-left">{it.vendor || '—'}</td>
                  <td className="!text-center">
                    {it.link ? (
                      <a
                        href={it.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-deep hover:underline"
                      >
                        🔗 링크
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="!text-left tabular-nums">{it.due_date || '—'}</td>
                  <td className="!text-left">{it.location || '—'}</td>
                  <td className="!text-left">{it.note || '—'}</td>
                  <td className="tabular-nums text-[11.5px] text-muted">
                    {it.updated_at?.slice(0, 10) ?? '—'}
                  </td>
                  <td className="text-right">
                    {isOwner && (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(it.id)}
                          className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink"
                        >
                          수정
                        </button>
                        <form action={deleteItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
                          >
                            삭제
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}

            {items.length > 0 && (
              <tr className="pl-total">
                <td colSpan={5} className="!text-left">
                  합계
                </td>
                <td className="tabular-nums">{won(estTotal)}</td>
                <td className="tabular-nums">{won(buyTotal)}</td>
                <td colSpan={9} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 품목 추가 — 관리자만 */}
      {isOwner && (
        <div className="mt-4 border-t border-line-soft pt-4">
          {adding ? (
            <ItemForm
              action={addItem}
              hidden={{ category_id: categoryId }}
              submitLabel="품목 추가"
              onDone={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="btn-ghost w-full"
            >
              + 품목 추가
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        {isOwner ? (
          <>
            추가·수정·삭제와 금액·상태 변경은 모든 점주에게 공유됩니다. 수정하면
            최종수정일이 자동으로 갱신됩니다.{' '}
          </>
        ) : (
          <>
            품목 추가·수정·삭제는 관리자(본사)만 할 수 있습니다.{' '}
          </>
        )}
        입고 체크는 아직 이 브라우저에만 저장됩니다.
      </p>
    </div>
  )
}

/** 품목 추가·수정 공통 폼 (전체 항목) */
function ItemForm({
  action,
  hidden,
  initial,
  submitLabel,
  onDone,
}: {
  action: (formData: FormData) => void | Promise<void>
  hidden: Record<string, string>
  initial?: OcItem
  submitLabel: string
  onDone: () => void
}) {
  const F = ({
    name,
    label,
    value,
    placeholder,
    right,
  }: {
    name: string
    label: string
    value?: string | number
    placeholder?: string
    right?: boolean
  }) => (
    <div>
      <label className="fld-label">{label}</label>
      <input
        name={name}
        defaultValue={value || ''}
        placeholder={placeholder}
        className={`fld-input ${right ? 'text-right tabular-nums' : ''}`}
      />
    </div>
  )

  return (
    <form
      action={action}
      onSubmit={() => onDone()}
      className="rounded-[10px] border border-line bg-line-soft/40 p-3.5"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="fld-label">품목명</label>
          <input
            name="name"
            required
            autoFocus
            defaultValue={initial?.name ?? ''}
            placeholder="품목명"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label">필수여부</label>
          <select
            name="priority"
            defaultValue={initial?.priority ?? '필수'}
            className="fld-input"
          >
            {OC_PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        <F name="spec" label="규격/모델" value={initial?.spec} placeholder="예: 1500 테이블형" />
        <F name="qty" label="기준수량" value={initial?.qty} placeholder="예: 2" right />
        <F name="unit" label="단위" value={initial?.unit ?? 'EA'} placeholder="EA" />

        <F name="est_price" label="예상금액" value={initial?.est_price} placeholder="원" right />
        <F name="buy_price" label="실구매금액" value={initial?.buy_price} placeholder="원" right />
        <div>
          <label className="fld-label">구매상태</label>
          <select
            name="status"
            defaultValue={initial?.status ?? '미구매'}
            className="fld-input"
          >
            {OC_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <F name="manager" label="담당" value={initial?.manager} placeholder="예: 홀 / 김점장" />
        <F name="vendor" label="구매처" value={initial?.vendor} placeholder="예: 쿠팡" />
        <F name="due_date" label="입고예정일" value={initial?.due_date} placeholder="예: 2026-08-01" />

        <div className="sm:col-span-3">
          <label className="fld-label">구매링크</label>
          <input
            name="link"
            defaultValue={initial?.link ?? ''}
            placeholder="https://..."
            className="fld-input"
          />
        </div>

        <F name="location" label="설치/보관 위치" value={initial?.location} placeholder="예: 주방 선반" />
        <div className="sm:col-span-2">
          <label className="fld-label">비고</label>
          <input
            name="note"
            defaultValue={initial?.note ?? ''}
            placeholder="메모"
            className="fld-input"
          />
        </div>
      </div>

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onDone}>
          취소
        </button>
        <button type="submit" className="btn">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
