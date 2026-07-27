'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * 오픈발주 카테고리·품목 CRUD.
 * 점주센터는 앱에서 PIN으로 잠그고, DB에서는 authenticated 전원 접근이라
 * 여기서는 로그인 여부만 실질적 방어선(RLS)이다.
 */

async function assertLoggedIn() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('로그인이 필요합니다.')
  return supabase
}

// ── 카테고리 ────────────────────────────────────────────────
export async function addCategory(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const supabase = await assertLoggedIn()

  const { data: last } = await supabase
    .from('oc_categories')
    .select('sort_order')
    .eq('folder', 'open-order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from('oc_categories').insert({
    folder: 'open-order',
    name: name.slice(0, 40),
    sort_order: (last?.sort_order ?? 0) + 1,
  })
  revalidatePath('/owner-center/open-order')
}

export async function renameCategory(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  if (!id || !name) return
  const supabase = await assertLoggedIn()
  await supabase
    .from('oc_categories')
    .update({ name: name.slice(0, 40) })
    .eq('id', id)
  revalidatePath('/owner-center/open-order')
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await assertLoggedIn()
  // 품목은 on delete cascade 로 함께 지워진다
  await supabase.from('oc_categories').delete().eq('id', id)
  revalidatePath('/owner-center/open-order')
}

// ── 품목 ────────────────────────────────────────────────────
const PRIORITIES = ['필수', '권장', '선택']
const STATUSES = ['미구매', '구매중', '구매완료', '보류']

function toMoney(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

/** 폼에서 품목 필드를 뽑아 정리한다 (추가·수정 공용) */
function itemFields(formData: FormData) {
  const priority = String(formData.get('priority') ?? '필수')
  const status = String(formData.get('status') ?? '미구매')
  return {
    name: String(formData.get('name') ?? '').trim().slice(0, 80),
    spec: String(formData.get('spec') ?? '').trim().slice(0, 80),
    qty: String(formData.get('qty') ?? '').trim().slice(0, 20),
    unit: String(formData.get('unit') ?? 'EA').trim().slice(0, 12) || 'EA',
    est_price: toMoney(formData.get('est_price')),
    buy_price: toMoney(formData.get('buy_price')),
    priority: PRIORITIES.includes(priority) ? priority : '필수',
    status: STATUSES.includes(status) ? status : '미구매',
    manager: String(formData.get('manager') ?? '').trim().slice(0, 30),
    vendor: String(formData.get('vendor') ?? '').trim().slice(0, 40),
    link: String(formData.get('link') ?? '').trim().slice(0, 500),
    due_date: String(formData.get('due_date') ?? '').trim().slice(0, 30),
    location: String(formData.get('location') ?? '').trim().slice(0, 40),
    note: String(formData.get('note') ?? '').trim().slice(0, 200),
  }
}

export async function addItem(formData: FormData): Promise<void> {
  const categoryId = String(formData.get('category_id') ?? '')
  const fields = itemFields(formData)
  if (!categoryId || !fields.name) return
  const supabase = await assertLoggedIn()

  const { data: last } = await supabase
    .from('oc_items')
    .select('sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from('oc_items').insert({
    category_id: categoryId,
    ...fields,
    sort_order: (last?.sort_order ?? 0) + 1,
  })
  revalidatePath('/owner-center/open-order')
}

export async function updateItem(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const fields = itemFields(formData)
  if (!id || !fields.name) return
  const supabase = await assertLoggedIn()
  // updated_at(최종수정일)은 트리거가 자동으로 now()로 갱신한다
  await supabase.from('oc_items').update(fields).eq('id', id)
  revalidatePath('/owner-center/open-order')
}

/** 표에서 구매상태만 빠르게 바꾸기 (드롭다운 즉시 반영) */
export async function setItemStatus(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !STATUSES.includes(status)) return
  const supabase = await assertLoggedIn()
  await supabase.from('oc_items').update({ status }).eq('id', id)
  revalidatePath('/owner-center/open-order')
}

export async function deleteItem(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await assertLoggedIn()
  await supabase.from('oc_items').delete().eq('id', id)
  revalidatePath('/owner-center/open-order')
}
