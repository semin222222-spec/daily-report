'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { ClosingIssue, ClosingLog, ClosingMenuSale } from '@/lib/types'
import { saveClosingLog, type ActionResult, type ClosingLogInput } from './actions'
import { ClosingLogSummary } from './ClosingLogSummary'
import { ISSUE_TYPES } from './constants'

function Stepper({
  value,
  onChange,
  label,
  unit,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  label: string
  unit?: string
  disabled?: boolean
}) {
  const btn =
    'h-9 w-9 flex-none rounded-[10px] border border-line bg-surface text-lg leading-none text-ink transition hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink'
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={btn}
        aria-label={`${label} 빼기`}
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <output className="min-w-[2.2em] text-center text-[20px] font-bold tabular-nums">
        {value}
      </output>
      {unit && <span className="text-[13px] text-muted">{unit}</span>}
      <button
        type="button"
        className={btn}
        aria-label={`${label} 더하기`}
        disabled={disabled}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

type CheckKey = 'late' | 'complaint' | 'stock_issue'
const CHECKS: { key: CheckKey; note: `${CheckKey}_note`; name: string }[] = [
  { key: 'late', note: 'late_note', name: '지각' },
  { key: 'complaint', note: 'complaint_note', name: '컴플레인' },
  { key: 'stock_issue', note: 'stock_issue_note', name: '재고 이슈' },
]

export function ClosingLogForm({
  storeId,
  storeName,
  date,
  dateLabel,
  existing,
  menuNames,
  readOnly,
}: {
  storeId: string
  storeName: string
  date: string
  dateLabel: string
  existing: ClosingLog | null
  /** 새 일지일 때 깔아둘 메뉴 이름 (직전 일지 또는 기본 목록) */
  menuNames: string[]
  readOnly: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  const [f, setF] = useState<ClosingLogInput>(() => ({
    store_id: storeId,
    date,
    writer: existing?.writer ?? '',
    open_run: existing?.open_run ?? 0,
    naver_bookings: existing?.naver_bookings ?? 0,
    full_at: existing?.full_at ?? '',
    condition: existing?.condition ?? 7,
    late: existing?.late ?? false,
    late_note: existing?.late_note ?? '',
    complaint: existing?.complaint ?? false,
    complaint_note: existing?.complaint_note ?? '',
    stock_issue: existing?.stock_issue ?? false,
    stock_issue_note: existing?.stock_issue_note ?? '',
    menu_sales: existing?.menu_sales?.length
      ? existing.menu_sales
      : menuNames.map((name) => ({ name, qty: 0 })),
    issues: existing?.issues ?? [],
    note: existing?.note ?? '',
  }))
  const [newMenu, setNewMenu] = useState('')

  function set<K extends keyof ClosingLogInput>(k: K, v: ClosingLogInput[K]) {
    setF((s) => ({ ...s, [k]: v }))
    setResult(null)
  }
  function setMenu(i: number, patch: Partial<ClosingMenuSale>) {
    set('menu_sales', f.menu_sales.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  }
  function setIssue(i: number, patch: Partial<ClosingIssue>) {
    set('issues', f.issues.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  }
  function addMenu() {
    const name = newMenu.trim()
    if (!name) return
    set('menu_sales', [...f.menu_sales, { name, qty: 0 }])
    setNewMenu('')
  }

  function onDateChange(next: string) {
    if (next) router.push(`/closing-log?date=${next}`)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return
    startTransition(async () => {
      const r = await saveClosingLog(f)
      setResult(r)
      if (r.ok) router.refresh()
    })
  }

  const savedAt = existing
    ? new Date(existing.updated_at).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const sec = 'rounded-card border border-line bg-surface p-4 shadow-card shell:p-5'
  const secHead = 'mb-3 flex items-baseline justify-between gap-2'
  const secTitle = 'm-0 text-[15.5px] font-bold'
  const secHint = 'text-[12.5px] text-muted'

  return (
    <div className="grid items-start gap-5 shell:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <form onSubmit={submit} className="grid min-w-0 gap-3.5" autoComplete="off">
        <fieldset disabled={readOnly || pending} className="contents">
          {/* 기본 정보 */}
          <section className={sec}>
            <div className={secHead}>
              <h3 className={secTitle}>
                마감일지{' '}
                {existing ? (
                  <span className="pill pill-g ml-1">작성됨 · 수정 가능</span>
                ) : (
                  <span className="pill pill-w ml-1">새로 작성</span>
                )}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1fr]">
              <div>
                <label className="fld-label" htmlFor="cl-date">
                  마감 날짜
                </label>
                <input
                  id="cl-date"
                  type="date"
                  defaultValue={date}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="fld-input"
                />
              </div>
              <div>
                <label className="fld-label" htmlFor="cl-writer">
                  작성자
                </label>
                <input
                  id="cl-writer"
                  type="text"
                  value={f.writer}
                  onChange={(e) => set('writer', e.target.value)}
                  placeholder="예: 김민수"
                  className="fld-input"
                />
              </div>
            </div>
          </section>

          {/* 영업 현황 */}
          <section className={sec}>
            <div className={secHead}>
              <h3 className={secTitle}>영업 현황</h3>
              <span className={secHint}>버튼으로 숫자만 올리면 됩니다</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="grid gap-1.5 rounded-xl border border-line-soft bg-page px-3 py-2.5">
                <span className="text-[12.5px] font-semibold text-ink-2">오픈런</span>
                <Stepper
                  label="오픈런"
                  unit="팀"
                  value={f.open_run}
                  onChange={(n) => set('open_run', n)}
                  disabled={readOnly}
                />
              </div>
              <div className="grid gap-1.5 rounded-xl border border-line-soft bg-page px-3 py-2.5">
                <span className="text-[12.5px] font-semibold text-ink-2">네이버 예약</span>
                <Stepper
                  label="네이버 예약"
                  unit="팀"
                  value={f.naver_bookings}
                  onChange={(n) => set('naver_bookings', n)}
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-2 grid gap-1.5 rounded-xl border border-line-soft bg-page px-3 py-2.5 sm:col-span-1">
                <label htmlFor="cl-full" className="text-[12.5px] font-semibold text-ink-2">
                  만석 시각 <span className="font-normal text-muted">(없으면 비움)</span>
                </label>
                <input
                  id="cl-full"
                  type="time"
                  value={f.full_at}
                  onChange={(e) => set('full_at', e.target.value)}
                  className="fld-input !py-2"
                />
              </div>
            </div>
          </section>

          {/* 매장 컨디션 */}
          <section className={sec}>
            <div className={secHead}>
              <h3 className={secTitle}>매장 컨디션</h3>
              <span className={secHint}>오늘 하루 점수</span>
            </div>
            <div className="grid grid-cols-10 gap-1" role="group" aria-label="매장 컨디션 점수">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={f.condition === n}
                  aria-label={`${n}점`}
                  onClick={() => set('condition', n)}
                  className={`h-10 rounded-[9px] border text-[15px] font-bold tabular-nums transition ${
                    f.condition === n
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-page text-ink-2 hover:border-brand'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted">
              <span>1 · 매우 나쁨</span>
              <span>10 · 매우 좋음</span>
            </div>

            <div className="mt-3">
              {CHECKS.map((c) => (
                <div
                  key={c.key}
                  className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-line-soft py-2.5"
                >
                  <span className="font-semibold">{c.name}</span>
                  <span
                    className="inline-flex overflow-hidden rounded-[10px] border border-line"
                    role="group"
                    aria-label={c.name}
                  >
                    <button
                      type="button"
                      aria-pressed={!f[c.key]}
                      onClick={() => set(c.key, false)}
                      className={`px-4 py-1.5 text-[13.5px] ${
                        !f[c.key] ? 'bg-good/10 font-bold text-[#0a7d0a]' : 'bg-surface text-ink-2'
                      }`}
                    >
                      없음
                    </button>
                    <button
                      type="button"
                      aria-pressed={f[c.key]}
                      onClick={() => set(c.key, true)}
                      className={`border-l border-line px-4 py-1.5 text-[13.5px] ${
                        f[c.key] ? 'bg-bad/10 font-bold text-bad' : 'bg-surface text-ink-2'
                      }`}
                    >
                      있음
                    </button>
                  </span>
                  {f[c.key] && (
                    <textarea
                      aria-label={`${c.name} 내용`}
                      rows={2}
                      value={f[c.note]}
                      onChange={(e) => set(c.note, e.target.value)}
                      placeholder={`${c.name} 내용을 적어주세요`}
                      className="fld-input col-span-2"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 메뉴 판매량 */}
          <section className={sec}>
            <div className={secHead}>
              <h3 className={secTitle}>주요 메뉴 판매량</h3>
              <span className={secHint}>메뉴 목록은 다음 날에도 이어집니다</span>
            </div>
            <div className="grid">
              {f.menu_sales.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-line-soft py-1.5"
                >
                  <span className="break-words font-semibold">{m.name}</span>
                  <Stepper
                    label={m.name}
                    value={m.qty}
                    onChange={(n) => setMenu(i, { qty: n })}
                    disabled={readOnly}
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`${m.name} 메뉴 빼기`}
                      onClick={() => set('menu_sales', f.menu_sales.filter((_, j) => j !== i))}
                      className="px-1 text-xl leading-none text-muted hover:text-bad"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!readOnly && (
              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={newMenu}
                  onChange={(e) => setNewMenu(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addMenu()
                    }
                  }}
                  placeholder="메뉴 추가 (예: 김치찜세트)"
                  aria-label="추가할 메뉴 이름"
                  className="fld-input"
                />
                <button type="button" className="btn-ghost" onClick={addMenu}>
                  추가
                </button>
              </div>
            )}
          </section>

          {/* 특이사항 */}
          <section className={sec}>
            <div className={secHead}>
              <h3 className={secTitle}>특이사항</h3>
              <span className={secHint}>사고 · 클레임 · 추가결제 등</span>
            </div>
            <div className="grid gap-2.5">
              {f.issues.length === 0 && (
                <p className="m-0 text-[13px] text-muted">특이사항이 없으면 비워두세요.</p>
              )}
              {f.issues.map((it, i) => (
                <div key={i} className="grid gap-2 rounded-xl border border-line bg-page p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      aria-label="특이사항 유형"
                      value={it.type}
                      onChange={(e) => setIssue(i, { type: e.target.value })}
                      className="fld-input !w-auto !py-2"
                    >
                      {ISSUE_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    {!readOnly && (
                      <button
                        type="button"
                        aria-label="특이사항 삭제"
                        onClick={() => set('issues', f.issues.filter((_, j) => j !== i))}
                        className="px-1 text-xl leading-none text-muted hover:text-bad"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <textarea
                    aria-label="특이사항 내용"
                    rows={2}
                    value={it.text}
                    onChange={(e) => setIssue(i, { text: e.target.value })}
                    placeholder="무슨 일이 있었는지 적어주세요"
                    className="fld-input"
                  />
                  <label className="flex items-center gap-2 text-[13px] text-ink-2">
                    금액(선택)
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={it.amount || ''}
                      onChange={(e) => setIssue(i, { amount: Number(e.target.value) || 0 })}
                      placeholder="원"
                      className="fld-input !w-40 !py-2"
                    />
                  </label>
                </div>
              ))}
            </div>
            {!readOnly && (
              <button
                type="button"
                className="btn-ghost mt-2.5"
                onClick={() => set('issues', [...f.issues, { type: '기타', text: '', amount: 0 }])}
              >
                + 특이사항 추가
              </button>
            )}
          </section>

          {/* 발주 · 전달사항 */}
          <section className={sec}>
            <div className={secHead}>
              <h3 className={secTitle}>발주 · 전달사항</h3>
              <span className={secHint}>다음 근무자나 점주에게</span>
            </div>
            <textarea
              aria-label="발주 및 전달사항"
              rows={3}
              value={f.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="예: 찰랑 판매량이 준수하여 추가발주"
              className="fld-input"
            />
          </section>

          {!readOnly && (
            <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
              <span
                role="status"
                className={`text-[13px] font-semibold ${
                  result ? (result.ok ? 'text-good' : 'text-bad') : 'text-ink-2'
                }`}
              >
                {result?.message ?? '저장하면 점주가 바로 볼 수 있고 기록으로 남습니다'}
              </span>
              <button type="submit" className="btn" disabled={pending}>
                {pending ? '저장 중…' : existing ? '마감일지 수정' : '마감일지 저장'}
              </button>
            </div>
          )}
        </fieldset>
      </form>

      <aside className="grid min-w-0 gap-2 shell:sticky shell:top-4">
        <div className="text-xs font-bold tracking-wide text-muted">
          점주가 보는 화면 {existing ? '' : '(미리보기)'}
        </div>
        <ClosingLogSummary
          v={{
            ...f,
            storeName,
            dateLabel,
            savedAt,
          }}
        />
      </aside>
    </div>
  )
}
