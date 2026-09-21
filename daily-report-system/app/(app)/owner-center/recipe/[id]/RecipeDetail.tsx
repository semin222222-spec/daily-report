'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import { RecipeForm } from '../RecipeForm'
import { RecipePrintSheet } from '../RecipePrintSheet'
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

  // PDF로 저장할 때 브라우저가 제안하는 파일명이 레시피 이름이 되도록 문서 제목을 바꿔둔다
  useEffect(() => {
    const prevTitle = document.title
    document.title = recipe.name
    return () => {
      document.title = prevTitle
    }
  }, [recipe.name])

  function onPrint() {
    window.print()
  }

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
      <div className="mb-4 flex items-start justify-between gap-3 print:hidden">
        <div>
          <Link
            href="/owner-center/recipe"
            className="text-[13px] font-semibold text-muted hover:text-ink"
          >
            ← {categoryName || '레시피'}
          </Link>
          <h2 className="mt-1 text-[19px] font-extrabold">{recipe.name}</h2>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={onPrint} className="btn-ghost !px-3 !py-1.5 !text-xs">
            인쇄 · PDF 저장
          </button>
          {isOwner && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div id="recipe-print-area">
        <RecipePrintSheet recipe={recipe} photoUrl={photoUrl} />
      </div>
    </>
  )
}
