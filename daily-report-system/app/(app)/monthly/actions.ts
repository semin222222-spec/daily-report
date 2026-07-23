'use server'

import { revalidatePath } from 'next/cache'
import { ALL_CATEGORIES } from '@/lib/settlement'
import { canWriteStore, getSessionContext } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import type { SettlementCategory } from '@/lib/types'

export interface ActionResult {
  ok: boolean
  message: string
}

export interface ItemInput {
  category: SettlementCategory
  name: string
  amount: number
}

export interface SavePayload {
  ym: string
  /** 이 호출에서 저장할 카테고리. 인건비 화면은 인건비만 넘긴다. */
  categories: SettlementCategory[]
  items: ItemInput[]
  /** 월정산 화면에서만 넘어온다. 인건비 화면은 매출을 건드리지 않는다. */
  totalSales?: number
  salesAuto?: boolean
}

function clampAmount(n: unknown): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  // 원 단위 정수, 음수 허용 안 함 (환급은 별도 항목으로 적게 한다)
  return Math.max(0, Math.round(v))
}

/**
 * 월정산 시트 저장.
 *
 * 항목은 "넘어온 카테고리만 지우고 다시 넣는" 방식이다.
 * 줄 추가·삭제·순서변경을 한 번에 반영해야 해서 diff보다 이쪽이 단순하고 안전하다.
 * 인건비 화면이 인건비만 저장해도 식자재 줄이 날아가지 않는 이유가 이 스코프다.
 */
export async function saveSettlement(
  payload: SavePayload
): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id)) {
    return { ok: false, message: '이 매장에 저장할 권한이 없습니다.' }
  }

  const { ym } = payload
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return { ok: false, message: '월이 올바르지 않습니다.' }
  }

  const categories = (payload.categories ?? []).filter((c) =>
    ALL_CATEGORIES.includes(c)
  )
  if (categories.length === 0) {
    return { ok: false, message: '저장할 항목이 없습니다.' }
  }

  const supabase = createClient()

  // 1) 시트 확보 (없으면 만든다)
  const sheetPatch: Record<string, unknown> = {
    store_id: activeStore.id,
    ym,
    created_by: profile.id,
  }
  if (payload.totalSales !== undefined) {
    sheetPatch.total_sales = clampAmount(payload.totalSales)
    sheetPatch.sales_auto = payload.salesAuto ?? false
  }

  const { data: sheet, error: sheetError } = await supabase
    .from('monthly_settlements')
    .upsert(sheetPatch, { onConflict: 'store_id,ym' })
    .select('id')
    .single()

  if (sheetError || !sheet) {
    return { ok: false, message: `저장 실패: ${sheetError?.message ?? '시트 없음'}` }
  }

  // 2) 해당 카테고리의 기존 줄 제거
  const { error: delError } = await supabase
    .from('settlement_items')
    .delete()
    .eq('settlement_id', sheet.id)
    .in('category', categories)

  if (delError) {
    return { ok: false, message: `저장 실패: ${delError.message}` }
  }

  // 3) 새 줄 삽입 — 이름과 금액이 모두 비어 있는 줄은 버린다
  const rows = payload.items
    .filter((i) => categories.includes(i.category))
    .filter((i) => i.name.trim() !== '' || clampAmount(i.amount) > 0)
    .map((i, idx) => ({
      settlement_id: sheet.id,
      store_id: activeStore.id,
      category: i.category,
      name: i.name.trim().slice(0, 80),
      amount: clampAmount(i.amount),
      sort_order: idx,
    }))

  if (rows.length > 0) {
    const { error: insError } = await supabase
      .from('settlement_items')
      .insert(rows)
    if (insError) {
      return { ok: false, message: `저장 실패: ${insError.message}` }
    }
  }

  revalidatePath('/monthly')
  revalidatePath('/labor')
  return { ok: true, message: '저장되었습니다.' }
}
