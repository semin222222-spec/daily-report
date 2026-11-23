'use server'

import { revalidatePath } from 'next/cache'
import { canWriteStore, getSessionContext } from '@/lib/session'
import { canEdit } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import type { ClosingIssue, ClosingMenuSale } from '@/lib/types'
import { ISSUE_TYPES } from './constants'

export interface ActionResult {
  ok: boolean
  message: string
}

/** 클라이언트가 보내는 마감일지 한 장 */
export interface ClosingLogInput {
  store_id: string
  date: string
  writer: string
  open_run: number
  naver_bookings: number
  full_at: string
  condition: number
  late: boolean
  late_note: string
  complaint: boolean
  complaint_note: string
  stock_issue: boolean
  stock_issue_note: string
  menu_sales: ClosingMenuSale[]
  issues: ClosingIssue[]
  note: string
}

/** 0 이상 정수로 — 이상한 값은 0 */
function count(v: unknown, max = 100000): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0
}

function text(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max)
}

/**
 * 마감일지 저장. (store_id, date) 유니크라 upsert 한 번으로
 * 처음 작성과 수정을 모두 처리한다.
 */
export async function saveClosingLog(
  input: ClosingLogInput
): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()

  const storeId = String(input?.store_id ?? '')
  if (!canWriteStore(profile, storeId) || storeId !== activeStore.id) {
    return { ok: false, message: '이 매장에 저장할 권한이 없습니다.' }
  }
  if (!canEdit(profile.role, profile.permissions, '/closing-log')) {
    return { ok: false, message: '마감일지 수정 권한이 없습니다.' }
  }

  const date = String(input.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: '마감 날짜를 확인해주세요.' }
  }

  const fullAt = /^\d{2}:\d{2}$/.test(String(input.full_at ?? ''))
    ? String(input.full_at)
    : ''
  const condition = Math.min(Math.max(count(input.condition, 10), 1), 10)

  const menuSales: ClosingMenuSale[] = (Array.isArray(input.menu_sales) ? input.menu_sales : [])
    .map((m) => ({ name: text(m?.name, 40), qty: count(m?.qty, 9999) }))
    .filter((m) => m.name)
    .slice(0, 50)

  const issues: ClosingIssue[] = (Array.isArray(input.issues) ? input.issues : [])
    .map((it) => ({
      type: (ISSUE_TYPES as readonly string[]).includes(String(it?.type))
        ? String(it.type)
        : '기타',
      text: text(it?.text, 500),
      amount: count(it?.amount, 100_000_000),
    }))
    .filter((it) => it.text || it.amount)
    .slice(0, 20)

  const supabase = createClient()
  const { error } = await supabase.from('closing_logs').upsert(
    {
      store_id: storeId,
      date,
      writer: text(input.writer, 40),
      open_run: count(input.open_run, 999),
      naver_bookings: count(input.naver_bookings, 999),
      full_at: fullAt,
      condition,
      late: !!input.late,
      late_note: input.late ? text(input.late_note, 500) : '',
      complaint: !!input.complaint,
      complaint_note: input.complaint ? text(input.complaint_note, 500) : '',
      stock_issue: !!input.stock_issue,
      stock_issue_note: input.stock_issue ? text(input.stock_issue_note, 500) : '',
      menu_sales: menuSales,
      issues,
      note: text(input.note, 1000),
      created_by: profile.id,
    },
    { onConflict: 'store_id,date' }
  )

  if (error) {
    return { ok: false, message: `저장 실패: ${error.message}` }
  }

  revalidatePath('/closing-log')
  return { ok: true, message: `${date} 마감일지가 저장되었습니다.` }
}
