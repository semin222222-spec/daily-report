import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/session'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import { RecipeDetail } from '../../owner-center/recipe/[id]/RecipeDetail'

export const dynamic = 'force-dynamic'

const BUCKET = 'owner-center'

/** 매장 전용 레시피 상세 — 허용 목록에 없는 레시피는 404 */
export default async function StoreRecipeDetailPage({ params }: { params: { id: string } }) {
  const { activeStore } = await getSessionContext()
  const allowed = activeStore.recipe_ids
  if (allowed == null) redirect('/dashboard')
  if (!allowed.includes(params.id)) notFound()

  const supabase = createClient()
  const [recipeRes, catRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('recipe_categories').select('*').order('sort_order', { ascending: true }),
  ])
  const recipe = recipeRes.data as Recipe | null
  if (!recipe) notFound()
  const categories = (catRes.data ?? []) as RecipeCategory[]

  const [photo, video] = await Promise.all([
    recipe.photo_path
      ? supabase.storage.from(BUCKET).createSignedUrl(recipe.photo_path, 60 * 60)
      : null,
    recipe.video_path
      ? supabase.storage.from(BUCKET).createSignedUrl(recipe.video_path, 60 * 60 * 6)
      : null,
  ])

  return (
    <RecipeDetail
      recipe={recipe}
      categoryName={categories.find((c) => c.id === recipe.category_id)?.name ?? ''}
      categories={categories}
      photoUrl={photo?.data?.signedUrl ?? ''}
      videoUrl={video?.data?.signedUrl ?? ''}
      isOwner={false}
      backHref="/recipes"
    />
  )
}
