import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import type { Profile, SessionContext, Store } from './types'

export const ACTIVE_STORE_COOKIE = 'bbiddak_active_store'

/**
 * 로그인 사용자의 프로필 + 접근 가능한 매장 + 현재 선택된 매장을 한 번에 가져온다.
 * 앱 셸과 각 페이지가 공통으로 쓰는 진입점.
 *
 * 매장 목록은 RLS가 이미 걸러주므로(owner=전체, manager=본인 매장) 여기서
 * 별도 필터링을 하지 않는다. 즉 UI 버그가 나도 데이터는 새지 않는다.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  // 계정은 있는데 프로필이 없는 경우 — 시드/계정발급이 덜 된 상태.
  // /login 으로 바로 보내면 미들웨어가 다시 /dashboard 로 되돌려 무한 루프가 나므로,
  // 세션을 실제로 끊는 라우트를 거쳐야 한다.
  if (!profile) redirect('/auth/signout?reason=no-profile')

  const { data: storeRows } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const stores = (storeRows ?? []) as Store[]
  if (stores.length === 0) redirect('/auth/signout?reason=no-store')

  const activeStore = resolveActiveStore(profile, stores)

  return { profile, stores, activeStore }
}

/**
 * 현재 매장 결정 규칙:
 *   manager → 본인 매장 고정 (쿠키를 무시한다)
 *   owner   → 쿠키에 저장된 매장, 없거나 유효하지 않으면 첫 번째 매장
 */
function resolveActiveStore(profile: Profile, stores: Store[]): Store {
  if (profile.role === 'manager') {
    const own = stores.find((s) => s.id === profile.store_id)
    if (own) return own
  }

  const cookieStoreId = cookies().get(ACTIVE_STORE_COOKIE)?.value
  const picked = stores.find((s) => s.id === cookieStoreId)
  return picked ?? stores[0]
}

/** owner 전용 화면·액션에서 호출 — 점장이면 대시보드로 되돌린다 */
export function assertOwner(profile: Profile) {
  if (profile.role !== 'owner') redirect('/dashboard')
}

/**
 * 서버 액션에서 "이 매장에 쓸 권한이 있는가"를 확인한다.
 * RLS가 최종 방어선이지만, 여기서 먼저 걸러야 사용자에게 친절한 에러가 나간다.
 */
export function canWriteStore(profile: Profile, storeId: string): boolean {
  return profile.role === 'owner' || profile.store_id === storeId
}
