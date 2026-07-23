'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACTIVE_STORE_COOKIE, getSessionContext } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'

/**
 * owner의 매장 전환. 선택한 매장을 쿠키에 저장한다.
 * manager가 호출해도 세션 해석 단계(resolveActiveStore)에서 무시되므로 안전하다.
 */
export async function switchStore(storeId: string) {
  const { profile, stores } = await getSessionContext()

  if (profile.role !== 'owner') return
  if (!stores.some((s) => s.id === storeId)) return

  cookies().set(ACTIVE_STORE_COOKIE, storeId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath('/', 'layout')
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  cookies().delete(ACTIVE_STORE_COOKIE)
  redirect('/login')
}
