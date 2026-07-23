import { getTodos } from '@/lib/queries'
import { getSessionContext } from '@/lib/session'
import { addTodo, deleteTodo, toggleTodo } from './actions'

export const dynamic = 'force-dynamic'

export default async function TodosPage() {
  const { activeStore } = await getSessionContext()
  const todos = await getTodos(activeStore.id)

  const open = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

  return (
    <div className="card">
      <h3 className="card-title">
        오늘 할일 <span className="pill pill-w">{activeStore.name}</span>
      </h3>
      <p className="card-sub">
        점장·직원이 매장에서 직접 적고 체크하는 공간입니다. 남은 일{' '}
        <b className="text-brand-deep">{open.length}건</b>
      </p>

      <div>
        {todos.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            등록된 할일이 없습니다. 아래에서 추가해보세요.
          </p>
        )}

        {[...open, ...done].map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 border-b border-line-soft px-1 py-3 last:border-b-0"
          >
            {/* 체크박스를 누르면 폼이 바로 제출된다 (JS 없이도 동작) */}
            <form action={toggleTodo} className="flex items-center">
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="done" value={String(!t.done)} />
              <button
                type="submit"
                aria-label={t.done ? '완료 취소' : '완료 처리'}
                className={`grid h-[18px] w-[18px] place-items-center rounded border-2 text-[11px] font-bold transition ${
                  t.done
                    ? 'border-brand bg-brand text-white'
                    : 'border-line hover:border-brand'
                }`}
              >
                {t.done ? '✓' : ''}
              </button>
            </form>

            <span
              className={`flex-1 text-sm ${
                t.done ? 'text-muted line-through' : ''
              }`}
            >
              {t.text}
            </span>

            <span className="rounded-full bg-line-soft px-2 py-[3px] text-[11.5px] text-muted">
              {t.assignee}
            </span>

            <form action={deleteTodo}>
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                aria-label="삭제"
                className="px-1 text-muted transition hover:text-bad"
              >
                ✕
              </button>
            </form>
          </div>
        ))}
      </div>

      <form action={addTodo} className="mt-3.5 flex flex-wrap gap-2">
        <input
          name="text"
          required
          maxLength={300}
          placeholder="할일을 입력하세요"
          className="min-w-0 flex-1 rounded-[10px] border border-line bg-[#fbfaf8] px-3 py-[11px] text-sm
                     outline-none transition focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/10"
        />
        <select
          name="assignee"
          defaultValue="점장"
          aria-label="담당"
          className="rounded-[10px] border border-line bg-[#fbfaf8] px-3 py-[11px] text-sm outline-none focus:border-brand"
        >
          <option value="홀">홀</option>
          <option value="주방">주방</option>
          <option value="점장">점장</option>
        </select>
        <button type="submit" className="btn">
          추가
        </button>
      </form>
    </div>
  )
}
