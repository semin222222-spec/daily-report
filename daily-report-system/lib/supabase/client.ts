'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * 브라우저용 Supabase 클라이언트.
 * 세션은 쿠키에 저장되므로 서버 컴포넌트/미들웨어와 그대로 공유된다.
 * (구버전의 "새로고침하면 로그아웃" 문제가 여기서 해결된다.)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
