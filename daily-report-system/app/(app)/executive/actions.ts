'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
