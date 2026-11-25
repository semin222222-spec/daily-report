import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/session'
import { recipePhotoUrl } from '@/lib/owner-center'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import { RecipeList } from '../owner-center/recipe/RecipeList'

export const dynamic = 'force-dynamic'

/**
 * 매장 전용 레시피 — 공개 범위가 정해진 매장(stores.recipe_ids)의 점장이 보는 화면.
 * 점주센터(PIN·자료실) 없이 허용된 레시피만 바로 보여준다. DB도 RLS(can_read_recipe)로 막혀 있다.
 */
export default async function StoreRecipesPage() {
  const { activeStore } = await getSessionContext()
  const allowed = activeStore.recipe_ids
  if (allowed == null) redirect('/dashboard')

  const supabase = createClient()
  const [catRes, recipeRes] = await Promise.all([
    supabase.from('recipe_categories').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('recipes')
      .select('*')
      .in('id', allowed.length > 0 ? allowed : ['00000000-0000-0000-0000-000000000000'])
      .order('sort_order', { ascending: true }),
  ])
  const categories = (catRes.data ?? []) as RecipeCategory[]
  const recipes = (recipeRes.data ?? []) as Recipe[]

  const thumbs: Record<string, string> = {}
  const photos: Record<string, string> = {}
  for (const r of recipes) {
    if (!r.photo_path) continue
    thumbs[r.id] = recipePhotoUrl(r, 240)
    photos[r.id] = recipePhotoUrl(r, 900)
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[.08] text-[22px]">
          🍳
        </span>
        <div>
          <h2 className="text-[19px] font-extrabold">레시피</h2>
          <p className="text-[12.5px] text-muted">
            {activeStore.name} 메뉴 조리 표준 · 총 <b className="text-ink-2">{recipes.length}개</b>
          </p>
        </div>
      </div>

      {recipes.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted">아직 공개된 레시피가 없습니다.</p>
      ) : (
        <RecipeList
          categories={categories}
          recipes={recipes}
          thumbs={thumbs}
          photos={photos}
          isOwner={false}
          basePath="/recipes"
        />
      )}
    </>
  )
}
