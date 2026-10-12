'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { EquipItem, EquipLine, EquipOrderKind, EquipOrderStatus } from '@/lib/equip-order'

/**
 * 주방 집기 발주리스트 저장·삭제. 회의록과 같이 오너만 쓴다.
 * 금액·합계는 저장하지 않고 화면에서 수량×단가로 계산한다.
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
  if (profile?.role !== 'owner') throw new Error('임원만 발주리스트를 고칠 수 있습니다.')
  return { supabase, userId: session.user.id }
}

export interface EquipResult {
  ok: boolean
  message: string
  /** 새로 만든 발주서 id — 화면이 바로 그 건을 연다 */
  id?: string
}

const STATUS_VALUES: EquipOrderStatus[] = ['quote', 'ordered', 'delivered']

function readHeader(formData: FormData) {
  const rawDate = String(formData.get('quote_date') ?? '').trim()
  const rawOpen = String(formData.get('open_checklist_id') ?? '').trim()
  return {
    title: String(formData.get('title') ?? '').trim().slice(0, 80),
    vendor: String(formData.get('vendor') ?? '').trim().slice(0, 80),
    quote_date: /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null,
    open_checklist_id: rawOpen || null,
    memo: String(formData.get('memo') ?? '').trim().slice(0, 2000),
    vat_included: String(formData.get('vat_included') ?? '') === 'on',
  }
}

/** 새 발주서의 종류 (탭). 수정 때는 바꾸지 않는다 */
function readKind(formData: FormData): EquipOrderKind {
  return String(formData.get('kind') ?? '') === 'coupang' ? 'coupang' : 'equip'
}

/** http(s) 주소만 받는다 — 그 외(javascript: 등)는 버린다 */
function cleanLink(v: unknown): string {
  const s = String(v ?? '').trim()
  return /^https?:\/\//i.test(s) ? s.slice(0, 1000) : ''
}

function cleanLine(l: EquipLine, i: number) {
  const qty = Number(l.qty)
  const price = Number(l.unit_price)
  return {
    section: String(l.section || '기타').trim().slice(0, 40),
    name: String(l.name || '').trim().slice(0, 120),
    spec: String(l.spec || '').trim().slice(0, 120),
    qty: Number.isFinite(qty) ? Math.max(qty, 0) : 0,
    unit_price: Number.isFinite(price) ? Math.max(Math.round(price), 0) : 0,
    note: String(l.note || '').trim().slice(0, 120),
    link: cleanLink(l.link),
    sort_order: i + 1,
  }
}

/**
 * 새 발주서.
 * seed = 'blank' → 빈 발주서, <발주서 id> → 그 발주서 품목을 그대로 복사
 * (다음 매장 오픈 때 지난 발주를 복사해 수량만 고치면 된다)
 */
export async function createEquipOrder(
  _prev: EquipResult | null,
  formData: FormData
): Promise<EquipResult> {
  const { supabase, userId } = await assertOwner()
  const header = readHeader(formData)
  if (!header.title) return { ok: false, message: '발주서 이름을 입력해주세요.' }
  const seed = String(formData.get('seed') ?? 'blank')

  // 쿠팡 발주를 복사하면 '부가세 포함' 설정도 따라온다
  if (seed !== 'blank' && !header.vat_included) {
    const { data: src } = await supabase
      .from('equip_orders')
      .select('vat_included')
      .eq('id', seed)
      .maybeSingle()
    if (src?.vat_included) header.vat_included = true
  }

  const { data: created, error } = await supabase
    .from('equip_orders')
    .insert({ ...header, kind: readKind(formData), created_by: userId })
    .select('id')
    .single()
  if (error || !created) {
    return { ok: false, message: `생성 실패: ${error?.message ?? '알 수 없음'}` }
  }

  if (seed !== 'blank') {
    const { data: src } = await supabase
      .from('equip_order_items')
      .select('*')
      .eq('order_id', seed)
      .order('sort_order', { ascending: true })
    const rows = (src ?? []) as EquipItem[]
    if (rows.length > 0) {
      await supabase
        .from('equip_order_items')
        .insert(rows.map((r, i) => ({ order_id: created.id, ...cleanLine(r, i) })))
    }
  }

  revalidatePath('/executive')
  return { ok: true, message: '발주서를 만들었습니다.', id: created.id }
}

