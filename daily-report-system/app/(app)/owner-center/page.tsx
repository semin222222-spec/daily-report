import Link from 'next/link'
import { OWNER_FOLDERS } from '@/lib/owner-center'

export const dynamic = 'force-dynamic'

/** 점주센터 첫 화면 — 5개 폴더 */
export default function OwnerCenterHome() {
  return (
    <>
      <div className="mb-4">
        <h2 className="text-[19px] font-extrabold">삐딱 점주센터</h2>
        <p className="mt-1 text-[13px] text-muted">
          오픈 준비부터 운영·레시피·교육까지, 점주에게 필요한 자료를 한곳에
          모았습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OWNER_FOLDERS.map((f) => (
          <Link key={f.slug} href={`/owner-center/${f.slug}`}>
            <div className="card h-full transition hover:border-brand hover:shadow-[0_8px_24px_rgba(240,84,45,.12)]">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/[.08] text-[24px]">
                  {f.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted">
                      {f.no}
                    </span>
                    <h3 className="text-[15.5px] font-bold">{f.title}</h3>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                    {f.desc}
                  </p>
                </div>
                <span className="self-center text-muted">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
