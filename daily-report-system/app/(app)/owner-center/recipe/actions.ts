'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseNameValueLines, linesToArray } from '@/lib/recipes'

/**
 * 레시피 카테고리·메뉴 CRUD.
 * 추가·수정·삭제는 관리자(owner)만 가능하다. 점장은 보기 전용.
 * (RLS도 is_owner() 로 막혀있지만, 에러 메시지를 사용자에게 보여주려고 여기서도 체크한다)
 */

async function assertOwner() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('로그인이 필요합니다.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profile?.role !== 'owner') {
    throw new Error('관리자만 추가·수정·삭제할 수 있습니다.')
  }
  return supabase
}

// ── 카테고리 ────────────────────────────────────────────────
export async function addRecipeCategory(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const supabase = await assertOwner()

  const { data: last } = await supabase
    .from('recipe_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from('recipe_categories').insert({
    name: name.slice(0, 40),
    sort_order: (last?.sort_order ?? 0) + 1,
  })
  revalidatePath('/owner-center/recipe')
}

export async function renameRecipeCategory(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  if (!id || !name) return
  const supabase = await assertOwner()
  await supabase.from('recipe_categories').update({ name: name.slice(0, 40) }).eq('id', id)
  revalidatePath('/owner-center/recipe')
}

export async function deleteRecipeCategory(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await assertOwner()
  // 메뉴는 on delete cascade 로 함께 지워진다
  await supabase.from('recipe_categories').delete().eq('id', id)
  revalidatePath('/owner-center/recipe')
}

// ── 메뉴 ────────────────────────────────────────────────────
/** 폼에서 메뉴 필드를 뽑아 정리한다 (추가·수정 공용) */
function recipeFields(formData: FormData) {
  const ingredients = parseNameValueLines(String(formData.get('ingredients_text') ?? '')).map(
    (l) => ({ name: l.name.slice(0, 40), amount: l.value.slice(0, 30) })
  )
  const prep = parseNameValueLines(String(formData.get('prep_text') ?? '')).map((l) => ({
    name: l.name.slice(0, 40),
    detail: l.value.slice(0, 200),
  }))
  const steps = linesToArray(String(formData.get('steps_text') ?? '')).map((s) => s.slice(0, 300))
  const notes = linesToArray(String(formData.get('notes_text') ?? '')).map((s) => s.slice(0, 300))

  return {
    category_id: String(formData.get('category_id') ?? ''),
    name: String(formData.get('name') ?? '').trim().slice(0, 60),
    ingredients,
    garnish: String(formData.get('garnish') ?? '').trim().slice(0, 200),
    sauce: String(formData.get('sauce') ?? '').trim().slice(0, 200),
    steps,
    notes,
    prep,
    photo_path: String(formData.get('photo_path') ?? '').trim().slice(0, 300),
  }
}

export async function addRecipe(formData: FormData): Promise<void> {
  const fields = recipeFields(formData)
  if (!fields.category_id || !fields.name) return
  const supabase = await assertOwner()

  const { data: last } = await supabase
    .from('recipes')
    .select('sort_order')
    .eq('category_id', fields.category_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const id = String(formData.get('id') ?? '') || undefined

  await supabase.from('recipes').insert({
    id,
    ...fields,
    sort_order: (last?.sort_order ?? 0) + 1,
  })
  revalidatePath('/owner-center/recipe')
}

export async function updateRecipe(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const fields = recipeFields(formData)
  if (!id || !fields.category_id || !fields.name) return
  const supabase = await assertOwner()
  await supabase.from('recipes').update(fields).eq('id', id)
  revalidatePath('/owner-center/recipe')
}

export async function deleteRecipe(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await assertOwner()
  await supabase.from('recipes').delete().eq('id', id)
  revalidatePath('/owner-center/recipe')
}
