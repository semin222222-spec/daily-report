'use client'

import { useMemo, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { num, won } from '@/lib/format'
import {
  OPEN_SECTIONS,
  OPEN_STATUSES,
  dday,
  groupBySection,
  openStatusMeta,
  sectionMeta,
} from '@/lib/open-checklist'
import type { OpenChecklist as OpenList, OpenTask } from '@/lib/types'
import {
  addOpenTask,
  createOpenChecklist,
  deleteOpenChecklist,
  deleteOpenTask,
  saveOpenChecklist,
  saveOpenTask,
  toggleOpenTask,
  type OpenResult,
} from './actions'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? '저장 중…' : label}
    </button>
  )
}

/** 오픈 건 만들기 / 수정 폼 */
function ListForm({
  editing,
  others,
  onDone,
  onCreated,
}: {
  editing: OpenList | null
  /** 복사해올 수 있는 지난 오픈 건들 */
  others: OpenList[]
  onDone: () => void
  onCreated: (id: string) => void
}) {
  const [state, formAction] = useFormState<OpenResult | null, FormData>(
    async (prev, fd) => {
      const res = editing
        ? await saveOpenChecklist(prev, fd)
        : await createOpenChecklist(prev, fd)
      if (res.ok) {
        if (res.id) onCreated(res.id)
        onDone()
      }
      return res
    },
    null
  )

  return (
    <form action={formAction} className="card">
      <h3 className="card-title">{editing ? '오픈 건 수정' : '새 매장 오픈'}</h3>
      <p className="card-sub">
        매장 한 곳의 오픈 과정을 통째로 관리합니다. 표준 절차로 시작하면 계약부터
        그랜드 오픈까지 할 일이 자동으로 깔립니다.
      </p>
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="form-grid">
        <div>
          <label className="fld-label" htmlFor="oc-title">
            오픈 매장명
          </label>
          <input
            id="oc-title"
            name="title"
            required
            defaultValue={editing?.title ?? ''}
            placeholder="예: 삐딱 홍대점"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="oc-date">
            오픈 예정일
          </label>
          <input
            id="oc-date"
            name="open_date"
            type="date"
            defaultValue={editing?.open_date ?? ''}
            className="fld-input"
          />
        </div>

        {editing ? (
          <div>
            <label className="fld-label" htmlFor="oc-status">
              진행 상태
            </label>
            <select
              id="oc-status"
              name="status"
              defaultValue={editing.status}
              className="fld-input"
            >
              {OPEN_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="fld-label" htmlFor="oc-seed">
              시작 방식
            </label>
            <select id="oc-seed" name="seed" className="fld-input">
              <option value="template">표준 오픈 절차로 시작 (권장)</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} 복사해서 시작
                </option>
              ))}
              <option value="blank">빈 목록으로 시작</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <label className="fld-label" htmlFor="oc-memo">
          메모
        </label>
        <textarea
          id="oc-memo"
          name="memo"
          rows={2}
          defaultValue={editing?.memo ?? ''}
          placeholder="입지·평수·투자 규모 등"
          className="fld-input leading-relaxed"
        />
      </div>

      {state && !state.ok && (
        <div className="mt-3 text-[13px] font-semibold text-bad" role="status">
          {state.message}
        </div>
      )}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onDone}>
          취소
        </button>
        <SubmitButton label={editing ? '수정 저장' : '오픈 건 만들기'} />
      </div>
    </form>
  )
}

