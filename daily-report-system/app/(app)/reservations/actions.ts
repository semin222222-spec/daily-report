'use server'

import { revalidatePath } from 'next/cache'
import { canWriteStore, getSessionContext } from '@/lib/session'
import { canEdit } from '@/lib/permissions'
import { RESERVATION_CHANNELS } from '@/lib/reservations'
import { createClient } from '@/lib/supabase/server'
import type { Profile, ReservationStatus } from '@/lib/types'

const STATUSES: ReservationStatus[] = ['booked', 'visited', 'noshow', 'canceled']

function canEditReservations(profile: Profile) {
  return canEdit(profile.role, profile.permissions, '/reservations')
}

/** 폼 값 → 저장할 컬럼. 추가·수정이 같은 규칙을 쓰도록 한곳에 모은다. */
function readFields(formData: FormData) {
  const rawTime = String(formData.get('time') ?? '').trim()
  const rawChannel = String(formData.get('channel') ?? '전화')
  const size = Number(String(formData.get('party_size') ?? '').replace(/[^0-9]/g, ''))
  const deposit = Number(String(formData.get('deposit') ?? '').replace(/[^0-9]/g, ''))

  return {
    time: /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : '',
    name: String(formData.get('name') ?? '').trim().slice(0, 40),
    phone: String(formData.get('phone') ?? '').trim().slice(0, 30),
    party_size: Number.isFinite(size) ? Math.min(Math.max(size, 0), 999) : 0,
    channel: (RESERVATION_CHANNELS as readonly string[]).includes(rawChannel)
      ? rawChannel
      : '기타',
    deposit: Number.isFinite(deposit) ? Math.max(deposit, 0) : 0,
    memo: String(formData.get('memo') ?? '').trim().slice(0, 300),
  }
}

/** 이 예약이 지금 매장 것인지 확인 — 맞으면 supabase 클라이언트를 돌려준다 */
async function ownedReservation(id: string) {
  const { profile, activeStore } = await getSessionContext()
  if (!canEditReservations(profile) || !id) return null

  const supabase = createClient()
  const { data } = await supabase
    .from('reservations')
    .select('store_id')
    .eq('id', id)
    .maybeSingle()

  if (!data) return null
  if (!canWriteStore(profile, data.store_id) || data.store_id !== activeStore.id) {
    return null
  }
  return supabase
}

export async function addReservation(formData: FormData): Promise<void> {
  const { profile, activeStore } = await getSessionContext()
  if (!canEditReservations(profile)) return

  const rawDate = String(formData.get('date') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return

  const fields = readFields(formData)
  // 이름도 시간도 없으면 빈 줄이 쌓이기만 한다
  if (!fields.name && !fields.time) return

  const supabase = createClient()
  await supabase.from('reservations').insert({
    store_id: activeStore.id,
    date: rawDate,
    ...fields,
    created_by: profile.id,
  })

  revalidatePath('/reservations')
}

export async function updateReservation(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const supabase = await ownedReservation(id)
  if (!supabase) return

  const rawDate = String(formData.get('date') ?? '')
  const fields = readFields(formData)

  await supabase
    .from('reservations')
    .update({
      ...fields,
      // 날짜를 바꾸면 그날로 옮겨간다 (예약 변경)
      ...(/^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? { date: rawDate } : {}),
    })
    .eq('id', id)

  revalidatePath('/reservations')
}

/** 예약 → 방문완료 / 노쇼 / 취소 전환 */
export async function setReservationStatus(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const raw = String(formData.get('status') ?? '') as ReservationStatus
  if (!STATUSES.includes(raw)) return

  const supabase = await ownedReservation(id)
  if (!supabase) return

  await supabase.from('reservations').update({ status: raw }).eq('id', id)
  revalidatePath('/reservations')
}

export async function deleteReservation(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const supabase = await ownedReservation(id)
  if (!supabase) return

  await supabase.from('reservations').delete().eq('id', id)
  revalidatePath('/reservations')
}
