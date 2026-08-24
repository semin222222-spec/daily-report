'use server'

import { revalidatePath } from 'next/cache'
import { canEdit } from '@/lib/permissions'
import { DEFAULT_VENDORS } from '@/lib/purchases'
import { canWriteStore, getSessionContext } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export interface ActionResult {
  ok: boolean
  message: string
}

const MENU = '/purchases'

function canEditPurchases(profile: Profile) {
  return canEdit(profile.role, profile.permissions, MENU)
}

/** 금액 정리 — 원 단위 정수, 음수 금지 (반품·환급은 별도 줄로 적는다) */
function clampAmount(n: unknown): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.round(v))
}

export interface CellInput {
  vendorId: string
  /** 'YYYY-MM-DD' */
  date: string
  amount: number
}

export interface NoteInput {
  weekNo: number
  note: string
}

export interface SavePurchasesPayload {
  ym: string
  /** 이번에 바뀐 칸만 넘어온다 (한 달 248칸을 매번 다 보내지 않으려고) */
  cells: CellInput[]
  /** 이번에 바뀐 주별 비고만 */
  notes: NoteInput[]
}

/**
 * 매입 격자 저장 (자동 저장).
 *
 * 바뀐 칸만 받아서
 *   금액 > 0  → upsert (vendor_id, date 유니크)
 *   금액 == 0 → 그 줄 삭제 (0을 남겨두면 빈 칸과 구분이 안 되고 표만 무거워진다)
 * 로 처리한다.
 */
export async function savePurchases(
  payload: SavePurchasesPayload
): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id)) {
    return { ok: false, message: '이 매장에 저장할 권한이 없습니다.' }
  }
  if (!canEditPurchases(profile)) {
    return { ok: false, message: '거래처 매입 현황 수정 권한이 없습니다.' }
  }

  const { ym } = payload
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return { ok: false, message: '월이 올바르지 않습니다.' }
  }

  const supabase = createClient()

  // 넘어온 거래처가 정말 이 매장 것인지 확인한다.
  // (RLS가 막아주긴 하지만, 다른 매장 거래처 id를 끼워 넣은 요청은 여기서 잘라낸다)
  const cells = (payload.cells ?? []).filter(
    (c) =>
      typeof c.vendorId === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(c.date) &&
      c.date.slice(0, 7) === ym
  )

  if (cells.length > 0) {
    const vendorIds = Array.from(new Set(cells.map((c) => c.vendorId)))
    const { data: owned } = await supabase
      .from('purchase_vendors')
      .select('id')
      .eq('store_id', activeStore.id)
      .in('id', vendorIds)

    const ownedIds = new Set((owned ?? []).map((v) => v.id as string))
    const valid = cells.filter((c) => ownedIds.has(c.vendorId))

    const toUpsert = valid
      .filter((c) => clampAmount(c.amount) > 0)
      .map((c) => ({
        store_id: activeStore.id,
        vendor_id: c.vendorId,
        date: c.date,
        amount: clampAmount(c.amount),
        created_by: profile.id,
      }))

    const toClear = valid.filter((c) => clampAmount(c.amount) === 0)

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from('purchase_entries')
        .upsert(toUpsert, { onConflict: 'vendor_id,date' })
      if (error) return { ok: false, message: `저장 실패: ${error.message}` }
    }

    // 비운 칸 삭제 — 거래처별로 날짜를 묶어 호출 수를 줄인다
    const byVendor = new Map<string, string[]>()
    for (const c of toClear) {
      const list = byVendor.get(c.vendorId) ?? []
      list.push(c.date)
      byVendor.set(c.vendorId, list)
    }
    for (const [vendorId, dates] of byVendor) {
      const { error } = await supabase
        .from('purchase_entries')
        .delete()
        .eq('store_id', activeStore.id)
        .eq('vendor_id', vendorId)
        .in('date', dates)
      if (error) return { ok: false, message: `저장 실패: ${error.message}` }
    }
  }

  const notes = (payload.notes ?? [])
    .filter((n) => Number.isInteger(n.weekNo) && n.weekNo >= 1 && n.weekNo <= 6)
    .map((n) => ({
      store_id: activeStore.id,
      ym,
      week_no: n.weekNo,
      note: String(n.note ?? '').slice(0, 200),
    }))

  if (notes.length > 0) {
    const { error } = await supabase
      .from('purchase_week_notes')
      .upsert(notes, { onConflict: 'store_id,ym,week_no' })
    if (error) return { ok: false, message: `저장 실패: ${error.message}` }
  }

  revalidatePath(MENU)
  return { ok: true, message: '저장되었습니다.' }
}

