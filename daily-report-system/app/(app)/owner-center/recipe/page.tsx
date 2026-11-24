import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { canEditOwnerCenter, getSessionContext } from '@/lib/session'
import { cachedThumbUrl, recipePhotoUrl, type OcFile } from '@/lib/owner-center'
import type { Recipe, RecipeCategory } from '@/lib/recipes'
import { FileManager } from '../[folder]/FileManager'
import { RecipeList } from './RecipeList'

export const dynamic = 'force-dynamic'

const RECIPE_FOLDER = 'recipe'
const BUCKET = 'owner-center'

/** 03. 레시피 — 전체 메뉴를 카테고리별로 한 화면에 바로 보여준다 + 원본 파일 보관함 */
export default async function RecipeHome() {
  const { profile } = await getSessionContext()
  const isOwner = canEditOwnerCenter(profile)
  const supabase = createClient()

  const [catRes, recipeRes, fileRes] = await Promise.all([
    supabase.from('recipe_categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('recipes').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('oc_files')
      .select('*')
      .eq('folder', RECIPE_FOLDER)
      .order('created_at', { ascending: false }),
  ])

  const categories = (catRes.data ?? []) as RecipeCategory[]
  const recipes = (recipeRes.data ?? []) as Recipe[]
  const files = (fileRes.data ?? []) as OcFile[]

  // 레시피 사진: 원본(0.5~3MB) 대신 줄인 사진의 고정 주소 → 브라우저가 기억해 두 번째부터 즉시.
  // thumbs = 목록용(작게), photos = 인쇄용(크게)
  const thumbs: Record<string, string> = {}
  const photos: Record<string, string> = {}
  for (const r of recipes) {
    if (!r.photo_path) continue
    thumbs[r.id] = recipePhotoUrl(r, 240)
    photos[r.id] = recipePhotoUrl(r, 900)
  }

  // 원본 파일함
  const urls: Record<string, string> = {}
  const fileThumbs: Record<string, string> = {}
  if (files.length > 0) {
    const dl = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(files.map((f) => f.path), 60 * 60)
    dl.data?.forEach((s, i) => {
      if (s.signedUrl) urls[files[i].id] = s.signedUrl
    })

    const signTargets: { id: string; path: string }[] = []
    for (const f of files) {
      const cached = cachedThumbUrl(f)
      if (cached) fileThumbs[f.id] = cached
      else if (isImageName(f.name)) signTargets.push({ id: f.id, path: f.path })
    }
    if (signTargets.length > 0) {
      const th = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(signTargets.map((t) => t.path), 60 * 60)
      th.data?.forEach((s, i) => {
        if (s.signedUrl) fileThumbs[signTargets[i].id] = s.signedUrl
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
              메뉴별 조리 표준 레시피 · 총 <b className="text-ink-2">{recipes.length}개</b> 메뉴
            </p>
          </div>
        </div>
      </div>

      <RecipeList
        categories={categories}
        recipes={recipes}
        thumbs={thumbs}
        photos={photos}
        isOwner={isOwner}
      />

      <div className="mt-6">
        <h3 className="mb-2.5 text-[13.5px] font-bold text-ink-2">원본 파일</h3>
        <FileManager
          folder={RECIPE_FOLDER}
          files={files}
          urls={urls}
          thumbs={fileThumbs}
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
