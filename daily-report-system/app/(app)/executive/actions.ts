'use server'

import { revalidatePath } from 'next/cache'
import { toISODate, parseISODate } from '@/lib/format'
import { OPEN_SECTIONS, OPEN_TEMPLATE } from '@/lib/open-checklist'
import { createClient } from '@/lib/supabase/server'
import type { OpenChecklistStatus, OpenTask } from '@/lib/types'

/**
 * 회의록 저장·삭제. 임원전용 메뉴 안이라 오너만 쓴다.
 * updated_at(최종수정일)은 DB 트리거가 자동으로 now()로 갱신한다.
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
  if (profile?.role !== 'owner') throw new Error('임원만 회의록을 쓸 수 있습니다.')
  return supabase
}

export interface NoteResult {
  ok: boolean
  message: string
}

export async function saveMeetingNote(
  _prev: NoteResult | null,
  formData: FormData
): Promise<NoteResult> {
  const supabase = await assertOwner()

  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, message: '제목을 입력해주세요.' }

  const rawDate = String(formData.get('meeting_date') ?? '').trim()
  const payload = {
    title: title.slice(0, 120),
    meeting_date: /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null,
    attendees: String(formData.get('attendees') ?? '').trim().slice(0, 200),
    body: String(formData.get('body') ?? '').slice(0, 20000),
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { error } = id
    ? await supabase.from('meeting_notes').update(payload).eq('id', id)
    : await supabase
        .from('meeting_notes')
        .insert({ ...payload, created_by: session?.user.id })

  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/executive')
  return { ok: true, message: id ? '수정되었습니다.' : '회의록을 저장했습니다.' }
}

export async function deleteMeetingNote(formData: FormData): Promise<void> {
  const supabase = await assertOwner()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('meeting_notes').delete().eq('id', id)
  revalidatePath('/executive')
}


// ════════════════════════════════════════════════════════════
// 매장 오픈 체크리스트
// ════════════════════════════════════════════════════════════

const OPEN_STATUS_VALUES: OpenChecklistStatus[] = ['preparing', 'opened', 'onhold']

/** 오픈일 D-n → 'YYYY-MM-DD'. 오픈일이 없으면 마감일도 비운다. */
function dueFrom(openDate: string | null, dday: number): string {
  if (!openDate) return ''
  const d = parseISODate(openDate)
  d.setDate(d.getDate() - dday)
  return toISODate(d)
}

export interface OpenResult {
  ok: boolean
  message: string
  /** 새로 만든 오픈 건 id — 화면이 바로 그 건을 열도록 */
  id?: string
}

/**
 * 새 오픈 건 만들기.
 * seed = 'template'  → 표준 절차를 그대로 깔아준다 (기본)
 *        'blank'     → 빈 목록
 *        <오픈건 id>  → 그 오픈에서 했던 항목을 그대로 복사 (체크는 해제)
 */
export async function createOpenChecklist(
  _prev: OpenResult | null,
  formData: FormData
): Promise<OpenResult> {
  const supabase = await assertOwner()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, message: '오픈 매장명을 입력해주세요.' }

  const rawDate = String(formData.get('open_date') ?? '').trim()
  const openDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null
  const seed = String(formData.get('seed') ?? 'template')

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data: created, error } = await supabase
    .from('open_checklists')
    .insert({
      title: title.slice(0, 80),
      open_date: openDate,
      memo: String(formData.get('memo') ?? '').trim().slice(0, 2000),
      created_by: session?.user.id,
    })
    .select('id')
    .single()

  if (error || !created) {
    return { ok: false, message: `생성 실패: ${error?.message ?? '알 수 없음'}` }
  }

  if (seed === 'template') {
    await supabase.from('open_checklist_tasks').insert(
      OPEN_TEMPLATE.map((t, i) => ({
        checklist_id: created.id,
        section: t.section,
        title: t.title,
        due_date: dueFrom(openDate, t.dday),
        sort_order: i,
      }))
    )
  } else if (seed !== 'blank') {
    // 지난 오픈 복사 — 체크·마감일은 비우고 항목만 가져온다
    const { data: src } = await supabase
      .from('open_checklist_tasks')
      .select('*')
      .eq('checklist_id', seed)
      .order('sort_order', { ascending: true })

    const rows = (src ?? []) as OpenTask[]
    if (rows.length > 0) {
      await supabase.from('open_checklist_tasks').insert(
        rows.map((t, i) => ({
          checklist_id: created.id,
          section: t.section,
          title: t.title,
          owner: t.owner,
          cost: t.cost,
          vendor: t.vendor,
          memo: t.memo,
          sort_order: i,
        }))
      )
    }
  }

  revalidatePath('/executive')
  return { ok: true, message: '오픈 체크리스트를 만들었습니다.', id: created.id }
}

