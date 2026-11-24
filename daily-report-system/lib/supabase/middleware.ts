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

  // getClaims()는 토큰 서명을 프로젝트 공개키(ES256, JWKS)로 검증한다 — 위조 불가.
  // 예전 getUser()는 페이지를 열 때마다 Supabase 인증 서버로 왕복을 보냈는데(느림),
  // getClaims()는 공개키를 한 번 받아 캐시한 뒤 서버 안에서 바로 검증한다.
  // 토큰이 만료됐으면 내부에서 갱신(그때만 네트워크)하고 쿠키도 새로 써 준다.
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims?.sub ? claimsData.claims : null

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
