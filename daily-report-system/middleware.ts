import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 정적 자산을 제외한 모든 경로에서 세션을 갱신한다.
     * (_next, 이미지, favicon, /logos 는 제외)
     */
    '/((?!_next/static|_next/image|favicon.ico|logos|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
