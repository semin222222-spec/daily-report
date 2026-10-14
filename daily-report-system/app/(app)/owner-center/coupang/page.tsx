import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/session'
import type { EquipItem, EquipOrder } from '@/lib/equip-order'
import type { OpenChecklist } from '@/lib/types'
import { EquipOrders } from '@/app/(app)/executive/EquipOrders'

export const dynamic = 'force-dynamic'

/**
 * 06. 쿠팡 발주 — 임원전용에서 옮겨 왔다.
 * 오너는 품목·링크를 고치고, 점주는 보면서 🛒 로 담는다(체크는 각자 기기에 저장).
 */
export default async function CoupangOrderPage() {
  const { profile } = await getSessionContext()
  const isOwner = profile.role === 'owner'
  const supabase = createClient()

  const [orderRes, listRes] = await Promise.all([
    supabase
      .from('equip_orders')
      .select('*')
      .eq('kind', 'coupang')
      .order('quote_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase.from('open_checklists').select('*').order('created_at', { ascending: false }),
  ])
  const orders = (orderRes.data ?? []) as EquipOrder[]
  const openLists = (listRes.data ?? []) as OpenChecklist[]

  const { data: itemData } =
    orders.length > 0
      ? await supabase
          .from('equip_order_items')
          .select('*')
          .in('order_id', orders.map((o) => o.id))
          .order('sort_order', { ascending: true })
      : { data: [] }
  const items = (itemData ?? []) as EquipItem[]

  return (
    <>
      <div className="mb-4">
        <h2 className="text-[19px] font-extrabold">🛒 쿠팡 발주</h2>
        <p className="mt-1 text-[12.5px] text-muted">
          오픈 때 쿠팡에서 사는 품목입니다. 🛒 를 누르면 쿠팡이 열리고, 담은 품목은 체크해 두세요.
          {!isOwner && ' 체크는 이 기기에만 저장됩니다.'}
        </p>
      </div>
      <EquipOrders
        kind="coupang"
        orders={orders}
        items={items}
        openLists={openLists}
        isOwner={isOwner}
      />
    </>
  )
}
