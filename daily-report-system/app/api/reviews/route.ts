import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * ─────────────────────────────────────────────────────────────
 * 리뷰 수집 엔드포인트 (확장 지점)
 * ─────────────────────────────────────────────────────────────
 * POST /api/reviews
 *   headers: { 'x-ingest-secret': REVIEW_INGEST_SECRET }
 *   body: { reviews: [{ store_tag, source, author, rating, text, posted_at, external_id }] }
 *
 * ▸ 이번 스코프에서 자동 크롤링은 구현하지 않는다.
 *   네이버 스마트플레이스·카카오 사장님 모두 새 리뷰를 외부로 푸시하는
 *   공식 API가 없기 때문이다.
 *
 * ▸ 나중에 크롤링 잡(Vercel Cron, GitHub Actions, 별도 워커 등)을 붙일 때
 *   그 잡이 이 엔드포인트로 POST 하기만 하면 된다. 앱 코드는 손댈 필요 없다.
 *
 * ▸ external_id 를 채워 보내면 (store_id, source, external_id) 유니크 제약이
 *   중복 수집을 막아준다. upsert 라 같은 리뷰를 여러 번 보내도 안전하다.
 */

interface IncomingReview {
  store_tag?: string
  store_id?: string
  source?: string
  author?: string
  rating?: number
  text?: string
  posted_at?: string
  external_id?: string
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVIEW_INGEST_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'REVIEW_INGEST_SECRET 이 설정되지 않았습니다.' },
      { status: 503 }
    )
  }

  if (request.headers.get('x-ingest-secret') !== secret) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  let body: { reviews?: IncomingReview[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON 형식이 아닙니다.' }, { status: 400 })
  }

  const incoming = body.reviews
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json(
      { error: 'reviews 배열이 필요합니다.' },
      { status: 400 }
    )
  }
  if (incoming.length > 500) {
    return NextResponse.json(
      { error: '한 번에 최대 500건까지 보낼 수 있습니다.' },
      { status: 400 }
    )
  }

  // RLS를 우회해야 하므로 service_role 클라이언트를 쓴다.
  // 위의 시크릿 검사가 이 경로의 유일한 방어선이다.
  const admin = createAdminClient()

  const { data: stores } = await admin.from('stores').select('id, tag')
  const byTag = new Map<string, string>(
    (stores ?? []).map((s: { id: string; tag: string }) => [s.tag, s.id])
  )
  const validIds = new Set<string>((stores ?? []).map((s: { id: string }) => s.id))

  const rows: Array<{
    store_id: string
    source: string
    author: string
    rating: number
    text: string
    posted_at: string
    external_id: string | null
    is_new: boolean
  }> = []
  const rejected: Array<{ index: number; reason: string }> = []

  incoming.forEach((r, i) => {
    const storeId = r.store_id ?? (r.store_tag ? byTag.get(r.store_tag) : undefined)
    if (!storeId || !validIds.has(storeId)) {
      rejected.push({ index: i, reason: `알 수 없는 매장: ${r.store_tag ?? r.store_id}` })
      return
    }
    if (r.source !== 'naver' && r.source !== 'kakao') {
      rejected.push({ index: i, reason: `source는 naver 또는 kakao여야 합니다.` })
      return
    }

    const rating = Number(r.rating)
    const postedAt = r.posted_at ? new Date(r.posted_at) : new Date()

    rows.push({
      store_id: storeId,
      source: r.source,
      author: String(r.author ?? '').slice(0, 60),
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 5,
      text: String(r.text ?? '').slice(0, 2000),
      posted_at: Number.isNaN(postedAt.getTime())
        ? new Date().toISOString()
        : postedAt.toISOString(),
      external_id: r.external_id ?? null,
      is_new: true,
    })
  })

  if (rows.length === 0) {
    return NextResponse.json(
      { inserted: 0, rejected },
      { status: rejected.length ? 400 : 200 }
    )
  }

  const { data, error } = await admin
    .from('reviews')
    .upsert(rows, {
      onConflict: 'store_id,source,external_id',
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    inserted: data?.length ?? 0,
    received: incoming.length,
    rejected,
  })
}
