'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import type { Store } from '@/lib/types'
import { setStoreRecipes } from './actions'

/**
 * 매장별 공개 레시피 (오너 전용).
 * "전체 공개"면 지금처럼 점주센터 권한대로, "선택한 레시피만"이면 그 매장 점장에게는
 * 사이드바 "레시피" 메뉴로 고른 레시피만 보인다.
 */
export function StoreRecipeAccess({
  stores,
  categories,
  recipes,
}: {
  stores: Store[]
  categories: RecipeCategory[]
  recipes: Recipe[]
}) {
  const router = useRouter()
  const [storeId, setStoreId] = useState(
    () => stores.find((s) => s.recipe_ids != null)?.id ?? stores[0]?.id ?? ''
  )
  const store = stores.find((s) => s.id === storeId)
  const [limited, setLimited] = useState(store?.recipe_ids != null)
  const [picked, setPicked] = useState<Set<string>>(new Set(store?.recipe_ids ?? []))
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

  const grouped = useMemo(
    () =>
      categories
        .map((c) => ({ c, items: recipes.filter((r) => r.category_id === c.id) }))
        .filter((g) => g.items.length > 0),
    [categories, recipes]
  )
  const limitedCount = stores.filter((s) => s.recipe_ids != null).length

  function pickStore(id: string) {
    const s = stores.find((x) => x.id === id)
    setStoreId(id)
    setLimited(s?.recipe_ids != null)
    setPicked(new Set(s?.recipe_ids ?? []))
    setMsg('')
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save() {
    start(async () => {
      const res = await setStoreRecipes(storeId, limited ? Array.from(picked) : null)
      setMsg(res.ok ? '저장했습니다.' : `저장 실패: ${res.error}`)
      if (res.ok) router.refresh()
    })
  }

  return (
    <details className="card mt-6">
      <summary className="cursor-pointer select-none text-[13.5px] font-bold text-ink-2">
        🏪 매장별 공개 레시피
        <span className="ml-2 text-[12px] font-semibold text-muted">
          {limitedCount > 0 ? `${limitedCount}개 매장 제한 중` : '모든 매장 전체 공개'}
        </span>
      </summary>

      <p className="mt-3 text-[12.5px] text-muted">
        &lsquo;선택한 레시피만&rsquo;으로 두면 그 매장 점장에게는 사이드바 <b>레시피</b> 메뉴가 생기고,
        고른 레시피만 보입니다. 점주센터 PIN·권한 없이 볼 수 있어요.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={storeId}
          onChange={(e) => pickStore(e.target.value)}
          className="fld-input !w-auto min-w-[160px]"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.recipe_ids != null ? ` (${s.recipe_ids.length}개만)` : ''}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-line text-[12.5px] font-semibold">
          <button
            type="button"
            onClick={() => setLimited(false)}
            className={`px-3 py-2 ${!limited ? 'bg-ink text-white' : 'bg-surface text-ink-2'}`}
          >
            전체 공개
          </button>
          <button
            type="button"
            onClick={() => setLimited(true)}
            className={`px-3 py-2 ${limited ? 'bg-ink text-white' : 'bg-surface text-ink-2'}`}
          >
            선택한 레시피만
          </button>
        </div>
      </div>

      {limited && (
        <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto rounded-lg border border-line-soft p-3">
          {grouped.map(({ c, items }) => (
            <div key={c.id}>
              <div className="mb-1.5 text-[12px] font-bold text-muted">{c.name}</div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 shell:grid-cols-3">
                {items.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-line-soft"
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4 accent-[#f0542d]"
                    />
                    <span className="min-w-0 truncate">{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !storeId} className="btn">
          {pending ? '저장 중…' : '저장'}
        </button>
        <span className="text-[12.5px] text-muted">
          {limited ? `${picked.size}개 선택됨` : '이 매장은 제한 없음'}
          {msg && ` · ${msg}`}
        </span>
      </div>
    </details>
  )
}
