'use server'

import { revalidatePath } from 'next/cache'
import { SETUP_SECTIONS, SETUP_TEMPLATE, type SetupItem } from '@/lib/setup-checklist'
import { createClient } from '@/lib/supabase/server'

/**
 * 가맹점 셋팅 체크리스트 저장·삭제.
 * 점주센터는 로그인 + PIN 으로 막혀 있으므로 로그인 사용자면 쓸 수 있다.
 * 체크리스트 한 장을 통째로 지우는 것만 오너 (DB 정책도 같다).
 */

const PATH = '/owner-center/setup'

async function assertLogin() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('로그인이 필요합니다.')
  return { supabase, userId: session.user.id }
}

export interface SetupResult {
  ok: boolean
  message: string
  /** 새로 만든 체크리스트 id — 화면이 바로 그 매장을 연다 */
  id?: string
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
const cleanSection = (s: string) =>
  SETUP_SECTIONS.some((x) => x.key === s) ? s : '추가 체크사항'

/**
 * 새 가맹점 체크리스트.
 * seed = 'template' → 표준 항목 / 'blank' → 빈 목록 / <id> → 그 매장 항목 복사(체크는 해제)
 */
export async function createSetupChecklist(
  _prev: SetupResult | null,
  formData: FormData
): Promise<SetupResult> {
  const { supabase, userId } = await assertLogin()

  const storeName = String(formData.get('store_name') ?? '').trim()
  if (!storeName) return { ok: false, message: '매장명을 입력해주세요.' }
  const rawDate = String(formData.get('open_date') ?? '').trim()
  const seed = String(formData.get('seed') ?? 'template')

  const { data: created, error } = await supabase
    .from('setup_checklists')
    .insert({
      store_name: storeName.slice(0, 80),
      open_date: isDate(rawDate) ? rawDate : null,
      memo: String(formData.get('memo') ?? '').trim().slice(0, 1000),
      created_by: userId,
    })
    .select('id')
    .single()
  if (error || !created) {
    return { ok: false, message: `생성 실패: ${error?.message ?? '알 수 없음'}` }
  }

  let rows: { section: string; title: string; note: string }[] = []
  if (seed === 'template') {
    rows = SETUP_SECTIONS.flatMap((s) =>
      (SETUP_TEMPLATE[s.key] ?? []).map((title) => ({ section: s.key, title, note: '' }))
    )
  } else if (seed !== 'blank') {
    const { data: src } = await supabase
      .from('setup_checklist_items')
      .select('*')
      .eq('checklist_id', seed)
      .order('sort_order', { ascending: true })
    rows = ((src ?? []) as SetupItem[]).map((r) => ({
      section: r.section,
      title: r.title,
      note: r.note,
    }))
  }

  if (rows.length > 0) {
    await supabase
      .from('setup_checklist_items')
      .insert(rows.map((r, i) => ({ ...r, checklist_id: created.id, sort_order: i + 1 })))
  }

  revalidatePath(PATH)
  return { ok: true, message: '체크리스트를 만들었습니다.', id: created.id }
}

/** 매장명·오픈예정일·메모 수정 */
export async function saveSetupChecklist(
  _prev: SetupResult | null,
  formData: FormData
): Promise<SetupResult> {
  const { supabase } = await assertLogin()
  const id = String(formData.get('id') ?? '')
  const storeName = String(formData.get('store_name') ?? '').trim()
  if (!id) return { ok: false, message: '대상을 찾을 수 없습니다.' }
  if (!storeName) return { ok: false, message: '매장명을 입력해주세요.' }
  const rawDate = String(formData.get('open_date') ?? '').trim()

  const { error } = await supabase
    .from('setup_checklists')
    .update({
      store_name: storeName.slice(0, 80),
      open_date: isDate(rawDate) ? rawDate : null,
      memo: String(formData.get('memo') ?? '').trim().slice(0, 1000),
    })
    .eq('id', id)
  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath(PATH)
  return { ok: true, message: '수정되었습니다.' }
}

/** 체크리스트 통째로 삭제 — 오너만 (DB 정책이 막는다) */
export async function deleteSetupChecklist(formData: FormData): Promise<void> {
  const { supabase } = await assertLogin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('setup_checklists').delete().eq('id', id)
  revalidatePath(PATH)
}

export async function addSetupItem(formData: FormData): Promise<void> {
  const { supabase } = await assertLogin()
  const checklistId = String(formData.get('checklist_id') ?? '')
  const title = String(formData.get('title') ?? '').trim().slice(0, 200)
  if (!checklistId || !title) return

  const { data: last } = await supabase
    .from('setup_checklist_items')
    .select('sort_order')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from('setup_checklist_items').insert({
    checklist_id: checklistId,
    section: cleanSection(String(formData.get('section') ?? '')),
    title,
    sort_order: (last?.sort_order ?? 0) + 1,
  })
  revalidatePath(PATH)
}

export async function saveSetupItem(formData: FormData): Promise<void> {
  const { supabase } = await assertLogin()
  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim().slice(0, 200)
  if (!id || !title) return
  await supabase
    .from('setup_checklist_items')
    .update({ title, note: String(formData.get('note') ?? '').trim().slice(0, 300) })
    .eq('id', id)
  revalidatePath(PATH)
}

export async function toggleSetupItem(formData: FormData): Promise<void> {
  const { supabase } = await assertLogin()
  const id = String(formData.get('id') ?? '')
  const done = String(formData.get('done') ?? '') === 'true'
  if (!id) return
  await supabase
    .from('setup_checklist_items')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
  revalidatePath(PATH)
}

export async function deleteSetupItem(formData: FormData): Promise<void> {
  const { supabase } = await assertLogin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('setup_checklist_items').delete().eq('id', id)
  revalidatePath(PATH)
}
