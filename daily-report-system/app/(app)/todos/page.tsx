import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { getTodos } from '@/lib/queries'
import { guardMenu } from '@/lib/session'
import { addTodo } from './actions'
import { TodoList } from './TodoList'

export const dynamic = 'force-dynamic'

export default async function TodosPage() {
  const { activeStore, readOnly } = await guardMenu('/todos')
  const todos = await getTodos(activeStore.id)

  return (
    <>
      {readOnly && <ReadOnlyBanner />}
      <div className="card">
      <TodoList
        key={activeStore.id}
        todos={todos}
        storeName={activeStore.name}
        readOnly={readOnly}
      />

      {!readOnly && (
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
      )}
    </div>
    </>
  )
}
