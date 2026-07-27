import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OWNER_FOLDERS } from '@/lib/owner-center'

export const dynamic = 'force-dynamic'

/**
 * 아직 내용이 없는 폴더(운영매뉴얼·레시피·디자인·교육)의 준비중 화면.
 * open-order 는 자체 라우트가 있으므로 여기로 오지 않는다.
 */
export default function OwnerFolderPage({
  params,
}: {
  params: { folder: string }
}) {
  const folder = OWNER_FOLDERS.find((f) => f.slug === params.folder)
  if (!folder || folder.slug === 'open-order') notFound()

  return (
    <>
      <div className="mb-4">
        <Link
          href="/owner-center"
          className="text-[13px] font-semibold text-muted hover:text-ink"
        >
          ← 점주센터
        </Link>
      </div>

      <div className="card text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-brand/[.08] text-[32px]">
          {folder.icon}
        </div>
        <h3 className="card-title !text-[17px]">
          {folder.no}. {folder.title}
        </h3>
        <p className="card-sub !mb-4">{folder.desc}</p>
        <span className="pill bg-line-soft text-muted">준비중</span>
        <p className="mx-auto mt-4 max-w-[360px] text-[12.5px] leading-relaxed text-muted">
          이 폴더는 자료가 준비되는 대로 채워집니다. 어떤 자료를 넣을지
          알려주시면 오픈 발주처럼 바로 만들어 드립니다.
        </p>
      </div>
    </>
  )
}
