import { relativeTime } from '@/lib/format'
import { getReviews } from '@/lib/queries'
import { getSessionContext } from '@/lib/session'
import { AddReviewForm } from './AddReviewForm'
import { markReviewsSeen } from './actions'

export const dynamic = 'force-dynamic'

/** 별점 → ★★★★☆ (반개는 올림해서 표시) */
function stars(rating: number): string {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full))
}

export default async function ReviewsPage() {
  const { activeStore } = await getSessionContext()
  const reviews = await getReviews(activeStore.id)

  const newCount = reviews.filter((r) => r.is_new).length
  const avg =
    reviews.length > 0
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : 0

  return (
    <>
      {/* ── 요약 ─────────────────────────────────── */}
      <div
        className="card border-brand/25"
        style={{
          background:
            'linear-gradient(180deg, rgba(240,84,45,.05), transparent)',
        }}
      >
        <h3 className="card-title">🔔 리뷰 알림</h3>
        <p className="card-sub !mb-3">
          네이버·카카오 스마트플레이스에 달린 리뷰를 여기에 모아 봅니다.{' '}
          <b className="text-brand-deep">새 리뷰 {newCount}건</b>
        </p>

        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <span>
            평균 별점 <b>{avg.toFixed(1)}</b> / 5.0
          </span>
          <span className="text-muted">총 리뷰 {reviews.length}건</span>
          {newCount > 0 && (
            <form action={markReviewsSeen} className="ml-auto">
              <button
                type="submit"
                className="btn-ghost !px-3 !py-1.5 !text-xs"
              >
                모두 확인 처리
              </button>
            </form>
          )}
        </div>

        <p className="mt-3 border-t border-line-soft pt-3 text-[12px] leading-relaxed text-muted">
          네이버·카카오는 새 리뷰를 외부로 보내주는 공식 API가 없습니다. 실시간
          알림은 스마트플레이스·사장님 앱의 기본 알림을 그대로 쓰시고, 이 화면은
          세 매장 리뷰를 한곳에 모아 보는 용도로 쓰시면 됩니다.
        </p>
      </div>

      {/* ── 목록 ─────────────────────────────────── */}
      <div className="card mt-4">
        <h3 className="card-title">{activeStore.name} 최근 리뷰</h3>
        <p className="card-sub">네이버지도 · 카카오맵</p>

        {reviews.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            아직 등록된 리뷰가 없습니다.
          </p>
        )}

        {reviews.map((r) => (
          <div
            key={r.id}
            className="flex gap-3 border-b border-line-soft px-1 py-[15px] last:border-b-0"
          >
            <div
              className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] text-[11px] font-extrabold ${
                r.source === 'naver'
                  ? 'bg-[#03c75a] text-white'
                  : 'bg-[#ffe812] text-[#3a1d1d]'
              }`}
              title={r.source === 'naver' ? '네이버지도' : '카카오맵'}
            >
              {r.source === 'naver' ? 'N' : 'K'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                <span className="tracking-[1px] text-warn">
                  {stars(r.rating)}
                </span>
                {r.author && <span>{r.author}</span>}
                <span>· {relativeTime(r.posted_at)}</span>
                {r.is_new && (
                  <span className="rounded-full bg-brand px-[7px] py-0.5 text-[10px] font-extrabold text-white">
                    NEW
                  </span>
                )}
              </div>
              <p className="mt-[5px] whitespace-pre-wrap text-sm leading-relaxed">
                {r.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 수동 추가 ────────────────────────────── */}
      <div className="card mt-4">
        <AddReviewForm />
      </div>
    </>
  )
}
