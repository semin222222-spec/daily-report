import { createClient } from '@/lib/supabase/server'
import type { OcCategory, OcItem } from '@/lib/owner-center'
import { CategoryList } from './CategoryList'

export const dynamic = 'force-dynamic'

/** 01. 오픈 발주 — 카테고리 목록 (DB) */
export default async function OpenOrderHome() {
  const supabase = createClient()

  const [catRes, itemRes] = await Promise.all([
    supabase
      .from('oc_categories')
      .select('*')
      .eq('folder', 'open-order')
      .order('sort_order', { ascending: true }),
    supabase.from('oc_items').select('id, category_id, status'),
  ])

  const categories = (catRes.data ?? []) as OcCategory[]
  const items = (itemRes.data ?? []) as Pick<
    OcItem,
    'id' | 'category_id' | 'status'
  >[]

  // 카테고리별 전체 품목 수 / 구매완료 수 — 카드 색을 정하는 데 쓴다
  const counts: Record<string, number> = {}
  const done: Record<string, number> = {}
  for (const it of items) {
    counts[it.category_id] = (counts[it.category_id] ?? 0) + 1
    if (it.status === '구매완료')
      done[it.category_id] = (done[it.category_id] ?? 0) + 1
  }
  const total = items.length

  return (
    <>
      <div className="mb-4">
        <div className="text-[12px] font-bold text-muted">01. 오픈 발주</div>
        <h2 className="mt-0.5 text-[19px] font-extrabold">
          📦 오픈 발주 체크리스트
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          신규 오픈 시 카테고리별로 준비할 품목입니다. 총{' '}
          <b className="text-ink-2">{total}개</b> 품목 · {categories.length}개
          카테고리
        </p>
      </div>

      <CategoryList categories={categories} counts={counts} done={done} />
    </>
  )
}
