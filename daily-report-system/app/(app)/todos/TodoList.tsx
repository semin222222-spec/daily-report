'use client'

import { useMemo, useState, useTransition } from 'react'
import type { Todo } from '@/lib/types'
import { deleteTodo, toggleTodo } from './actions'

/**
 * 할일 목록 — 체크·삭제를 낙관적으로 처리한다.
 * 예전엔 체크할 때마다 서버 폼을 제출해 전체 페이지가 새로고침돼 느렸다.
 * 지금은 화면을 먼저 바꾸고 저장은 뒤에서 따라간다. 실패하면 되돌린다.
 */
export function TodoList({
  todos,
  storeName,
  readOnly,
}: {
  todos: Todo[]
  storeName: string
  readOnly: boolean
}) {
  // 초기 표시 순서는 한 번만 정한다(미완료 먼저). 체크해도 순서가 튀지 않게.
  const order = useMemo(
    () =>
      [...todos]
        .sort((a, b) => Number(a.done) - Number(b.done))
        .map((t) => t.id),
    [todos]
  )
  const byId = useMemo(
    () => Object.fromEntries(todos.map((t) => [t.id, t])),
    [todos]
  )

  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(todos.map((t) => [t.id, t.done]))
  )
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const visible = order.filter((id) => !removed.has(id))
  const openCount = visible.filter((id) => !doneMap[id]).length

  function toggle(id: string) {
    if (readOnly) return
    const next = !doneMap[id]
    setDoneMap((m) => ({ ...m, [id]: next }))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      fd.set('done', String(next))
      await toggleTodo(fd)
    })
  }

  function remove(id: string) {
    if (readOnly) return
    setRemoved((s) => new Set(s).add(id))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteTodo(fd)
    })
  }

  return (
    <>
      <h3 className="card-title">
        오늘 할일 <span className="pill pill-w">{storeName}</span>
      </h3>
      <p className="card-sub">
        점장·직원이 매장에서 직접 적고 체크하는 공간입니다. 남은 일{' '}
        <b className="text-brand-deep">{openCount}건</b>
      </p>

      <div>
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            등록된 할일이 없습니다. 아래에서 추가해보세요.
          </p>
        )}

        {visible.map((id) => {
          const t = byId[id]
          const done = doneMap[id]
          return (
            <div
              key={id}
              className="flex items-center gap-3 border-b border-line-soft px-1 py-3 last:border-b-0"
            >
              <button
                type="button"
                disabled={readOnly}
                onClick={() => toggle(id)}
                aria-label={done ? '완료 취소' : '완료 처리'}
                className="-m-2 grid h-10 w-10 place-items-center p-2 disabled:opacity-50"
              >
                <span
                  className={`grid h-[22px] w-[22px] place-items-center rounded border-2 text-[12px] font-bold transition ${
                    done ? 'border-brand bg-brand text-white' : 'border-line'
                  }`}
                >
                  {done ? '✓' : ''}
                </span>
              </button>

              <span
                className={`flex-1 text-sm ${
                  done ? 'text-muted line-through' : ''
                }`}
              >
                {t.text}
              </span>

              <span className="rounded-full bg-line-soft px-2 py-[3px] text-[11.5px] text-muted">
                {t.assignee}
              </span>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label="삭제"
                  className="-m-2 grid h-10 w-10 place-items-center p-2 text-muted
                             transition hover:text-bad"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
