import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/session'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import { RecipeDetail } from './RecipeDetail'

export const dynamic = 'force-dynamic'

const BUCKET = 'owner-center'

/** 03. 레시피 — 메뉴 상세 (재료·제조방법·특이사항·전처리·사진) */
export default async function RecipeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { profile } = await getSessionContext()
  const isOwner = profile.role === 'owner'
  const supabase = createClient()

  const [recipeRes, catRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('recipe_categories').select('*').order('sort_order', { ascending: true }),
  ])

  const recipe = recipeRes.data as Recipe | null
  if (!recipe) notFound()
  const categories = (catRes.data ?? []) as RecipeCategory[]
  const category = categories.find((c) => c.id === recipe.category_id)

  let photoUrl = ''
  if (recipe.photo_path) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(recipe.photo_path, 60 * 60)
    photoUrl = data?.signedUrl ?? ''
  }

  return (
    <RecipeDetail
      recipe={recipe}
      categoryName={category?.name ?? ''}
      categories={categories}
      photoUrl={photoUrl}
      isOwner={isOwner}
    />
  )
}
