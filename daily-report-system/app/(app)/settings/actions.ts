'use server'

import { revalidatePath } from 'next/cache'
import { getSessionContext } from '@/lib/session'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export interface ActionResult {
  ok: boolean
  message: string
}

function toInt(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? Math.round(n) : 0
}

function toNum(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** 고정비 저장 (오너 전용 — RLS에서도 한 번 더 막힌다) */
export async function saveFixedCosts(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()
  if (profile.role !== 'owner') {
    return { ok: false, message: '고정비는 오너만 수정할 수 있습니다.' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('fixed_costs').upsert(
    {
      store_id: activeStore.id,
      rent: toInt(formData.get('rent')),
      mgmt: toInt(formData.get('mgmt')),
      utility: toInt(formData.get('utility')),
      insurance_etc: toInt(formData.get('insurance_etc')),
    },
    { onConflict: 'store_id' }
  )

  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true, message: '고정비가 저장되었습니다.' }
}

/** 목표·기준 저장 (오너 전용) */
export async function saveStoreSettings(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile, activeStore } = await getSessionContext()
  if (profile.role !== 'owner') {
    return { ok: false, message: '목표 설정은 오너만 수정할 수 있습니다.' }
  }

  const businessDays = toInt(formData.get('business_days'))
  if (businessDays < 1 || businessDays > 31) {
    return { ok: false, message: '영업일수는 1~31 사이여야 합니다.' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('store_settings').upsert(
    {
      store_id: activeStore.id,
      monthly_goal: toInt(formData.get('monthly_goal')),
      target_cost_rate: toNum(formData.get('target_cost_rate')),
      target_labor_rate: toNum(formData.get('target_labor_rate')),
      business_days: businessDays,
    },
    { onConflict: 'store_id' }
  )

  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true, message: '목표·기준이 저장되었습니다.' }
}

/** 매장 추가 (오너 전용) — 고정비·설정 행은 DB 트리거가 자동 생성한다 */
export async function createStore(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await getSessionContext()
  if (profile.role !== 'owner') {
    return { ok: false, message: '매장 추가는 오너만 가능합니다.' }
  }

  const name = String(formData.get('name') ?? '').trim()
  const tag = String(formData.get('tag') ?? '').trim().toLowerCase()

  if (!name) return { ok: false, message: '매장 이름을 입력해주세요.' }
  if (!/^[a-z0-9-]{2,20}$/.test(tag)) {
    return {
      ok: false,
      message: '태그는 영문 소문자·숫자·하이픈 2~20자여야 합니다. (예: ssuk)',
    }
  }

  const supabase = createClient()
  const { count } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })

  const { error } = await supabase.from('stores').insert({
    name,
    branch: String(formData.get('branch') ?? '').trim().slice(0, 40),
    tag,
    color: String(formData.get('color') ?? '#f0542d'),
    badge: String(formData.get('badge') ?? name[0]).slice(0, 2),
    kind: 'franchise',
    sort_order: (count ?? 0) + 1,
  })

  if (error) {
    const dup = error.message.includes('duplicate')
    return {
      ok: false,
      message: dup ? `이미 쓰고 있는 태그입니다: ${tag}` : `추가 실패: ${error.message}`,
    }
  }

  revalidatePath('/', 'layout')
  return {
    ok: true,
    message: `${name} 매장을 추가했습니다. /public/logos/${tag}.png 로 로고를 넣으면 자동 반영됩니다.`,
  }
}

/**
 * 점장 계정 발급 (오너 전용).
 *
 * Supabase Auth는 이메일이 필요하므로 <아이디>@<도메인> 합성 이메일로 만든다.
 * service_role 키가 필요해서 admin 클라이언트를 쓴다 — 서버에서만 실행된다.
 */
export async function createManagerAccount(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await getSessionContext()
  if (profile.role !== 'owner') {
    return { ok: false, message: '계정 발급은 오너만 가능합니다.' }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      message:
        '환경변수 SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않아 계정을 만들 수 없습니다.',
    }
  }

  const loginId = String(formData.get('login_id') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim()
  const storeId = String(formData.get('store_id') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!/^[a-z0-9._-]{3,24}$/.test(loginId)) {
    return { ok: false, message: '아이디는 영문 소문자·숫자 3~24자여야 합니다.' }
  }
  if (!name) return { ok: false, message: '이름을 입력해주세요.' }
  if (!storeId) return { ok: false, message: '매장을 선택해주세요.' }
  if (password.length < 8) {
    return { ok: false, message: '초기 비밀번호는 8자 이상으로 정해주세요.' }
  }

  const domain = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN || 'bbiddak.com'
  const email = `${loginId}@${domain}`

  const admin = createAdminClient()
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // 아이디 로그인이라 확인 메일을 보내지 않는다
  })

  if (authError) {
    return { ok: false, message: `계정 생성 실패: ${authError.message}` }
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    login_id: loginId,
    name,
    role: 'manager',
    store_id: storeId,
  })

  if (profileError) {
    // 프로필이 없으면 로그인해도 앱에 못 들어가므로 방금 만든 계정을 되돌린다
    await admin.auth.admin.deleteUser(created.user.id)
    return { ok: false, message: `프로필 생성 실패: ${profileError.message}` }
  }

  revalidatePath('/', 'layout')
  return {
    ok: true,
    message: `${name} 점장 계정(${loginId})을 발급했습니다. 초기 비밀번호를 본인에게 전달해주세요.`,
  }
}

