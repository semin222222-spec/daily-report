import { NextResponse, type NextRequest } from 'next/server'
import { ACTIVE_STORE_COOKIE } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 세션을 끊고 로그인 화면으로 보낸다.
 *
 * 왜 라우트 핸들러인가:
 * 서버 컴포넌트에서 "프로필이 없다"고 판단해 바로 /login 으로 redirect 하면,
 * 미들웨어가 "세션은 살아있네" 하고 다시 /dashboard 로 되돌려 무한 루프가 난다
 * (화면이 하얗게 뜬다). 쿠키를 실제로 지울 수 있는 곳에서 세션을 끊어야
 * 루프가 끊긴다.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  await supabase.auth.signOut()

  const reason = request.nextUrl.searchParams.get('reason') ?? ''
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = reason ? `?error=${encodeURIComponent(reason)}` : ''

  const response = NextResponse.redirect(url)
  response.cookies.delete(ACTIVE_STORE_COOKIE)
  return response
}
