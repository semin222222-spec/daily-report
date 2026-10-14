'use client'

import { useMemo, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  SETUP_SECTIONS,
  groupSetup,
  sectionNo,
  type SetupChecklist as Checklist,
  type SetupItem,
} from '@/lib/setup-checklist'
import {
  addSetupItem,
  createSetupChecklist,
  deleteSetupChecklist,
  deleteSetupItem,
  saveSetupChecklist,
  saveSetupItem,
  toggleSetupItem,
  type SetupResult,
} from './actions'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? '저장 중…' : label}
    </button>
  )
}

/** 새 가맹점 / 매장 정보 수정 */
function ListForm({
  editing,
  others,
  onDone,
  onCreated,
}: {
  editing: Checklist | null
  others: Checklist[]
  onDone: () => void
  onCreated: (id: string) => void
}) {
  const [state, formAction] = useFormState<SetupResult | null, FormData>(
    async (prev, fd) => {
      const res = editing ? await saveSetupChecklist(prev, fd) : await createSetupChecklist(prev, fd)
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
      <h3 className="card-title">{editing ? '매장 정보 수정' : '새 가맹점 체크리스트'}</h3>
      <p className="card-sub">
        가맹점마다 한 장씩 만듭니다. 표준 항목으로 시작한 뒤 이 매장에 맞게 항목을 더하거나 지우세요.
      </p>
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="form-grid">
        <div>
          <label className="fld-label" htmlFor="sc-name">매장명</label>
          <input
            id="sc-name"
            name="store_name"
            required
            defaultValue={editing?.store_name ?? ''}
            placeholder="예: 삐딱 홍대점"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="sc-date">오픈 예정일</label>
          <input
            id="sc-date"
            name="open_date"
            type="date"
            defaultValue={editing?.open_date ?? ''}
            className="fld-input"
          />
        </div>
        {!editing && (
          <div>
            <label className="fld-label" htmlFor="sc-seed">시작 방식</label>
            <select id="sc-seed" name="seed" className="fld-input" defaultValue="template">
              <option value="template">표준 체크리스트로 시작 (권장)</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.store_name} 복사해서 시작
                </option>
              ))}
              <option value="blank">빈 체크리스트로 시작</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <label className="fld-label" htmlFor="sc-memo">메모</label>
        <input
          id="sc-memo"
          name="memo"
          defaultValue={editing?.memo ?? ''}
          placeholder="점주 연락처 · 평수 · 특이사항"
          className="fld-input"
        />
      </div>

      {state && !state.ok && (
        <div className="mt-3 text-[13px] font-semibold text-bad" role="status">{state.message}</div>
      )}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onDone}>취소</button>
        <SubmitButton label={editing ? '수정 저장' : '체크리스트 만들기'} />
      </div>
    </form>
  )
}

/**
 * 가맹점 셋팅 체크리스트 — 종이 양식과 같은 모양.
 * 01 인테리어&설비(왼쪽) · 02 발주 품목 / 03 발주 업체 / 04 추가 체크사항(오른쪽) · 05 최종 점검(아래).
 * 체크·추가·삭제는 화면을 먼저 바꾸고 저장이 뒤따른다.
 */
