'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import { RecipeForm } from '../RecipeForm'
import { deleteRecipe } from '../actions'

export function RecipeDetail({
  recipe,
  categoryName,
  categories,
  photoUrl,
  isOwner,
}: {
  recipe: Recipe
  categoryName: string
  categories: RecipeCategory[]
  photoUrl: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onDelete() {
    setBusy(true)
    const fd = new FormData()
    fd.set('id', recipe.id)
    await deleteRecipe(fd)
    router.push('/owner-center/recipe')
    router.refresh()
  }

  if (editing) {
    return (
      <>
        <div className="mb-4">
          <Link
            href="/owner-center/recipe"
            className="text-[13px] font-semibold text-muted hover:text-ink"
          >
            ← 레시피
          </Link>
        </div>
        <RecipeForm
          categories={categories}
          recipe={recipe}
          photoUrl={photoUrl}
          onDone={() => setEditing(false)}
        />
      </>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Link
            href="/owner-center/recipe"
            className="text-[13px] font-semibold text-muted hover:text-ink"
          >
            ← {categoryName || '레시피'}
          </Link>
          <h2 className="mt-1 text-[19px] font-extrabold">{recipe.name}</h2>
        </div>
        {isOwner && (
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost !px-3 !py-1.5 !text-xs">
              수정
            </button>
            {confirming ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  className="btn !bg-bad !px-3 !py-1.5 !text-xs hover:!bg-bad"
                >
                  삭제 확정
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="btn-ghost !px-3 !py-1.5 !text-xs"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-md px-2 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
              >
                삭제
              </button>
            )}
          </div>
        )}
      </div>

      {photoUrl && (
        <div className="card mb-4 !p-0 overflow-hidden bg-[#fbfaf8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={recipe.name}
            className="mx-auto max-h-64 w-auto max-w-full object-contain sm:max-h-80"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 shell:grid-cols-2">
        {/* 재료 */}
        <div className="card">
          <h3 className="card-title">재료</h3>
          <p className="card-sub">1인분 기준</p>
          <ul className="divide-y divide-line-soft">
            {recipe.ingredients.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between py-2 text-[13.5px]">
                <span className="text-ink-2">{i.name}</span>
                {i.amount && <span className="font-semibold tabular-nums">{i.amount}</span>}
              </li>
            ))}
          </ul>

          {(recipe.garnish || recipe.sauce) && (
            <div className="mt-3 space-y-1 border-t border-line-soft pt-3 text-[13px]">
              {recipe.garnish && (
                <p>
                  <span className="font-semibold text-ink-2">가니쉬 · </span>
                  {recipe.garnish}
                </p>
              )}
              {recipe.sauce && (
                <p>
                  <span className="font-semibold text-ink-2">소스 · </span>
                  {recipe.sauce}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 제조 및 제공 방법 */}
        <div className="card">
          <h3 className="card-title">제조 및 제공 방법</h3>
          <p className="card-sub">순서대로 진행한다</p>
          <ol className="space-y-2.5">
            {recipe.steps.map((s, idx) => (
              <li key={idx} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/[.1] text-[11px] font-bold text-brand-deep">
                  {idx + 1}
                </span>
                <span className="text-ink-2">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 특이사항 */}
        {recipe.notes.length > 0 && (
          <div className="card border-warn/40 bg-warn/[.05]">
            <h3 className="card-title">특이사항</h3>
            <ul className="space-y-1.5">
              {recipe.notes.map((n, idx) => (
                <li key={idx} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                  <span className="text-[#8a5a00]">⚠</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 원재료 전처리 */}
        {recipe.prep.length > 0 && (
          <div className="card">
            <h3 className="card-title">원재료 전처리</h3>
            <ul className="space-y-2">
              {recipe.prep.map((p, idx) => (
                <li key={idx} className="text-[13px] leading-relaxed">
                  <span className="font-semibold text-ink-2">{p.name}</span>
                  <span className="text-muted"> · {p.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
