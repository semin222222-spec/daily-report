'use client'

import { ActionForm } from '@/components/ui/ActionForm'
import type { FixedCosts, Store, StoreSettings } from '@/lib/types'
import { saveFixedCosts, saveStoreSettings } from './actions'

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

