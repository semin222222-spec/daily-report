'use server'

import { revalidatePath } from 'next/cache'
import { canWriteStore, getSessionContext } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'

/**
 * 스케줄 칸 하나 저장.
 * code가 빈 문자열이면 행을 지운다(빈칸으로 되돌리기).
 *
 * 화면에서 칸을 연타하며 채우기 때문에 revalidate를 걸지 않는다.
 * 클라이언트가 낙관적으로 먼저 그리고, 저장은 뒤에서 따라간다.
 */
export async function setShift(
  staffId: string,
  date: string,
  code: string
): Promise<{ ok: boolean; message?: string }> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id)) {
    return { ok: false, message: '권한이 없습니다.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: '날짜가 올바르지 않습니다.' }
  }

  const supabase = createClient()

  // 이 직원이 정말 현재 매장 소속인지 확인한다.
  // (RLS가 최종 방어선이지만 엉뚱한 매장 직원의 칸을 만들지 않도록 먼저 막는다)
  const { data: staff } = await supabase
    .from('staff')
    .select('store_id')
    .eq('id', staffId)
    .maybeSingle()

  if (!staff || staff.store_id !== activeStore.id) {
    return { ok: false, message: '직원을 찾을 수 없습니다.' }
  }

  if (!code) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('staff_id', staffId)
      .eq('date', date)
    return error ? { ok: false, message: error.message } : { ok: true }
  }

  const { error } = await supabase.from('shifts').upsert(
    {
      store_id: activeStore.id,
      staff_id: staffId,
      date,
      code: code.slice(0, 12),
    },
    { onConflict: 'staff_id,date' }
  )

  return error ? { ok: false, message: error.message } : { ok: true }
}

/**
 * 날짜별 특이사항 · 공휴일 지정.
 *
 * 넘어온 필드만 갱신한다. 특이사항을 저장할 때 공휴일 표시가 풀리면 안 되므로
 * 기존 행을 먼저 읽어 병합한다.
 */
export async function setScheduleDay(
  date: string,
  patch: { note?: string; is_holiday?: boolean; holiday_name?: string }
): Promise<{ ok: boolean; message?: string }> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id)) {
    return { ok: false, message: '권한이 없습니다.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: '날짜가 올바르지 않습니다.' }
  }

  const supabase = createClient()

  const { data: existing } = await supabase
    .from('schedule_days')
    .select('note, is_holiday, holiday_name')
    .eq('store_id', activeStore.id)
    .eq('date', date)
    .maybeSingle()

  const { error } = await supabase.from('schedule_days').upsert(
    {
      store_id: activeStore.id,
      date,
      note: (patch.note ?? existing?.note ?? '').slice(0, 300),
      is_holiday: patch.is_holiday ?? existing?.is_holiday ?? false,
      holiday_name: (patch.holiday_name ?? existing?.holiday_name ?? '').slice(0, 40),
    },
    { onConflict: 'store_id,date' }
  )

  return error ? { ok: false, message: error.message } : { ok: true }
}

/** 스케줄 화면에서 바로 직원 추가 — 인건비 화면까지 안 가도 되게 */
export async function addScheduleStaff(
  formData: FormData
): Promise<void> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id)) return

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const empType = String(formData.get('emp_type') ?? '직원')
  const position = String(formData.get('position') ?? '').trim()

  const supabase = createClient()
  await supabase.from('staff').insert({
    store_id: activeStore.id,
    name,
    position,
    emp_type: empType === '알바' ? '알바' : '직원',
    // 급여는 인건비 화면에서 달마다 따로 적는다. 여기서는 스케줄에 세우는 게 목적.
    pay_type: empType === '알바' ? 'hourly' : 'monthly',
    rate: 0,
    work_hours: 0,
  })

  revalidatePath('/schedule')
  revalidatePath('/labor')
}

/** 명단에서 내리기 (기록은 남기고 스케줄·보건증 목록에서만 제외) */
export async function removeScheduleStaff(formData: FormData): Promise<void> {
  const { profile, activeStore } = await getSessionContext()
  const id = String(formData.get('id') ?? '')
  if (!id || !canWriteStore(profile, activeStore.id)) return

  const supabase = createClient()
  await supabase
    .from('staff')
    .update({ is_active: false })
    .eq('id', id)
    .eq('store_id', activeStore.id)

  revalidatePath('/schedule')
  revalidatePath('/labor')
}

/** 보건증 발급일 저장 */
export async function setHealthCert(
  staffId: string,
  issued: string | null,
  memo: string
): Promise<{ ok: boolean; message?: string }> {
  const { profile, activeStore } = await getSessionContext()
  if (!canWriteStore(profile, activeStore.id)) {
    return { ok: false, message: '권한이 없습니다.' }
  }
  if (issued && !/^\d{4}-\d{2}-\d{2}$/.test(issued)) {
    return { ok: false, message: '날짜 형식이 올바르지 않습니다.' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('staff')
    .update({
      health_cert_issued: issued || null,
      health_cert_memo: memo.slice(0, 200),
    })
    .eq('id', staffId)
    .eq('store_id', activeStore.id)

  if (error) return { ok: false, message: error.message }

  revalidatePath('/labor')
  return { ok: true }
}