/** 거래처 추가 — 목록 맨 뒤에 붙는다 */
export async function addVendor(formData: FormData): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id) || !canEditPurchases(profile)) {
    return { ok: false, message: '거래처를 추가할 권한이 없습니다.' }
  }

  const name = String(formData.get('name') ?? '').trim().slice(0, 40)
  if (!name) return { ok: false, message: '거래처 이름을 입력하세요.' }

  const supabase = createClient()
  const { data: last } = await supabase
    .from('purchase_vendors')
    .select('sort_order')
    .eq('store_id', activeStore.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('purchase_vendors').insert({
    store_id: activeStore.id,
    name,
    sort_order: (last?.sort_order ?? -1) + 1,
  })

  if (error) {
    // 유니크 인덱스 위반 = 같은 이름이 이미 있다
    return {
      ok: false,
      message: error.code === '23505' ? '이미 있는 거래처입니다.' : `추가 실패: ${error.message}`,
    }
  }

  revalidatePath(MENU)
  return { ok: true, message: `'${name}' 추가했습니다.` }
}

/** 기본 거래처 한 번에 넣기 — 처음 쓰는 매장용. 이미 있는 이름은 건너뛴다. */
export async function seedVendors(): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id) || !canEditPurchases(profile)) {
    return { ok: false, message: '거래처를 추가할 권한이 없습니다.' }
  }

  const supabase = createClient()
  const { data: existing } = await supabase
    .from('purchase_vendors')
    .select('name')
    .eq('store_id', activeStore.id)

  const have = new Set((existing ?? []).map((v) => v.name as string))
  const rows = DEFAULT_VENDORS.filter((n) => !have.has(n)).map((name, i) => ({
    store_id: activeStore.id,
    name,
    sort_order: have.size + i,
  }))

  if (rows.length === 0) {
    return { ok: true, message: '이미 다 등록돼 있습니다.' }
  }

  const { error } = await supabase.from('purchase_vendors').insert(rows)
  if (error) return { ok: false, message: `추가 실패: ${error.message}` }

  revalidatePath(MENU)
  return { ok: true, message: `거래처 ${rows.length}곳을 넣었습니다.` }
}

/** 이 거래처가 지금 매장 것인지 확인 — 맞으면 supabase 클라이언트를 돌려준다 */
async function ownedVendor(id: string) {
  const { profile, activeStore } = await getSessionContext()
  if (!canEditPurchases(profile) || !id) return null

  const supabase = createClient()
  const { data } = await supabase
    .from('purchase_vendors')
    .select('store_id')
    .eq('id', id)
    .maybeSingle()

  if (!data) return null
  if (!canWriteStore(profile, data.store_id) || data.store_id !== activeStore.id) {
    return null
  }
  return supabase
}

/** 거래처 이름 변경 */
export async function renameVendor(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim().slice(0, 40)
  if (!name) return { ok: false, message: '거래처 이름을 입력하세요.' }

  const supabase = await ownedVendor(id)
  if (!supabase) return { ok: false, message: '거래처를 찾을 수 없습니다.' }

  const { error } = await supabase
    .from('purchase_vendors')
    .update({ name })
    .eq('id', id)
  if (error) {
    return {
      ok: false,
      message: error.code === '23505' ? '이미 있는 거래처입니다.' : `저장 실패: ${error.message}`,
    }
  }

  revalidatePath(MENU)
  return { ok: true, message: '이름을 바꿨습니다.' }
}

/**
 * 거래처 켜기/끄기.
 * 삭제 대신 끄는 것을 기본으로 둔다 — 과거 달의 매입 기록이 살아 있어야 하기 때문.
 */
export async function toggleVendor(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const active = String(formData.get('active') ?? '') === '1'

  const supabase = await ownedVendor(id)
  if (!supabase) return

  await supabase
    .from('purchase_vendors')
    .update({ is_active: active })
    .eq('id', id)

  revalidatePath(MENU)
}

/** 거래처 순서 이동 — 이웃과 sort_order 를 맞바꾼다 */
export async function moveVendor(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const dir = String(formData.get('dir') ?? '') === 'up' ? -1 : 1

  const supabase = await ownedVendor(id)
  if (!supabase) return

  const { activeStore } = await getSessionContext()
  const { data } = await supabase
    .from('purchase_vendors')
    .select('id, sort_order')
    .eq('store_id', activeStore.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const list = (data ?? []) as { id: string; sort_order: number }[]
  const idx = list.findIndex((v) => v.id === id)
  const swap = idx + dir
  if (idx < 0 || swap < 0 || swap >= list.length) return

  // sort_order 가 중복·비어 있을 수 있으므로 목록 순서로 전부 다시 번호를 매긴다
  const reordered = [...list]
  ;[reordered[idx], reordered[swap]] = [reordered[swap], reordered[idx]]

  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i].sort_order === i) continue
    await supabase
      .from('purchase_vendors')
      .update({ sort_order: i })
      .eq('id', reordered[i].id)
  }

  revalidatePath(MENU)
}

/** 거래처 완전 삭제 — 그 거래처의 매입 기록도 함께 사라진다 (on delete cascade) */
export async function deleteVendor(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const supabase = await ownedVendor(id)
  if (!supabase) return

  await supabase.from('purchase_vendors').delete().eq('id', id)
  revalidatePath(MENU)
}