/** 오픈 건의 제목·오픈일·상태·메모 수정 */
export async function saveOpenChecklist(
  _prev: OpenResult | null,
  formData: FormData
): Promise<OpenResult> {
  const supabase = await assertOwner()

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: '대상을 찾을 수 없습니다.' }

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return { ok: false, message: '오픈 매장명을 입력해주세요.' }

  const rawDate = String(formData.get('open_date') ?? '').trim()
  const rawStatus = String(formData.get('status') ?? '') as OpenChecklistStatus

  const { error } = await supabase
    .from('open_checklists')
    .update({
      title: title.slice(0, 80),
      open_date: /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null,
      status: OPEN_STATUS_VALUES.includes(rawStatus) ? rawStatus : 'preparing',
      memo: String(formData.get('memo') ?? '').trim().slice(0, 2000),
    })
    .eq('id', id)

  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/executive')
  return { ok: true, message: '수정되었습니다.' }
}

export async function deleteOpenChecklist(formData: FormData): Promise<void> {
  const supabase = await assertOwner()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  // tasks 는 on delete cascade 로 같이 지워진다
  await supabase.from('open_checklists').delete().eq('id', id)
  revalidatePath('/executive')
}

/** 체크리스트 항목 입력값 — 추가·수정이 같은 규칙을 쓴다 */
function readTask(formData: FormData) {
  const rawSection = String(formData.get('section') ?? '기타')
  const rawDue = String(formData.get('due_date') ?? '').trim()
  const cost = Number(String(formData.get('cost') ?? '').replace(/[^0-9]/g, ''))

  return {
    section: OPEN_SECTIONS.some((s) => s.key === rawSection) ? rawSection : '기타',
    title: String(formData.get('title') ?? '').trim().slice(0, 200),
    owner: String(formData.get('owner') ?? '').trim().slice(0, 40),
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(rawDue) ? rawDue : '',
    cost: Number.isFinite(cost) ? Math.max(cost, 0) : 0,
    vendor: String(formData.get('vendor') ?? '').trim().slice(0, 80),
    memo: String(formData.get('memo') ?? '').trim().slice(0, 500),
  }
}

export async function addOpenTask(formData: FormData): Promise<void> {
  const supabase = await assertOwner()
  const checklistId = String(formData.get('checklist_id') ?? '')
  const fields = readTask(formData)
  if (!checklistId || !fields.title) return

  // 새 항목은 맨 뒤로
  const { data: last } = await supabase
    .from('open_checklist_tasks')
    .select('sort_order')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from('open_checklist_tasks').insert({
    checklist_id: checklistId,
    ...fields,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  revalidatePath('/executive')
}

export async function saveOpenTask(formData: FormData): Promise<void> {
  const supabase = await assertOwner()
  const id = String(formData.get('id') ?? '')
  const fields = readTask(formData)
  if (!id || !fields.title) return

  await supabase.from('open_checklist_tasks').update(fields).eq('id', id)
  revalidatePath('/executive')
}

export async function toggleOpenTask(formData: FormData): Promise<void> {
  const supabase = await assertOwner()
  const id = String(formData.get('id') ?? '')
  const done = String(formData.get('done') ?? '') === 'true'
  if (!id) return

  await supabase
    .from('open_checklist_tasks')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id)

  revalidatePath('/executive')
}

export async function deleteOpenTask(formData: FormData): Promise<void> {
  const supabase = await assertOwner()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('open_checklist_tasks').delete().eq('id', id)
  revalidatePath('/executive')
}
