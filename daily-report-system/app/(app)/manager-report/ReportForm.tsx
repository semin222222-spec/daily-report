'use client'

import { useFormState, useFormStatus } from 'react-dom'
import type { ManagerReport, ReportPeriod } from '@/lib/types'
import { saveReport, type ActionResult } from './actions'

/**
 * 엑셀 시안의 6개 섹션.
 * 왼쪽에 점검 항목을 나열하고 오른쪽에 서술을 적는 구조를 그대로 옮겼다.
 * 항목 목록은 "무엇을 써야 하는지" 잊지 않게 하는 체크리스트 역할을 한다.
 */
const SECTIONS = [
  {
    key: 'sales_analysis',
    title: '매출분석',
    items: [
      '매출 총액 / 총 테이블 수',
      '메뉴별 매출 현황 (베스트·워스트 3)',
      '시간대별 매출 분석',
      '고객 피드백 및 리뷰 검토',
    ],
  },
  {
    key: 'cost_analysis',
    title: '비용 및 지출',
    items: [
      '재료 비용',
      '인건비 및 노동력 비용',
      '임대료 및 고정비용',
      '광고 및 마케팅 비용',
      '운영 및 유지보수 비용',
      '순이익률 분석',
    ],
  },
  {
    key: 'inventory',
    title: '재고 관리',
    items: [
      '식자재 및 원자재 재고 확인',
      '불량품 및 로스율 관리',
      '주문 및 재고 회전율 분석',
    ],
  },
  {
    key: 'customer_service',
    title: '고객 서비스 및 경험',
    items: ['서비스 품질 및 고객 만족도 평가', '불만 사항 및 개선 사항 도출'],
  },
  {
    key: 'staff_performance',
    title: '직원 성과 및 교육',
    items: ['직원 출결 및 근무 성과 평가', '교육 및 훈련 상황 / 추후 계획'],
  },
  {
    key: 'etc',
    title: '기타 사항',
    items: ['기타 중요한 사항이나 공유하고 싶은 점', '향후 운영계획', '기타'],
  },
] as const

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? '저장 중…' : '보고서 저장'}
    </button>
  )
}

export function ReportForm({
  periodType,
  periodStart,
  periodEnd,
  existing,
  autoDraft,
}: {
  periodType: ReportPeriod
  periodStart: string
  periodEnd: string
  existing: ManagerReport | null
  /** 매출분석 칸에 넣을 자동 초안 (숫자를 다시 타이핑하지 않게) */
  autoDraft: string
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    saveReport,
    null
  )

  return (
    <form action={formAction} key={`${periodType}-${periodStart}`}>
      <input type="hidden" name="period_type" value={periodType} />
      <input type="hidden" name="period_start" value={periodStart} />
      <input type="hidden" name="period_end" value={periodEnd} />

      {SECTIONS.map((section) => (
        <div key={section.key} className="card mt-4 !p-0 overflow-hidden">
          {/* 섹션 헤더 — 엑셀의 노란 띠 */}
          <div className="bg-warn/25 px-4 py-2.5 text-[14px] font-extrabold text-ink">
            {section.title}
          </div>

          <div className="grid grid-cols-1 shell:grid-cols-[220px_1fr]">
            <ul className="border-b border-line bg-[#fbfaf8] px-4 py-3 text-[12.5px] leading-relaxed text-ink-2 shell:border-b-0 shell:border-r">
              {section.items.map((it) => (
                <li key={it} className="flex gap-1.5 py-0.5">
                  <span className="text-muted">·</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>

            <div className="p-3">
              <textarea
                name={section.key}
                rows={section.key === 'sales_analysis' ? 6 : 5}
                defaultValue={
                  existing?.[section.key] ??
                  (section.key === 'sales_analysis' ? autoDraft : '')
                }
                placeholder={`${section.title}에 대해 적어주세요.`}
                className="w-full resize-y rounded-[10px] border border-line bg-white px-3 py-2.5
                           text-[13.5px] leading-relaxed outline-none transition
                           focus:border-brand focus:ring-[3px] focus:ring-brand/10"
              />
            </div>
          </div>
        </div>
      ))}

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

      <div className="btn-row sticky bottom-4 z-10">
        <SubmitButton />
      </div>
    </form>
  )
}
