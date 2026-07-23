'use client'

import { ActionForm } from '@/components/ui/ActionForm'
import type { FixedCosts, Store, StoreSettings } from '@/lib/types'
import { createStore, saveFixedCosts, saveStoreSettings } from './actions'

function Money({
  name,
  label,
  value,
  disabled,
}: {
  name: string
  label: string
  value: number
  disabled?: boolean
}) {
  return (
    <div>
      <label className="fld-label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={0}
        inputMode="numeric"
        defaultValue={value || ''}
        disabled={disabled}
        placeholder="원"
        className="fld-input disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  )
}

export function FixedCostsForm({
  fixedCosts,
  readOnly,
}: {
  fixedCosts: FixedCosts | null
  readOnly: boolean
}) {
  const fields = (
    <div className="form-grid">
      <Money name="rent" label="임대료 (월)" value={fixedCosts?.rent ?? 0} disabled={readOnly} />
      <Money name="mgmt" label="관리비 (월)" value={fixedCosts?.mgmt ?? 0} disabled={readOnly} />
      <Money
        name="utility"
        label="공과금 (전기·가스·수도)"
        value={fixedCosts?.utility ?? 0}
        disabled={readOnly}
      />
      <Money
        name="insurance_etc"
        label="보험·기타 (월)"
        value={fixedCosts?.insurance_etc ?? 0}
        disabled={readOnly}
      />
    </div>
  )

  // 점장에게는 읽기 전용으로 보여준다 (RLS에서도 쓰기가 막혀 있다)
  if (readOnly) return fields

  return <ActionForm action={saveFixedCosts}>{fields}</ActionForm>
}

export function GoalsForm({
  settings,
  readOnly,
}: {
  settings: StoreSettings | null
  readOnly: boolean
}) {
  const fields = (
    <div className="form-grid">
      <Money
        name="monthly_goal"
        label="월 매출 목표"
        value={settings?.monthly_goal ?? 0}
        disabled={readOnly}
      />
      <div>
        <label className="fld-label" htmlFor="target_cost_rate">
          목표 원가율 (%)
        </label>
        <input
          id="target_cost_rate"
          name="target_cost_rate"
          type="number"
          min={0}
          max={100}
          step="0.1"
          defaultValue={settings?.target_cost_rate ?? 33}
          disabled={readOnly}
          className="fld-input disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      <div>
        <label className="fld-label" htmlFor="target_labor_rate">
          목표 인건비율 (%)
        </label>
        <input
          id="target_labor_rate"
          name="target_labor_rate"
          type="number"
          min={0}
          max={100}
          step="0.1"
          defaultValue={settings?.target_labor_rate ?? 20}
          disabled={readOnly}
          className="fld-input disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      <div>
        <label className="fld-label" htmlFor="business_days">
          영업일수 (월)
        </label>
        <input
          id="business_days"
          name="business_days"
          type="number"
          min={1}
          max={31}
          defaultValue={settings?.business_days ?? 30}
          disabled={readOnly}
          className="fld-input disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </div>
  )

  if (readOnly) return fields

  return <ActionForm action={saveStoreSettings}>{fields}</ActionForm>
}

export function AddStoreForm() {
  return (
    <ActionForm action={createStore} submitLabel="+ 매장 추가">
      <div className="form-grid">
        <div>
          <label className="fld-label" htmlFor="store-name">
            매장 이름
          </label>
          <input
            id="store-name"
            name="name"
            placeholder="예: 쑥고개"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="store-branch">
            지점명
          </label>
          <input
            id="store-branch"
            name="branch"
            placeholder="예: 을지로점 (없으면 비워두세요)"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="store-tag">
            태그 (영문 · 로고 파일명)
          </label>
          <input
            id="store-tag"
            name="tag"
            placeholder="예: ssuk"
            autoCapitalize="none"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="store-badge">
            배지 (한 글자)
          </label>
          <input
            id="store-badge"
            name="badge"
            maxLength={2}
            placeholder="예: 쑥"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="store-color">
            매장 컬러
          </label>
          <input
            id="store-color"
            name="color"
            type="color"
            defaultValue="#4b7f52"
            className="fld-input h-[42px] p-1"
          />
        </div>
      </div>
    </ActionForm>
  )
}

