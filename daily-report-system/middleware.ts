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
     *
     * manifest.webmanifest / sw.js 도 반드시 제외해야 한다. 이걸 미들웨어에
     * 태우면 비로그인 상태(로그인 화면)에서 로그인으로 리다이렉트돼,
     * 크롬이 매니페스트를 못 읽고 "설치 가능"으로 인식하지 못한다.
     * (= 네이티브 설치창이 안 뜨고 안내창만 뜨는 원인)
     */
    '/((?!_next/static|_next/image|favicon.ico|logos|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