/**
 * 점장 계정 삭제 (오너 전용).
 *
 * auth.users 를 지우면 profiles 는 on delete cascade 로 함께 사라진다.
 * 그 점장이 입력한 마감·할일 기록은 created_by 가 null 이 될 뿐 그대로 남는다
 * (과거 정산 숫자가 바뀌면 안 되므로).
 */
export async function deleteManagerAccount(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await getSessionContext()
  if (profile.role !== 'owner') {
    return { ok: false, message: '계정 삭제는 오너만 가능합니다.' }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      message:
        'SUPABASE_SERVICE_ROLE_KEY 가 없어 계정을 삭제할 수 없습니다. .env.local 에 키를 넣어주세요.',
    }
  }

  const targetId = String(formData.get('user_id') ?? '')
  if (!targetId) return { ok: false, message: '삭제할 계정을 찾지 못했습니다.' }

  // 자기 자신을 지우면 앱에서 영영 나가게 된다
  if (targetId === profile.id) {
    return { ok: false, message: '본인 계정은 삭제할 수 없습니다.' }
  }

  const admin = createAdminClient()

  // 다른 오너를 실수로 지우지 못하게 한 번 더 확인한다
  const { data: target } = await admin
    .from('profiles')
    .select('login_id, name, role')
    .eq('id', targetId)
    .maybeSingle()

  if (!target) return { ok: false, message: '이미 삭제된 계정입니다.' }
  if (target.role === 'owner') {
    return { ok: false, message: '오너 계정은 이 화면에서 삭제할 수 없습니다.' }
  }

  const { error } = await admin.auth.admin.deleteUser(targetId)
  if (error) return { ok: false, message: `삭제 실패: ${error.message}` }

  revalidatePath('/', 'layout')
  return {
    ok: true,
    message: `${target.name}(${target.login_id}) 계정을 삭제했습니다.`,
  }
}

/**
 * 점장 비밀번호 재설정 (오너 전용).
 * 점장이 비밀번호를 잊었을 때 오너가 새로 정해서 알려주는 용도.
 */
export async function resetManagerPassword(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await getSessionContext()
  if (profile.role !== 'owner') {
    return { ok: false, message: '비밀번호 재설정은 오너만 가능합니다.' }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      message: 'SUPABASE_SERVICE_ROLE_KEY 가 없어 비밀번호를 바꿀 수 없습니다.',
    }
  }

  const targetId = String(formData.get('user_id') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!targetId) return { ok: false, message: '대상 계정을 찾지 못했습니다.' }
  if (password.length < 8) {
    return { ok: false, message: '새 비밀번호는 8자 이상이어야 합니다.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(targetId, { password })
  if (error) return { ok: false, message: `변경 실패: ${error.message}` }

  return { ok: true, message: '비밀번호를 변경했습니다. 본인에게 전달해주세요.' }
}

/** 매장 정보 수정 (오너 전용) — 이름·지점명·배지·컬러 */
export async function updateStore(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await getSessionContext()
  if (profile.role !== 'owner') {
    return { ok: false, message: '매장 수정은 오너만 가능합니다.' }
  }

  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  if (!id) return { ok: false, message: '매장을 찾지 못했습니다.' }
  if (!name) return { ok: false, message: '매장 이름을 입력해주세요.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('stores')
    .update({
      name,
      branch: String(formData.get('branch') ?? '').trim().slice(0, 40),
      badge: String(formData.get('badge') ?? name[0]).slice(0, 2),
      color: String(formData.get('color') ?? '#f0542d'),
    })
    .eq('id', id)

  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true, message: `${name} 정보를 저장했습니다.` }
}

/**
 * 매장 비활성화 / 복구 (오너 전용).
 *
 * 삭제가 아니라 숨김이다. 매장을 진짜 지우면 그 매장의 마감·정산·스케줄이
 * 전부 함께 사라지기 때문에, 목록에서만 빼고 데이터는 남긴다.
 * 복구하면 그대로 다시 나타난다.
 */
export async function setStoreActive(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { profile } = await getSessionContext()
  if (profile.role !== 'owner') {
    return { ok: false, message: '매장 관리는 오너만 가능합니다.' }
  }

  const id = String(formData.get('id') ?? '')
  const active = String(formData.get('active') ?? '') === 'true'
  if (!id) return { ok: false, message: '매장을 찾지 못했습니다.' }

  const supabase = createClient()

  // 마지막 남은 매장까지 내리면 앱에 들어갈 매장이 없어져 로그인이 막힌다
  if (!active) {
    const { count } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        message: '마지막 매장은 비활성화할 수 없습니다. 최소 한 곳은 있어야 합니다.',
      }
    }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('name')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('stores')
    .update({ is_active: active })
    .eq('id', id)

  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/', 'layout')
  return {
    ok: true,
    message: active
      ? `${store?.name ?? '매장'}을(를) 다시 활성화했습니다.`
      : `${store?.name ?? '매장'}을(를) 비활성화했습니다. 기록은 그대로 남아 있습니다.`,
  }
}
