import Link from 'next/link'
import { notFound } from 'next/navigation'
import { recipeCategory, recipesByCategory } from '@/lib/recipes'

export const dynamic = 'force-static'

/** 03. 레시피 — 카테고리 안 메뉴 목록 */
export default function RecipeCategoryPage({
  params,
}: {
  params: { category: string }
}) {
  const category = recipeCategory(params.category)
  if (!category) notFound()
  const items = recipesByCategory(category.slug)

  return (
    <>
      <div className="mb-4">
        <Link
          href="/owner-center/recipe"
          className="text-[13px] font-semibold text-muted hover:text-ink"
        >
          ← 레시피 카테고리
        </Link>
        <h2 className="mt-1 text-[19px] font-extrabold">{category.name}</h2>
        <p className="mt-1 text-[12.5px] text-muted">{items.length}개 메뉴</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 shell:grid-cols-3">
        {items.map((r) => (
          <Link key={r.slug} href={`/owner-center/recipe/${category.slug}/${r.slug}`}>
            <div className="card h-full transition hover:border-brand hover:shadow-[0_8px_24px_rgba(240,84,45,.12)]">
              <h3 className="text-[15px] font-bold">{r.name}</h3>
              <p className="mt-1.5 truncate text-[12px] text-muted">
                {r.ingredients.map((i) => i.name).join(', ')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
