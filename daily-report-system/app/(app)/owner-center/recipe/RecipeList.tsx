'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import { RecipeForm } from './RecipeForm'

export function RecipeList({
  categories,
  recipes,
  thumbs,
  isOwner,
}: {
  categories: RecipeCategory[]
  recipes: Recipe[]
  /** 레시피 id → 썸네일 서명 URL */
  thumbs: Record<string, string>
  isOwner: boolean
}) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return recipes
    return recipes.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true
      return r.ingredients.some((i) => i.name.toLowerCase().includes(q))
    })
  }, [recipes, q])

  const byCategory = useMemo(() => {
    const map = new Map<string, Recipe[]>()
    for (const r of filtered) {
      const list = map.get(r.category_id) ?? []
      list.push(r)
      map.set(r.category_id, list)
    }
    return map
  }, [filtered])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메뉴명·재료로 검색"
            className="fld-input !pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색 지우기"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-line-soft hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
        {isOwner && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn shrink-0">
            + 레시피 추가
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-6">
          <RecipeForm categories={categories} onDone={() => setAdding(false)} />
        </div>
      )}

      {q && filtered.length === 0 && (
        <p className="py-10 text-center text-[13px] text-muted">
          &lsquo;{query}&rsquo; 와 일치하는 메뉴가 없습니다.
        </p>
      )}

      <div className="space-y-6">
        {categories.map((c) => {
          const items = byCategory.get(c.id) ?? []
          if (items.length === 0) return null
          return (
            <div key={c.id}>
              <h3 className="mb-2.5 text-[13.5px] font-bold text-ink-2">{c.name}</h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 shell:grid-cols-4">
                {items.map((r) => (
                  <Link
                    key={r.id}
                    href={`/owner-center/recipe/${r.id}`}
                    className="flex items-center gap-2.5 rounded-[12px] border border-line bg-surface p-2 text-[13.5px] font-semibold transition hover:border-brand hover:text-brand-deep hover:shadow-[0_8px_24px_rgba(240,84,45,.12)]"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[#fbfaf8]">
                      {thumbs[r.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbs[r.id]}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[16px]">🍽️</span>
                      )}
                    </div>
                    <span className="min-w-0 truncate">{r.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
