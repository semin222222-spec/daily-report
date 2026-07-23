import { logoMapByStoreId } from '@/lib/logos'
import { getPnlInputs } from '@/lib/queries'
import { getSessionContext } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import { ManagerAccounts } from './ManagerAccounts'
import { StoreRows } from './StoreRows'
import { AddStoreForm } from './AddStoreForm'
import { FixedCostsForm, GoalsForm } from './SettingsForms'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { profile, stores, activeStore } = await getSessionContext()
  const { fixedCosts, settings } = await getPnlInputs(activeStore.id)

  const isOwner = profile.role === 'owner'


  // 세션의 stores는 활성 매장만 담고 있다. 관리 표에는 비활성 매장도 보여야
  // 복구가 가능하므로 여기서 전체를 따로 읽는다. (오너만 읽힌다 — RLS)
  let allStores = stores
  if (isOwner) {
    const supabase = createClient()
    const { data } = await supabase
      .from('stores')
      .select('*')
      .order('is_active', { ascending: false })
      .order('sort_order', { ascending: true })
    if (data && data.length > 0) allStores = data as typeof stores
  }

  // 계정 목록은 오너만 읽을 수 있다 (profiles RLS)
  let managers: Profile[] = []
  if (isOwner) {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('role', { ascending: true })
    managers = (data ?? []) as Profile[]
  }

  return (
    <>
      <div className="card">
        <h3 className="card-title">
          고정비 설정{' '}
          {!isOwner && <span className="pill pill-w">읽기 전용</span>}
        </h3>
        <p className="card-sub">
          {activeStore.name} · 월 고정비를 넣으면 일일·월 손익에 자동
          배분됩니다.
        </p>
        <FixedCostsForm fixedCosts={fixedCosts} readOnly={!isOwner} />
      </div>

      <div className="card mt-4">
        <h3 className="card-title">
          목표·기준 설정{' '}
          {!isOwner && <span className="pill pill-w">읽기 전용</span>}
        </h3>
        <p className="card-sub">월 매출 목표와 원가/인건비 기준선</p>
        <GoalsForm settings={settings} readOnly={!isOwner} />
      </div>

      {!isOwner && (
        <p className="mt-3 px-1 text-[12px] text-muted">
          고정비와 목표는 전체 손익에 영향을 주기 때문에 오너만 수정할 수
          있습니다. 변경이 필요하면 오너에게 요청해주세요.
        </p>
      )}

      {/* ── 관리자 설정 ──────────────────────────── */}
      {isOwner && (
        <>
          <div className="section-head">
            <h2 className="m-0 text-[15px] text-ink-2">관리자 설정</h2>
            <span className="adminonly-tag">오너 전용</span>
          </div>

          <div className="card">
            <h3 className="card-title">매장 관리</h3>
            <p className="card-sub">
              [수정]을 눌러 이름·지점명·배지·컬러를 바꿀 수 있습니다. 지점명은
              로그인 화면에 그대로 표시됩니다.
            </p>

            <StoreRows
              stores={allStores}
              managers={managers}
              logos={await logoMapByStoreId(allStores)}
            />
          </div>


          {/* 계정 발급 폼에서 "매장 추가하기 →" 로 여기로 건너온다 */}
          <div className="card mt-4 scroll-mt-24" id="add-store">
            <h3 className="card-title">+ 매장 추가</h3>
            <p className="card-sub">
              같은 브랜드의 지점(예: 삐딱 문래점)을 추가하면{' '}
              <b>컬러와 로고를 그대로 물려받습니다.</b> 추가한 매장은 상단
              스위처와 점장 계정 발급 목록에 바로 나타납니다.
            </p>
            <AddStoreForm stores={allStores} />
          </div>

          <ManagerAccounts
            managers={managers.filter((m) => m.role === 'manager')}
            stores={stores}
            currentUserId={profile.id}
            serviceKeyReady={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}
          />
        </>
      )}
    </>
  )
}
