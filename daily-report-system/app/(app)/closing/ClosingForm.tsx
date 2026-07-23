'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { won } from '@/lib/format'
import type { DailyClosing } from '@/lib/types'
import { saveClosing, type ActionResult } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? '저장 중…' : '마감 확정'}
    </button>
  )
}

const MONEY_FIELDS = [
  { name: 'sales_card', label: '카드 매출' },
  { name: 'sales_cash', label: '현금 매출' },
  { name: 'sales_delivery', label: '배달 매출 (배민·쿠팡 등)' },
  { name: 'sales_etc', label: '기타 매출' },
  { name: 'cost', label: '식자재 매입 (원가)' },
  { name: 'expense', label: '당일 지출 (소모품 등)' },
] as const

export function ClosingForm({
  storeId,
  storeName,
  date,
  existing,
}: {
  storeId: string
  storeName: string
  date: string
  existing: DailyClosing | null
}) {
  const router = useRouter()
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    saveClosing,
    null
  )

  // 매출 합계를 입력 중에 바로 보여준다 — 포스 합계와 대조하기 편하도록
  const [sales, setSales] = useState({
    sales_card: existing?.sales_card ?? 0,
    sales_cash: existing?.sales_cash ?? 0,
    sales_delivery: existing?.sales_delivery ?? 0,
    sales_etc: existing?.sales_etc ?? 0,
  })
  const totalSales =
    sales.sales_card + sales.sales_cash + sales.sales_delivery + sales.sales_etc

  // 날짜를 바꾸면 그 날짜의 기존 마감을 불러오도록 서버에 다시 요청한다
  function onDateChange(next: string) {
    if (next) router.push(`/closing?date=${next}`)
  }

  useEffect(() => {
    if (state?.ok) router.refresh()
  }, [state, router])

  return (
    <div className="card">
      <h3 className="card-title">
        일마감 입력 <span className="pill pill-w">{date}</span>
        {existing && (
          <span className="pill pill-g ml-1.5">입력됨 · 수정 가능</span>
        )}
      </h3>
      <p className="card-sub">
        {storeName} · 오늘 영업 마감 내용을 입력하면 대시보드·손익에 자동
        반영됩니다.
      </p>

      <form action={formAction}>
        <input type="hidden" name="store_id" value={storeId} />

        <div className="form-grid">
          <div>
            <label className="fld-label" htmlFor="date">
              영업일자
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="fld-input"
            />
          </div>

          <div>
            <label className="fld-label" htmlFor="guests">
              객수 (명)
            </label>
            <input
              id="guests"
              name="guests"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="예: 214"
              defaultValue={existing?.guests || ''}
              className="fld-input"
            />
          </div>

          {MONEY_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="fld-label" htmlFor={f.name}>
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="원"
                defaultValue={existing?.[f.name] || ''}
                onChange={
                  f.name.startsWith('sales_')
                    ? (e) =>
                        setSales((s) => ({
                          ...s,
                          [f.name]: Number(e.target.value) || 0,
                        }))
                    : undefined
                }
                className="fld-input"
              />
            </div>
          ))}
        </div>

        <div className="mt-3.5">
          <label className="fld-label" htmlFor="memo">
            특이사항 메모
          </label>
          <textarea
            id="memo"
            name="memo"
            rows={2}
            placeholder="예: 단체 예약 3팀, 우천으로 배달 비중 높음"
            defaultValue={existing?.memo ?? ''}
            className="fld-input"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-line-soft/60 px-4 py-3">
          <span className="text-[13px] font-semibold text-ink-2">
            매출 합계
          </span>
          <span className="text-lg font-extrabold tabular-nums">
            {won(totalSales)}
          </span>
        </div>

        {state && (
          <div
            className={`mt-3 text-[13px] font-semibold ${
              state.ok ? 'text-good' : 'text-bad'
            }`}
            role="status"
          >
            {state.message}
          </div>
        )}

        <div className="btn-row">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