export function SetupChecklist({
  lists,
  items,
  isOwner,
}: {
  lists: Checklist[]
  items: SetupItem[]
  isOwner: boolean
}) {
  const [selected, setSelected] = useState<string | null>(lists[0]?.id ?? null)
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const current = lists.find((l) => l.id === selected) ?? lists[0] ?? null
  const rows = useMemo(
    () => items.filter((it) => it.checklist_id === current?.id && !removed.has(it.id)),
    [items, current?.id, removed]
  )
  const isDone = (it: SetupItem) => doneMap[it.id] ?? it.done
  const doneCount = rows.filter(isDone).length
  const groups = groupSetup(rows)

  function toggle(it: SetupItem) {
    const next = !isDone(it)
    setDoneMap((m) => ({ ...m, [it.id]: next }))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', it.id)
      fd.set('done', String(next))
      await toggleSetupItem(fd)
    })
  }

  function remove(it: SetupItem) {
    if (!confirm(`"${it.title}" 항목을 지울까요?`)) return
    setRemoved((s) => new Set(s).add(it.id))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', it.id)
      await deleteSetupItem(fd)
    })
  }

  function submit(e: React.FormEvent<HTMLFormElement>, action: (fd: FormData) => Promise<void>, after: () => void) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    after()
    startTransition(async () => {
      await action(fd)
    })
  }

  if (mode === 'create' || (mode === 'edit' && current)) {
    return (
      <ListForm
        editing={mode === 'edit' ? current : null}
        others={lists}
        onDone={() => setMode('view')}
        onCreated={(id) => setSelected(id)}
      />
    )
  }

  if (!current) {
    return (
      <div className="card text-center">
        <p className="py-6 text-[13.5px] text-muted">
          아직 가맹점 체크리스트가 없습니다.
          <br />
          오픈 준비 중인 가맹점마다 하나씩 만들어 셋팅 진행 상황을 체크하세요.
        </p>
        <button type="button" onClick={() => setMode('create')} className="btn">
          + 첫 가맹점 체크리스트 만들기
        </button>
      </div>
    )
  }

  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0

  /** 섹션 카드 하나 */
  const section = (key: string, list: SetupItem[], wide = false) => {
    const secDone = list.filter(isDone).length
    return (
      <div key={key} className="overflow-hidden rounded-[18px] border border-brand/25 bg-white print:break-inside-avoid">
        <div className="flex items-center gap-2.5 bg-brand/[.09] px-3 py-2">
          <span className="grid h-9 min-w-[44px] place-items-center rounded-full bg-brand px-2 text-[17px] font-black text-white">
            {sectionNo(key)}
          </span>
          <h3 className="text-[16.5px] font-extrabold">{key}</h3>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums ${
              list.length && secDone === list.length ? 'bg-good/15 text-good' : 'bg-white text-muted'
            }`}
          >
            {secDone}/{list.length}
          </span>
        </div>

        <ul className={`px-3 py-1 ${wide ? 'shell:columns-2 shell:gap-6' : ''}`}>
          {list.map((it) => {
            const done = isDone(it)
            if (editingItem === it.id) {
              return (
                <li key={it.id} className="break-inside-avoid py-1.5">
                  <form
                    onSubmit={(e) => submit(e, saveSetupItem, () => setEditingItem(null))}
                    className="flex flex-wrap gap-1.5 rounded-[10px] border border-brand/40 bg-brand/[.03] p-2"
                  >
                    <input type="hidden" name="id" value={it.id} />
                    <input name="title" required defaultValue={it.title} aria-label="항목" className="fld-input min-w-0 flex-1 !py-1.5 !text-[13px]" />
                    <input name="note" defaultValue={it.note} placeholder="메모 (담당·업체·날짜 등)" aria-label="메모" className="fld-input w-full !py-1.5 !text-[12.5px]" />
                    <div className="flex w-full justify-end gap-1.5">
                      <button type="button" onClick={() => setEditingItem(null)} className="btn-ghost !px-3 !py-1 !text-[12.5px]">취소</button>
                      <button type="submit" className="btn !px-3 !py-1 !text-[12.5px]">저장</button>
                    </div>
                  </form>
                </li>
              )
            }
            return (
              <li key={it.id} className="group flex break-inside-avoid items-center gap-2 border-b border-line-soft py-1.5 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggle(it)}
                  aria-label={done ? '완료 취소' : '완료'}
                  className="-m-1 grid h-9 w-9 shrink-0 place-items-center"
                >
                  <span
                    className={`grid h-[21px] w-[21px] place-items-center rounded-[5px] border-2 text-[12px] font-black transition ${
                      done ? 'border-brand bg-brand text-white' : 'border-brand/60 bg-white'
                    }`}
                  >
                    {done ? '✓' : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(it.id)}
                  className={`min-w-0 flex-1 text-left text-[14px] leading-snug ${done ? 'text-muted line-through' : ''}`}
                  title="눌러서 수정"
                >
                  {it.title}
                  {it.note && <span className="ml-1.5 text-[11.5px] text-muted no-underline">· {it.note}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => remove(it)}
                  aria-label={`${it.title} 삭제`}
                  className="shrink-0 rounded-md px-1.5 py-1 text-[13px] text-muted opacity-60 transition hover:bg-bad/10 hover:text-bad group-hover:opacity-100 print:hidden"
                >
                  ✕
                </button>
              </li>
            )
          })}
          {list.length === 0 && (
            <li className="py-3 text-center text-[12.5px] text-muted">아직 항목이 없습니다. 아래에서 추가하세요.</li>
          )}
        </ul>

        <form
          onSubmit={(e) => {
            const form = e.currentTarget
            submit(e, addSetupItem, () => form.reset())
          }}
          className="flex gap-1.5 border-t border-line-soft px-3 py-2 print:hidden"
        >
          <input type="hidden" name="checklist_id" value={current.id} />
          <input type="hidden" name="section" value={key} />
          <input
            name="title"
            required
            placeholder={`${key} 항목 추가`}
            aria-label={`${key} 항목 추가`}
            className="fld-input min-w-0 flex-1 !py-1.5 !text-[13px]"
          />
          <button type="submit" className="btn-ghost !px-3 !py-1.5 !text-[13px]">추가</button>
        </form>
      </div>
    )
  }

  const byKey = new Map(groups)
  const right = groups.filter(([k]) => k !== '인테리어 & 설비' && k !== '최종 점검')

  return (
    <>
      {/* ── 가맹점 선택 ─────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 print:hidden">
        {lists.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setSelected(l.id)
              setEditingItem(null)
            }}
            className={`rounded-[10px] border px-3 py-1.5 text-[13px] font-bold transition ${
              l.id === current.id
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-white text-ink-2 hover:border-brand/50 hover:text-ink'
            }`}
          >
            {l.store_name}
          </button>
        ))}
        <button type="button" onClick={() => setMode('create')} className="btn-ghost !px-3 !py-1.5 !text-[13px]">
          + 새 가맹점
        </button>
      </div>

      <div id="setup-print-area">
        {/* ── 머리띠 (양식 상단) ───────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-t-[18px] bg-brand px-4 py-3 text-white">
          <div className="leading-none">
            <div className="text-[19px] font-black italic tracking-tight">BBIDDAK</div>
            <div className="mt-0.5 text-[8.5px] font-bold tracking-[0.3em]">FRANCHISE</div>
          </div>
          <h2 className="flex-1 text-[18px] font-black shell:text-[26px]">가맹점 셋팅 체크리스트</h2>
          <div className="w-full rounded-[10px] bg-white px-3 py-1.5 text-[12.5px] text-ink shell:w-[240px]">
            <div className="flex gap-2 border-b border-line-soft py-0.5">
              <span className="w-[70px] shrink-0 whitespace-nowrap text-muted">매장명</span>
              <b className="truncate">{current.store_name}</b>
            </div>
            <div className="flex gap-2 py-0.5">
              <span className="w-[70px] shrink-0 whitespace-nowrap text-muted">오픈예정일</span>
              <b>{current.open_date ?? '미정'}</b>
            </div>
          </div>
        </div>

        {/* ── 진행률 + 도구 ───────────────────────── */}
        <div className="mb-4 rounded-b-[18px] border border-t-0 border-brand/25 bg-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-[13px] font-extrabold tabular-nums">
              {doneCount}/{rows.length} · {pct}%
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1 text-[12px] text-muted print:hidden">
            {current.memo && <span className="mr-auto">📝 {current.memo}</span>}
            <span className={current.memo ? '' : 'mr-auto'}>항목을 누르면 수정, ✕ 로 삭제합니다.</span>
            <button type="button" onClick={() => window.print()} className="rounded-md px-2 py-1 font-semibold hover:bg-line-soft hover:text-ink">
              인쇄 · PDF
            </button>
            <button type="button" onClick={() => setMode('edit')} className="rounded-md px-2 py-1 font-semibold hover:bg-line-soft hover:text-ink">
              매장 정보 수정
            </button>
            {isOwner && (
              <form
                action={deleteSetupChecklist}
                onSubmit={(e) => {
                  if (!confirm(`"${current.store_name}" 체크리스트를 통째로 삭제할까요?`)) e.preventDefault()
                }}
              >
                <input type="hidden" name="id" value={current.id} />
                <button type="submit" className="rounded-md px-2 py-1 font-semibold hover:bg-bad/10 hover:text-bad">
                  삭제
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── 01 왼쪽 | 02·03·04 오른쪽 ─────────────── */}
        <div className="grid items-start gap-4 shell:grid-cols-2 print:grid-cols-2">
          <div className="grid gap-4">{section('인테리어 & 설비', byKey.get('인테리어 & 설비') ?? [])}</div>
          <div className="grid gap-4">{right.map(([k, list]) => section(k, list))}</div>
        </div>

        {/* ── 05 아래 전체 폭 ──────────────────────── */}
        <div className="mt-4">{section('최종 점검', byKey.get('최종 점검') ?? [], true)}</div>
      </div>

      <p className="mt-3 text-center text-[11.5px] text-muted print:hidden">
        칸 순서: {SETUP_SECTIONS.map((s) => `${s.no} ${s.key}`).join(' · ')}
      </p>
    </>
  )
}
