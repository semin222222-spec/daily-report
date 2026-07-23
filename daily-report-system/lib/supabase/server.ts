import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** setAll 콜백이 받는 쿠키 배열 — 라이브러리 타입이 유니온이라 추론이 안 돼서 명시한다 */
type CookiesToSet = Array<{ name: string; value: string; options: CookieOptions }>

/**
 * 서버 컴포넌트 / 서버 액션 / 라우트 핸들러용 Supabase 클라이언트.
 * RLS가 적용되므로 여기서 조회한 데이터는 이미 권한 필터링이 끝난 상태다.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서는 쿠키를 쓸 수 없다.
            // 세션 갱신은 middleware.ts가 담당하므로 무시해도 안전하다.
          }
        },
      },
    }
  )
}

/**
 * service_role 키를 쓰는 관리자 클라이언트 — RLS를 우회한다.
 * 리뷰 수집 엔드포인트, 계정 발급 등 서버 전용 경로에서만 사용할 것.
 */
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
