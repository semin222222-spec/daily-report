import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookiesToSet = Array<{ name: string; value: string; options: CookieOptions }>

/** 로그인 없이 접근 가능한 경로 */
const PUBLIC_PATHS = ['/login', '/api/reviews']

/**
 * 매 요청마다 세션 토큰을 갱신하고, 미인증 사용자를 /login으로 돌린다.
 * 토큰 갱신을 미들웨어에서 처리해야 서버 컴포넌트가 만료된 세션을 보지 않는다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser()는 토큰을 실제로 검증한다. getSession()과 달리 위조가 불가능하므로
  // 인가 판단에는 반드시 이쪽을 쓴다.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}
