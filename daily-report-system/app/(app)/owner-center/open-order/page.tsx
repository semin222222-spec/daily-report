import Link from 'next/link'
import { OPEN_ORDER, OPEN_ORDER_TOTAL } from '@/lib/owner-center'

export const dynamic = 'force-dynamic'

/** 01. 오픈 발주 — 카테고리 목록 */
export default function OpenOrderHome() {
  return (
    <>
      <div className="mb-4">
        <div className="text-[12px] font-bold text-muted">01. 오픈 발주</div>
        <h2 className="mt-0.5 text-[19px] font-extrabold">📦 오픈 발주 체크리스트</h2>
        <p className="mt-1 text-[13px] text-muted">
          신규 오픈 시 카테고리별로 준비할 품목입니다. 총{' '}
          <b className="text-ink-2">{OPEN_ORDER_TOTAL}개</b> 품목 ·{' '}
          {OPEN_ORDER.length}개 카테고리
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 shell:grid-cols-3">
        {OPEN_ORDER.map((c) => (
          <Link key={c.slug} href={`/owner-center/open-order/${c.slug}`}>
            <div className="card h-full transition hover:border-brand hover:shadow-[0_8px_24px_rgba(240,84,45,.12)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted">
                  {c.no}
                </span>
                <span className="text-muted">→</span>
              </div>
              <h3 className="mt-1 text-[15px] font-bold">{c.name}</h3>
              <p className="mt-1 text-[12.5px] text-ink-2">
                {c.items.length}개 품목
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
