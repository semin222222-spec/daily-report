import Link from 'next/link'
import { notFound } from 'next/navigation'
import { recipeBySlug, recipeCategory } from '@/lib/recipes'

export const dynamic = 'force-static'

/** 03. 레시피 — 메뉴 상세 (재료·제조방법·특이사항·전처리) */
export default function RecipeDetailPage({
  params,
}: {
  params: { category: string; slug: string }
}) {
  const category = recipeCategory(params.category)
  const recipe = recipeBySlug(params.slug)
  if (!category || !recipe || recipe.category !== category.slug) notFound()

  return (
    <>
      <div className="mb-4">
        <Link
          href="/owner-center/recipe"
          className="text-[13px] font-semibold text-muted hover:text-ink"
        >
          ← 레시피
        </Link>
        <h2 className="mt-1 text-[19px] font-extrabold">{recipe.name}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 shell:grid-cols-2">
        {/* 재료 */}
        <div className="card">
          <h3 className="card-title">재료</h3>
          <p className="card-sub">1인분 기준</p>
          <ul className="divide-y divide-line-soft">
            {recipe.ingredients.map((i, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between py-2 text-[13.5px]"
              >
                <span className="text-ink-2">{i.name}</span>
                {i.amount && (
                  <span className="font-semibold tabular-nums">{i.amount}</span>
                )}
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
