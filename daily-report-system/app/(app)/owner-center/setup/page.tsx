import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/session'
import type { SetupChecklist as Checklist, SetupItem } from '@/lib/setup-checklist'
import { SetupChecklist } from './SetupChecklist'

export const dynamic = 'force-dynamic'

/** 07. 가맹점 셋팅 체크리스트 — 매장마다 한 장 */
export default async function SetupChecklistPage() {
  const { profile } = await getSessionContext()
  const isOwner = profile.role === 'owner'
  const supabase = createClient()

  const [listRes, itemRes] = await Promise.all([
    supabase
      .from('setup_checklists')
      .select('*')
      .order('open_date', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('setup_checklist_items')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])

  return (
    <SetupChecklist
      lists={(listRes.data ?? []) as Checklist[]}
      items={(itemRes.data ?? []) as SetupItem[]}
      isOwner={isOwner}
    />
  )
}
