import Link from 'next/link'
import { RECIPE_CATEGORIES, recipesByCategory } from '@/lib/recipes'

export const dynamic = 'force-static'

/** 03. 레시피 — 카테고리 목록 */
export default function RecipeHome() {
  const total = RECIPE_CATEGORIES.reduce(
    (n, c) => n + recipesByCategory(c.slug).length,
    0
  )

  return (
    <>
      <div className="mb-4">
        <Link
          href="/owner-center"
          className="text-[13px] font-semibold text-muted hover:text-ink"
        >
          ← 점주센터
        </Link>
        <div className="mt-1 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[.08] text-[22px]">
            🍳
          </span>
          <div>
            <h2 className="text-[19px] font-extrabold">03. 레시피</h2>
            <p className="text-[12.5px] text-muted">
              메뉴별 조리 표준 레시피 · 총 <b className="text-ink-2">{total}개</b> 메뉴 ·{' '}
              {RECIPE_CATEGORIES.length}개 카테고리
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 shell:grid-cols-3">
        {RECIPE_CATEGORIES.map((c) => {
          const items = recipesByCategory(c.slug)
          return (
            <Link key={c.slug} href={`/owner-center/recipe/${c.slug}`}>
              <div className="card h-full transition hover:border-brand hover:shadow-[0_8px_24px_rgba(240,84,45,.12)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted">{c.no}</span>
                </div>
                <h3 className="mt-1 text-[15px] font-bold">{c.name}</h3>
                <p className="mt-1.5 text-[12px] text-muted">{items.length}개 메뉴 →</p>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
