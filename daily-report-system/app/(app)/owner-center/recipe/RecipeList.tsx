'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import { RecipeForm } from './RecipeForm'
import { RecipePrintSheet } from './RecipePrintSheet'

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
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [printList, setPrintList] = useState<Recipe[] | null>(null)

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

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  )

  // 카테고리 화면 순서 그대로 나열한 전체 레시피 (검색어와 무관하게 "전체 인쇄"에서 사용)
  const orderedAll = useMemo(() => {
    const map = new Map<string, Recipe[]>()
    for (const r of recipes) {
      const list = map.get(r.category_id) ?? []
      list.push(r)
      map.set(r.category_id, list)
    }
    return categories.flatMap((c) => map.get(c.id) ?? [])
  }, [categories, recipes])

  // 인쇄할 목록이 잡히면 렌더링 직후 인쇄 대화상자를 띄우고, 끝나면 정리한다
  useEffect(() => {
    if (!printList) return
    const prevTitle = document.title
    document.title = printList.length === 1 ? printList[0].name : `레시피 ${printList.length}건`
    const timer = setTimeout(() => window.print(), 50)
    const onAfterPrint = () => setPrintList(null)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', onAfterPrint)
      document.title = prevTitle
    }
  }, [printList])

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelected(new Set())
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function printAll() {
    setPrintList(orderedAll)
  }

  function printSelected() {
    if (selected.size === 0) return
    setPrintList(orderedAll.filter((r) => selected.has(r.id)))
  }

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
        <button type="button" onClick={toggleSelectMode} className="btn-ghost shrink-0 !text-xs">
          {selectMode ? '선택 취소' : '선택 인쇄'}
        </button>
        <button type="button" onClick={printAll} className="btn-ghost shrink-0 !text-xs">
          전체 인쇄
        </button>
        {isOwner && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn shrink-0">
            + 레시피 추가
          </button>
        )}
      </div>

      {selectMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[12px] border border-brand/30 bg-brand/[.05] px-3.5 py-2.5">
          <span className="text-[13px] font-semibold text-brand-deep">
            {selected.size}개 선택됨
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set(filtered.map((r) => r.id)))}
            className="text-[12.5px] font-semibold text-ink-2 hover:text-ink"
          >
            전체 선택
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-[12.5px] font-semibold text-ink-2 hover:text-ink"
          >
            선택 해제
          </button>
          <button
            type="button"
            onClick={printSelected}
            disabled={selected.size === 0}
            className="btn !ml-auto !min-h-0 !px-3.5 !py-2 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            선택 항목 인쇄 ({selected.size})
          </button>
        </div>
      )}

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
                {items.map((r) => {
                  const thumb = thumbs[r.id]
                  const isChecked = selected.has(r.id)
                  const cardInner = (
                    <>
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[#fbfaf8]">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[16px]">🍽️</span>
                        )}
                      </div>
                      <span className="min-w-0 truncate">{r.name}</span>
                    </>
                  )
                  if (selectMode) {
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleSelected(r.id)}
                        aria-pressed={isChecked}
                        className={`relative flex items-center gap-2.5 rounded-[12px] border p-2 text-left text-[13.5px] font-semibold transition ${
                          isChecked
                            ? 'border-brand bg-brand/[.06] text-brand-deep shadow-[0_8px_24px_rgba(240,84,45,.12)]'
                            : 'border-line bg-surface hover:border-brand hover:text-brand-deep'
                        }`}
                      >
                        <span
                          className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border text-[10px] ${
                            isChecked
                              ? 'border-brand bg-brand text-white'
                              : 'border-line bg-white text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        {cardInner}
                      </button>
                    )
                  }
                  return (
                    <Link
                      key={r.id}
                      href={`/owner-center/recipe/${r.id}`}
                      className="flex items-center gap-2.5 rounded-[12px] border border-line bg-surface p-2 text-[13.5px] font-semibold transition hover:border-brand hover:text-brand-deep hover:shadow-[0_8px_24px_rgba(240,84,45,.12)]"
                    >
                      {cardInner}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {printList && (
        <div id="recipe-print-area" className="fixed -left-[10000px] top-0 w-[800px]">
          {printList.map((r, idx) => (
            <div key={r.id} className={idx > 0 ? 'print:break-before-page' : undefined}>
              <RecipePrintSheet
                recipe={r}
                photoUrl={thumbs[r.id]}
                categoryName={categoryNameById.get(r.category_id)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
