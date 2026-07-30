'use server'

import { revalidatePath } from 'next/cache'
import { canWriteStore, getSessionContext } from '@/lib/session'
import { canEdit } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

export interface ActionResult {
  ok: boolean
  message: string
}

const SECTIONS = [
  'sales_analysis',
  'cost_analysis',
  'inventory',
  'customer_service',
  'staff_performance',
  'etc',
] as const

/**
 * 점장보고서 저장.
 * (store_id, period_type, period_start) 유니크라 작성과 수정이 같은 경로다.
 */
export async function saveReport(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id)) {
    return { ok: false, message: '이 매장에 저장할 권한이 없습니다.' }
  }
  if (!canEdit(profile.role, profile.permissions, '/manager-report')) {
    return { ok: false, message: '점장보고서 수정 권한이 없습니다.' }
  }

  const periodType = String(formData.get('period_type') ?? 'weekly')
  if (periodType !== 'weekly' && periodType !== 'monthly') {
    return { ok: false, message: '기간 종류가 올바르지 않습니다.' }
  }

  const start = String(formData.get('period_start') ?? '')
  const end = String(formData.get('period_end') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return { ok: false, message: '기간이 올바르지 않습니다.' }
  }

  const body: Record<string, string> = {}
  for (const key of SECTIONS) {
    body[key] = String(formData.get(key) ?? '').slice(0, 5000)
  }

  const supabase = createClient()
  const { error } = await supabase.from('manager_reports').upsert(
    {
      store_id: activeStore.id,
      period_type: periodType,
      period_start: start,
      period_end: end,
      ...body,
      created_by: profile.id,
    },
    { onConflict: 'store_id,period_type,period_start' }
  )

  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/manager-report')
  return { ok: true, message: '점장보고서가 저장되었습니다.' }
}

export async function deleteReport(formData: FormData): Promise<void> {
  const { profile, activeStore } = await getSessionContext()
  const id = String(formData.get('id') ?? '')
  if (!id || !canWriteStore(profile, activeStore.id)) return
  if (!canEdit(profile.role, profile.permissions, '/manager-report')) return

  const supabase = createClient()
  await supabase
    .from('manager_reports')
    .delete()
    .eq('id', id)
    .eq('store_id', activeStore.id)

  revalidatePath('/manager-report')
}
