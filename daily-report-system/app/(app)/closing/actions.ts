'use server'

import { revalidatePath } from 'next/cache'
import { canWriteStore, getSessionContext } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'

export interface ActionResult {
  ok: boolean
  message: string
}

/** 폼 값을 정수로 — 빈 칸이나 쓰레기 값은 0으로 떨어뜨린다 */
function toInt(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? Math.round(n) : 0
}

/**
 * 일마감 저장. (store_id, date) 유니크 제약 덕분에 upsert 한 번으로
 * 신규 입력과 재입력(수정)을 모두 처리한다.
 */
export async function saveClosing(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()

  const storeId = String(formData.get('store_id') ?? '')
  if (!canWriteStore(profile, storeId) || storeId !== activeStore.id) {
    return { ok: false, message: '이 매장에 저장할 권한이 없습니다.' }
  }

  const date = String(formData.get('date') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: '영업일자를 확인해주세요.' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('daily_closings').upsert(
    {
      store_id: storeId,
      date,
      guests: toInt(formData.get('guests')),
      sales_card: toInt(formData.get('sales_card')),
      sales_cash: toInt(formData.get('sales_cash')),
      sales_delivery: toInt(formData.get('sales_delivery')),
      sales_etc: toInt(formData.get('sales_etc')),
      cost: toInt(formData.get('cost')),
      expense: toInt(formData.get('expense')),
      memo: String(formData.get('memo') ?? '').slice(0, 1000),
      created_by: profile.id,
    },
    { onConflict: 'store_id,date' }
  )

  if (error) {
    return { ok: false, message: `저장 실패: ${error.message}` }
  }

  // 손익이 반영되는 화면을 전부 다시 그린다
  revalidatePath('/', 'layout')

  return { ok: true, message: `${date} 마감이 저장되었습니다.` }
}
