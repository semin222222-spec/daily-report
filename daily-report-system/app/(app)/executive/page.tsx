import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'
import { todayKST } from '@/lib/format'
import { guardMenu } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import type { OcFile } from '@/lib/owner-center'
import type { MeetingNote, OpenChecklist, OpenTask } from '@/lib/types'
import { ExecutiveTabs } from './ExecutiveTabs'

export const dynamic = 'force-dynamic'

const FOLDER = 'executive'

/** 임원전용 — 기본은 모든 점장에게 숨김. 오너가 계정마다 권한을 열어준다. */
export default async function ExecutivePage() {
  // 숨김 권한이면 여기서 대시보드로 되돌려진다
  const { profile, readOnly } = await guardMenu('/executive')
  const isOwner = profile.role === 'owner'
  const supabase = createClient()

  const [fileRes, noteRes, listRes, taskRes] = await Promise.all([
    supabase
      .from('oc_files')
      .select('*')
      .eq('folder', FOLDER)
      .order('created_at', { ascending: false }),
    supabase
      .from('meeting_notes')
      .select('*')
      .order('meeting_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('open_checklists')
      .select('*')
      .order('created_at', { ascending: false }),
    // 오픈 건이 많아야 몇 건이라 항목을 한 번에 받아 화면에서 골라 쓴다
    supabase
      .from('open_checklist_tasks')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])
  const files = (fileRes.data ?? []) as OcFile[]
  const notes = (noteRes.data ?? []) as MeetingNote[]
  const openLists = (listRes.data ?? []) as OpenChecklist[]
  const openTasks = (taskRes.data ?? []) as OpenTask[]

  // 원본 다운로드 URL + 썸네일 URL (이미지 원본 또는 AI·PDF 미리보기)
  const urls: Record<string, string> = {}
  const thumbs: Record<string, string> = {}
  if (files.length > 0) {
    const dl = await supabase.storage
      .from('owner-center')
      .createSignedUrls(files.map((f) => f.path), 60 * 60)
    dl.data?.forEach((s, i) => {
      if (s.signedUrl) urls[files[i].id] = s.signedUrl
    })

    const isImg = (n: string) =>
      ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(
        n.split('.').pop()?.toLowerCase() ?? ''
      )
    const targets = files
      .map((f) => ({
        id: f.id,
        path: f.preview_path || (isImg(f.name) ? f.path : ''),
      }))
      .filter((t) => t.path)
    if (targets.length > 0) {
      const th = await supabase.storage
        .from('owner-center')
        .createSignedUrls(targets.map((t) => t.path), 60 * 60)
      th.data?.forEach((s, i) => {
        if (s.signedUrl) thumbs[targets[i].id] = s.signedUrl
      })
    }
  }

  return (
    <>
      {readOnly && <ReadOnlyBanner />}

      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[.08] text-[22px]">
          👔
        </span>
        <div>
          <h2 className="text-[19px] font-extrabold">임원전용</h2>
          <p className="text-[12.5px] text-muted">
            임원 전용 자료입니다. 권한을 받은 계정만 볼 수 있습니다.
          </p>
        </div>
      </div>

      <ExecutiveTabs
        files={files}
        urls={urls}
        thumbs={thumbs}
        notes={notes}
        openLists={openLists}
        openTasks={openTasks}
        today={todayKST()}
        isOwner={isOwner}
      />
    </>
  )
}
