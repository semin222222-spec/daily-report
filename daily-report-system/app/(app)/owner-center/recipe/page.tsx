import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/session'
import type { OcFile } from '@/lib/owner-center'
import { RECIPE_CATEGORIES, RECIPES, recipesByCategory } from '@/lib/recipes'
import { FileManager } from '../[folder]/FileManager'

export const dynamic = 'force-dynamic'

const RECIPE_FOLDER = 'recipe'

/** 03. 레시피 — 전체 메뉴를 카테고리별로 한 화면에 바로 보여준다 + 원본 파일 보관함 */
export default async function RecipeHome() {
  const { profile } = await getSessionContext()
  const isOwner = profile.role === 'owner'
  const supabase = createClient()

  const { data } = await supabase
    .from('oc_files')
    .select('*')
    .eq('folder', RECIPE_FOLDER)
    .order('created_at', { ascending: false })
  const files = (data ?? []) as OcFile[]

  const urls: Record<string, string> = {}
  const thumbs: Record<string, string> = {}
  if (files.length > 0) {
    const dl = await supabase.storage
      .from('owner-center')
      .createSignedUrls(files.map((f) => f.path), 60 * 60)
    dl.data?.forEach((s, i) => {
      if (s.signedUrl) urls[files[i].id] = s.signedUrl
    })

    const thumbTargets = files
      .map((f) => ({ id: f.id, path: f.preview_path || (isImageName(f.name) ? f.path : '') }))
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
            🍳
          </span>
          <div>
            <h2 className="text-[19px] font-extrabold">03. 레시피</h2>
            <p className="text-[12.5px] text-muted">
              메뉴별 조리 표준 레시피 · 총 <b className="text-ink-2">{RECIPES.length}개</b> 메뉴
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {RECIPE_CATEGORIES.map((c) => {
          const items = recipesByCategory(c.slug)
          if (items.length === 0) return null
          return (
            <div key={c.slug}>
              <h3 className="mb-2.5 text-[13.5px] font-bold text-ink-2">
                {c.no}. {c.name}
              </h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 shell:grid-cols-4">
                {items.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/owner-center/recipe/${c.slug}/${r.slug}`}
                    className="rounded-[12px] border border-line bg-surface px-3.5 py-3 text-[13.5px] font-semibold transition hover:border-brand hover:text-brand-deep hover:shadow-[0_8px_24px_rgba(240,84,45,.12)]"
                  >
                    {r.name}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <h3 className="mb-2.5 text-[13.5px] font-bold text-ink-2">원본 파일</h3>
        <FileManager
          folder={RECIPE_FOLDER}
          files={files}
          urls={urls}
          thumbs={thumbs}
          isOwner={isOwner}
        />
      </div>
    </>
  )
}

function isImageName(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)
}
