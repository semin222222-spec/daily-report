import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { OcCategory, OcItem } from '@/lib/owner-center'
import { ItemManager } from './ItemManager'

export const dynamic = 'force-dynamic'

export default async function OpenOrderCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const [catRes, itemRes] = await Promise.all([
    supabase.from('oc_categories').select('*').eq('id', params.id).maybeSingle(),
    supabase
      .from('oc_items')
      .select('*')
      .eq('category_id', params.id)
      .order('sort_order', { ascending: true }),
  ])

  const category = catRes.data as OcCategory | null
  if (!category) notFound()
  const items = (itemRes.data ?? []) as OcItem[]

  return (
    <>
      <div className="mb-4">
        <Link
          href="/owner-center/open-order"
          className="text-[13px] font-semibold text-muted hover:text-ink"
        >
          ← 오픈 발주 목록
        </Link>
        <h2 className="mt-1 text-[19px] font-extrabold">{category.name}</h2>
      </div>

      <ItemManager categoryId={category.id} items={items} />
    </>
  )
}