/** 엑셀로 읽은 품목으로 새 발주서를 만든다 */
export async function importEquipOrder(input: {
  title: string
  vendor: string
  quote_date: string
  open_checklist_id: string
  memo: string
  vat_included: boolean
  kind: EquipOrderKind
  lines: EquipLine[]
}): Promise<EquipResult> {
  const { supabase, userId } = await assertOwner()
  const fd = new FormData()
  Object.entries(input).forEach(([k, v]) => {
    if (typeof v === 'string') fd.set(k, v)
  })
  if (input.vat_included) fd.set('vat_included', 'on')
  const header = readHeader(fd)
  if (!header.title) return { ok: false, message: '발주서 이름을 입력해주세요.' }
  const lines = (input.lines ?? []).filter((l) => String(l.name ?? '').trim()).slice(0, 2000)
  if (lines.length === 0) return { ok: false, message: '저장할 품목이 없습니다.' }

  const { data: created, error } = await supabase
    .from('equip_orders')
    .insert({ ...header, kind: readKind(fd), created_by: userId })
    .select('id')
    .single()
  if (error || !created) {
    return { ok: false, message: `생성 실패: ${error?.message ?? '알 수 없음'}` }
  }

  const { error: itemErr } = await supabase
    .from('equip_order_items')
    .insert(lines.map((l, i) => ({ order_id: created.id, ...cleanLine(l, i) })))
  if (itemErr) {
    await supabase.from('equip_orders').delete().eq('id', created.id)
    return { ok: false, message: `품목 저장 실패: ${itemErr.message}` }
  }

  revalidatePath('/executive')
  return { ok: true, message: `${lines.length}개 품목으로 발주서를 만들었습니다.`, id: created.id }
}

/** 발주서 머리(이름·업체·작성일·상태·메모) 수정 */
export async function saveEquipOrder(
  _prev: EquipResult | null,
  formData: FormData
): Promise<EquipResult> {
  const { supabase } = await assertOwner()
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: '대상을 찾을 수 없습니다.' }
  const header = readHeader(formData)
  if (!header.title) return { ok: false, message: '발주서 이름을 입력해주세요.' }
  const rawStatus = String(formData.get('status') ?? '') as EquipOrderStatus

  const { error } = await supabase
    .from('equip_orders')
    .update({
      ...header,
      status: STATUS_VALUES.includes(rawStatus) ? rawStatus : 'quote',
    })
    .eq('id', id)
  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/executive')
  return { ok: true, message: '수정되었습니다.' }
}

export async function deleteEquipOrder(formData: FormData): Promise<void> {
  const { supabase } = await assertOwner()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  // 품목은 on delete cascade
  await supabase.from('equip_orders').delete().eq('id', id)
  revalidatePath('/executive')
}

function readItem(formData: FormData): Omit<ReturnType<typeof cleanLine>, 'sort_order'> {
  const num = (k: string) => Number(String(formData.get(k) ?? '').replace(/[^0-9.]/g, ''))
  const { sort_order: _ignored, ...rest } = cleanLine(
    {
      section: String(formData.get('section') ?? ''),
      name: String(formData.get('name') ?? ''),
      spec: String(formData.get('spec') ?? ''),
      qty: num('qty'),
      unit_price: num('unit_price'),
      note: String(formData.get('note') ?? ''),
      link: String(formData.get('link') ?? ''),
    },
    0
  )
  return rest
}

/** 주문함 체크 — 쿠팡에서 담을 때마다 하나씩 체크한다 */
export async function toggleEquipItem(formData: FormData): Promise<void> {
  const { supabase } = await assertOwner()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase
    .from('equip_order_items')
    .update({ checked: String(formData.get('checked') ?? '') === 'true' })
    .eq('id', id)
  revalidatePath('/executive')
}

/** 이 발주서의 주문함 체크를 모두 지운다 (다음 매장 오픈 때 다시 쓰려고) */
export async function resetEquipChecks(formData: FormData): Promise<void> {
  const { supabase } = await assertOwner()
  const orderId = String(formData.get('order_id') ?? '')
  if (!orderId) return
  await supabase.from('equip_order_items').update({ checked: false }).eq('order_id', orderId)
  revalidatePath('/executive')
}

export async function addEquipItem(formData: FormData): Promise<void> {
  const { supabase } = await assertOwner()
  const orderId = String(formData.get('order_id') ?? '')
  const fields = readItem(formData)
  if (!orderId || !fields.name) return

  const { data: last } = await supabase
    .from('equip_order_items')
    .select('sort_order')
    .eq('order_id', orderId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase.from('equip_order_items').insert({
    order_id: orderId,
    ...fields,
    sort_order: (last?.sort_order ?? 0) + 1,
  })
  revalidatePath('/executive')
}

export async function saveEquipItem(formData: FormData): Promise<void> {
  const { supabase } = await assertOwner()
  const id = String(formData.get('id') ?? '')
  const fields = readItem(formData)
  if (!id || !fields.name) return
  await supabase.from('equip_order_items').update(fields).eq('id', id)
  revalidatePath('/executive')
}

export async function deleteEquipItem(formData: FormData): Promise<void> {
  const { supabase } = await assertOwner()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('equip_order_items').delete().eq('id', id)
  revalidatePath('/executive')
}
