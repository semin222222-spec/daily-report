import Link from 'next/link'
import { notFound } from 'next/navigation'
import { openOrderCategory } from '@/lib/owner-center'
import { OrderTable } from './OrderTable'

export const dynamic = 'force-dynamic'

export default function OpenOrderCategoryPage({
  params,
}: {
  params: { slug: string }
}) {
  const category = openOrderCategory(params.slug)
  if (!category) notFound()

  return (
    <>
      <div className="mb-4">
        <Link
          href="/owner-center/open-order"
          className="text-[13px] font-semibold text-muted hover:text-ink"
        >
          ← 오픈 발주 목록
        </Link>
        <h2 className="mt-1 text-[19px] font-extrabold">
          {category.no}. {category.name}
        </h2>
      </div>

      <OrderTable category={category} />
    </>
  )
}
