'use server'

import { revalidatePath } from 'next/cache'
import { canWriteStore, getSessionContext } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import type { Assignee } from '@/lib/types'

const ASSIGNEES: Assignee[] = ['홀', '주방', '점장']

export async function addTodo(formData: FormData): Promise<void> {
  const { profile, activeStore } = await getSessionContext()

  const text = String(formData.get('text') ?? '').trim()
  if (!text) return

  const raw = String(formData.get('assignee') ?? '점장') as Assignee
  const assignee = ASSIGNEES.includes(raw) ? raw : '점장'

  const supabase = createClient()
  await supabase.from('todos').insert({
    store_id: activeStore.id,
    text: text.slice(0, 300),
    assignee,
    created_by: profile.id,
  })

  revalidatePath('/todos')
}

/** 체크박스 토글 — done_at도 같이 관리해서 나중에 완료 이력을 볼 수 있게 한다 */
export async function toggleTodo(formData: FormData): Promise<void> {
  const { profile, activeStore } = await getSessionContext()
  const id = String(formData.get('id') ?? '')
  const done = String(formData.get('done') ?? '') === 'true'
  if (!id) return

  const supabase = createClient()
  const { data: todo } = await supabase
    .from('todos')
    .select('store_id')
    .eq('id', id)
    .maybeSingle()

  if (!todo) return
  if (!canWriteStore(profile, todo.store_id) || todo.store_id !== activeStore.id) {
    return
  }

  await supabase
    .from('todos')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id)

  revalidatePath('/todos')
}

export async function deleteTodo(formData: FormData): Promise<void> {
  const { profile, activeStore } = await getSessionContext()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = createClient()
  const { data: todo } = await supabase
    .from('todos')
    .select('store_id')
    .eq('id', id)
    .maybeSingle()

  if (!todo) return
  if (!canWriteStore(profile, todo.store_id) || todo.store_id !== activeStore.id) {
    return
  }

  await supabase.from('todos').delete().eq('id', id)
  revalidatePath('/todos')
}