/** 항목 수정 폼 (한 줄을 펼친 상태) */
function TaskForm({
  task,
  onDone,
}: {
  task: OpenTask
  onDone: () => void
}) {
  const [, startTransition] = useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onDone()
    startTransition(async () => {
      await saveOpenTask(fd)
    })
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[12px] border border-brand/40 bg-brand/[.03] p-3"
    >
      <input type="hidden" name="id" value={task.id} />

      <div className="mb-2.5">
        <label className="fld-label">할 일</label>
        <input
          name="title"
          required
          defaultValue={task.title}
          className="fld-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5 shell:grid-cols-4">
        <div>
          <label className="fld-label">단계</label>
          <select name="section" defaultValue={task.section} className="fld-input">
            {OPEN_SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.key}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="fld-label">담당</label>
          <input
            name="owner"
            defaultValue={task.owner}
            placeholder="이름"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label">마감일</label>
          <input
            name="due_date"
            type="date"
            defaultValue={task.due_date}
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label">예상 비용</label>
          <input
            name="cost"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={task.cost || ''}
            placeholder="0"
            className="fld-input"
          />
        </div>
        <div className="col-span-2">
          <label className="fld-label">업체 · 구매처</label>
          <input
            name="vendor"
            defaultValue={task.vendor}
            placeholder="업체명 · 연락처"
            className="fld-input"
          />
        </div>
        <div className="col-span-2">
          <label className="fld-label">비고</label>
          <input
            name="memo"
            defaultValue={task.memo}
            placeholder="특이사항"
            className="fld-input"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
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

/**
 * 매장 오픈 체크리스트.
 * 오픈 건을 골라 단계별 할 일을 체크한다. 체크는 화면을 먼저 바꾸고
 * 저장이 뒤따른다(오늘 할일과 같은 방식).
 */
export function OpenChecklist({
  lists,
  tasks,
  isOwner,
  today,
}: {
  lists: OpenList[]
  /** 모든 오픈 건의 항목. 화면에서 선택된 건으로 걸러 쓴다 */
  tasks: OpenTask[]
  isOwner: boolean
  today: string
}) {
  const [selected, setSelected] = useState<string | null>(lists[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
  const [editingList, setEditingList] = useState(false)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const current = lists.find((l) => l.id === selected) ?? lists[0] ?? null

  const rows = useMemo(
    () =>
      tasks.filter((t) => t.checklist_id === current?.id && !removed.has(t.id)),
    [tasks, current?.id, removed]
  )

  const isDone = (t: OpenTask) => doneMap[t.id] ?? t.done
  const doneCount = rows.filter(isDone).length
  const progress = rows.length > 0 ? (doneCount / rows.length) * 100 : 0
  const totalCost = rows.reduce((s, t) => s + Number(t.cost || 0), 0)
  const doneCost = rows
    .filter(isDone)
    .reduce((s, t) => s + Number(t.cost || 0), 0)

  function toggle(t: OpenTask) {
    if (!isOwner) return
    const next = !isDone(t)
    setDoneMap((m) => ({ ...m, [t.id]: next }))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', t.id)
      fd.set('done', String(next))
      await toggleOpenTask(fd)
    })
  }

  function removeTask(id: string) {
    if (!isOwner) return
    setRemoved((s) => new Set(s).add(id))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteOpenTask(fd)
    })
  }

  // ── 폼이 열려 있으면 폼만 ───────────────────────
  if (creating || (editingList && current)) {
    return (
      <ListForm
        editing={editingList ? current : null}
        others={lists}
        onDone={() => {
          setCreating(false)
          setEditingList(false)
        }}
        onCreated={(id) => setSelected(id)}
      />
    )
  }

  // ── 아직 오픈 건이 없을 때 ──────────────────────
  if (!current) {
    return (
      <div className="card text-center">
        <p className="py-6 text-[13.5px] text-muted">
          아직 등록된 오픈 건이 없습니다.
          <br />
          매장을 하나 열 때마다 오픈 건을 만들어 두면, 다음 오픈 때 그대로
          복사해서 쓸 수 있습니다.
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn"
          >
            + 첫 오픈 체크리스트 만들기
          </button>
        )}
      </div>
    )
  }

  const d = dday(current.open_date, today)
  const statusPill = openStatusMeta(current.status)

  return (
    <>
      {/* ── 오픈 건 선택 ───────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {lists.map((l) => {
          const active = l.id === current.id
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setSelected(l.id)
                setEditingTask(null)
              }}
              className={`rounded-[10px] border px-3 py-1.5 text-[13px] font-bold transition ${
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-white text-ink-2 hover:border-brand/50 hover:text-ink'
              }`}
            >
              {l.title}
            </button>
          )
        })}
        {isOwner && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn-ghost !px-3 !py-1.5 !text-[13px]"
          >
            + 새 오픈
          </button>
        )}
      </div>

      {/* ── 요약 ───────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-extrabold">{current.title}</h3>
              <span className={`pill ${statusPill.pill}`}>{statusPill.label}</span>
              {d && current.status === 'preparing' && (
                <span className="pill pill-w">{d}</span>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              오픈 예정일 {current.open_date ?? '미정'}
              {current.memo && ` · ${current.memo}`}
            </p>
          </div>

          {isOwner && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setEditingList(true)}
                className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink"
              >
                수정
              </button>
              <form action={deleteOpenChecklist}>
                <input type="hidden" name="id" value={current.id} />
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
                >
                  삭제
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="mt-3.5 flex items-center gap-2.5">
          <div className="bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="shrink-0 text-[13px] font-extrabold tabular-nums">
            {doneCount}/{rows.length}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
          <div>
            <div className="text-[11.5px] text-muted">진행률</div>
            <div className="text-[15px] font-extrabold tabular-nums">
              {progress.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-[11.5px] text-muted">남은 항목</div>
            <div className="text-[15px] font-extrabold tabular-nums">
              {num(rows.length - doneCount)}건
            </div>
          </div>
          <div>
            <div className="text-[11.5px] text-muted">예상 비용</div>
            <div className="text-[15px] font-extrabold tabular-nums">
              {won(totalCost)}
            </div>
          </div>
        </div>
        {totalCost > 0 && (
          <p className="mt-2 text-right text-[11.5px] text-muted">
            완료된 항목 비용 {won(doneCost)}
          </p>
        )}
      </div>

      {/* ── 단계별 체크리스트 ──────────────────────── */}
      {groupBySection(rows).map(([section, list]) => {
        const meta = sectionMeta(section)
        const secDone = list.filter(isDone).length
        return (
          <div key={section} className="card mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[17px]">{meta.icon}</span>
              <h3 className="text-[15.5px] font-bold">{section}</h3>
              <span className="text-[12px] text-muted">{meta.desc}</span>
              <span
                className={`ml-auto pill ${
                  secDone === list.length ? 'pill-g' : 'bg-line-soft text-muted'
                }`}
              >
                {secDone}/{list.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {list.map((t) => {
                if (editingTask === t.id) {
                  return (
                    <TaskForm
                      key={t.id}
                      task={t}
                      onDone={() => setEditingTask(null)}
                    />
                  )
                }

                const done = isDone(t)
                const late =
                  !done && t.due_date !== '' && t.due_date < today

                return (
                  <div
                    key={t.id}
                    className="flex items-start gap-2.5 rounded-[10px] px-1 py-2 transition hover:bg-line-soft/40"
                  >
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => toggle(t)}
                      aria-label={done ? '완료 취소' : '완료 처리'}
                      className="-m-1 grid h-8 w-8 shrink-0 place-items-center p-1 disabled:opacity-50"
                    >
                      <span
                        className={`grid h-[20px] w-[20px] place-items-center rounded border-2 text-[11px] font-bold transition ${
                          done ? 'border-brand bg-brand text-white' : 'border-line'
                        }`}
                      >
                        {done ? '✓' : ''}
                      </span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[13.5px] font-semibold ${
                          done ? 'text-muted line-through' : ''
                        }`}
                      >
                        {t.title}
                      </div>
                      {(t.owner || t.due_date || t.cost > 0 || t.vendor || t.memo) && (
                        <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11.5px] text-muted">
                          {t.owner && <span>👤 {t.owner}</span>}
                          {t.due_date && (
                            <span className={late ? 'font-bold text-bad' : ''}>
                              📅 {t.due_date}
                              {late && ' 지연'}
                            </span>
                          )}
                          {t.cost > 0 && <span>💰 {won(t.cost)}</span>}
                          {t.vendor && <span>🏢 {t.vendor}</span>}
                          {t.memo && <span>📝 {t.memo}</span>}
                        </div>
                      )}
                    </div>

                    {isOwner && (
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingTask(t.id)}
                          className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTask(t.id)}
                          className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {isOwner && (
              <form action={addOpenTask} className="mt-2.5 flex gap-2">
                <input type="hidden" name="checklist_id" value={current.id} />
                <input type="hidden" name="section" value={section} />
                <input
                  name="title"
                  required
                  placeholder={`${section} 항목 추가`}
                  className="fld-input min-w-0 flex-1 !py-2 !text-[13px]"
                />
                <button type="submit" className="btn-ghost !px-3 !py-2 !text-[13px]">
                  추가
                </button>
              </form>
            )}
          </div>
        )
      })}

      {/* ── 새 단계에 항목 추가 ────────────────────── */}
      {isOwner && (
        <div className="card mt-4">
          <h3 className="card-title">항목 직접 추가</h3>
          <p className="card-sub">
            표준 절차에 없던 일이 생기면 여기에 추가하세요. 다음 오픈 때 이 목록을
            복사하면 그대로 따라갑니다.
          </p>
          <form action={addOpenTask} className="flex flex-wrap gap-2">
            <input type="hidden" name="checklist_id" value={current.id} />
            <select
              name="section"
              aria-label="단계"
              className="fld-input w-full shell:w-[160px]"
            >
              {OPEN_SECTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key}
                </option>
              ))}
            </select>
            <input
              name="title"
              required
              placeholder="할 일"
              className="fld-input min-w-0 flex-1"
            />
            <input
              name="owner"
              placeholder="담당"
              className="fld-input w-full shell:w-[110px]"
            />
            <input
              name="due_date"
              type="date"
              aria-label="마감일"
              className="fld-input w-full shell:w-[150px]"
            />
            <button type="submit" className="btn">
              추가
            </button>
          </form>
        </div>
      )}
    </>
  )
}
