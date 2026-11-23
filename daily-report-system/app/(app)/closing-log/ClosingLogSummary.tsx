import { won } from '@/lib/format'
import type { ClosingIssue, ClosingMenuSale } from '@/lib/types'
import { CONDITION_LABEL, conditionLevel } from './constants'

/** 요약 카드가 그리는 값 — 저장된 일지와 작성 중인 폼 상태 둘 다 이 모양으로 넘긴다 */
export interface ClosingLogView {
  storeName: string
  dateLabel: string
  writer: string
  open_run: number
  naver_bookings: number
  full_at: string
  condition: number
  late: boolean
  late_note: string
  complaint: boolean
  complaint_note: string
  stock_issue: boolean
  stock_issue_note: string
  menu_sales: ClosingMenuSale[]
  issues: ClosingIssue[]
  note: string
  savedAt?: string | null
}

const LEVEL_STYLE = {
  good: 'bg-good/10 text-[#0a7d0a]',
  warn: 'bg-warn/15 text-[#9a6a00]',
  bad: 'bg-bad/10 text-bad',
} as const

/** 점주가 보는 마감일지 요약 카드 */
export function ClosingLogSummary({ v }: { v: ClosingLogView }) {
  const level = conditionLevel(v.condition)
  const checks = [
    { name: '지각', on: v.late, note: v.late_note },
    { name: '컴플레인', on: v.complaint, note: v.complaint_note },
    { name: '재고 이슈', on: v.stock_issue, note: v.stock_issue_note },
  ]
  const menus = [...v.menu_sales].filter((m) => m.name).sort((a, b) => b.qty - a.qty)
  const maxQty = Math.max(1, ...menus.map((m) => m.qty))
  const issues = v.issues.filter((it) => it.text.trim() || it.amount)

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div className="min-w-0">
          <div className="text-[16px] font-bold">
            {v.storeName} · {v.dateLabel} 마감
          </div>
          <div className="text-[12.5px] text-muted">
            작성 {v.writer || '-'}
            {v.savedAt ? ` · ${v.savedAt} 저장` : ' · 작성 중'}
          </div>
        </div>
        <div className={`flex-none rounded-xl px-3 py-1.5 text-center ${LEVEL_STYLE[level]}`}>
          <b className="block text-[22px] leading-tight tabular-nums">{v.condition}</b>
          <span className="text-[11px] font-bold">컨디션 {CONDITION_LABEL[level]}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-line-soft">
        {[
          ['오픈런', `${v.open_run}팀`],
          ['네이버 예약', `${v.naver_bookings}팀`],
          ['만석', v.full_at || '없음'],
        ].map(([k, val], i) => (
          <div key={k} className={`px-4 py-3 ${i ? 'border-l border-line-soft' : ''}`}>
            <div className="text-xs text-muted">{k}</div>
            <div className="text-[18px] font-bold tabular-nums">{val}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 px-5 py-4">
        <div className="flex flex-wrap gap-1.5">
          {checks.map((c) => (
            <span
              key={c.name}
              className={`rounded-full px-2.5 py-1 text-[12.5px] font-bold ${
                c.on ? LEVEL_STYLE.bad : LEVEL_STYLE.good
              }`}
            >
              {c.name} {c.on ? '있음' : '없음'}
            </span>
          ))}
        </div>

        {checks.some((c) => c.on && c.note.trim()) && (
          <div className="grid gap-1.5">
            {checks
              .filter((c) => c.on && c.note.trim())
              .map((c) => (
                <div
                  key={c.name}
                  className="whitespace-pre-wrap break-words rounded-[10px] border border-line-soft bg-page px-3 py-2 text-[13.5px]"
                >
                  <b className="mr-1">{c.name}</b>
                  {c.note}
                </div>
              ))}
          </div>
        )}

        {issues.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">특이사항</div>
            <div className="grid gap-1.5">
              {issues.map((it, i) => (
                <div
                  key={i}
                  className="whitespace-pre-wrap break-words rounded-[10px] border border-line-soft bg-page px-3 py-2 text-[13.5px]"
                >
                  <b className="mr-1">[{it.type}]</b>
                  {it.text}
                  {it.amount > 0 && (
                    <span className="ml-1 whitespace-nowrap font-bold text-bad">
                      {won(it.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {menus.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">주요 메뉴 판매량</div>
            <div className="grid gap-1.5">
              {menus.map((m, i) => (
                <div
                  key={`${m.name}-${i}`}
                  className="grid grid-cols-[minmax(0,1fr)_110px_32px] items-center gap-2 text-[13.5px]"
                >
                  <span className="truncate">{m.name}</span>
                  <span className="h-2 overflow-hidden rounded bg-line-soft">
                    <span
                      className="block h-full rounded bg-brand transition-[width]"
                      style={{ width: `${(m.qty / maxQty) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-bold tabular-nums">{m.qty}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {v.note.trim() && (
          <div>
            <div className="mb-1.5 text-xs font-bold text-muted">발주 · 전달사항</div>
            <div className="whitespace-pre-wrap break-words text-[13.5px] text-ink-2">
              {v.note}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
