import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/session'
import { ownerFolder, type OcFile } from '@/lib/owner-center'
import { FileManager } from './FileManager'

export const dynamic = 'force-dynamic'

/**
 * 자료 파일 폴더 (디자인·레시피·교육·운영매뉴얼).
 * open-order 는 자체 라우트가 있으므로 여기로 오지 않는다.
 */
export default async function OwnerFolderPage({
  params,
}: {
  params: { folder: string }
}) {
  const folder = ownerFolder(params.folder)
  if (!folder || folder.kind !== 'files') notFound()

  const { profile } = await getSessionContext()
  const isOwner = profile.role === 'owner'
  const supabase = createClient()

  const { data } = await supabase
    .from('oc_files')
    .select('*')
    .eq('folder', folder.slug)
    .order('created_at', { ascending: false })
  const files = (data ?? []) as OcFile[]

  // 비공개 버킷이라 파일마다 1시간짜리 서명 URL을 미리 만든다.
  // urls   = 원본 다운로드용
  // thumbs = 목록 썸네일용 (미리보기 PNG가 있으면 그것, 없으면 이미지 원본)
  const urls: Record<string, string> = {}
  const thumbs: Record<string, string> = {}
  if (files.length > 0) {
    const dl = await supabase.storage
      .from('owner-center')
      .createSignedUrls(files.map((f) => f.path), 60 * 60)
    dl.data?.forEach((s, i) => {
      if (s.signedUrl) urls[files[i].id] = s.signedUrl
    })

    // 썸네일로 쓸 경로: preview_path 우선, 없으면 이미지 원본
    const thumbTargets = files
      .map((f) => ({
        id: f.id,
        path: f.preview_path || (isImageName(f.name) ? f.path : ''),
      }))
      .filter((t) => t.path)
    if (thumbTargets.length > 0) {
      const th = await supabase.storage
        .from('owner-center')
        .createSignedUrls(thumbTargets.map((t) => t.path), 60 * 60)
      th.data?.forEach((s, i) => {
        if (s.signedUrl) thumbs[thumbTargets[i].id] = s.signedUrl
      })
    }
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/owner-center"
          className="text-[13px] font-semibold text-muted hover:text-ink"
        >
          ← 점주센터
        </Link>
        <div className="mt-1 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[.08] text-[22px]">
            {folder.icon}
          </span>
          <div>
            <h2 className="text-[19px] font-extrabold">
              {folder.no}. {folder.title}
            </h2>
            <p className="text-[12.5px] text-muted">{folder.desc}</p>
          </div>
        </div>
      </div>

      <FileManager
        folder={folder.slug}
        files={files}
        urls={urls}
        thumbs={thumbs}
        isOwner={isOwner}
      />
    </>
  )
}

/** 브라우저가 바로 그릴 수 있는 이미지 확장자 */
function isImageName(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)
}
