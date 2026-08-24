import { NextResponse, type NextRequest } from 'next/server'
import { closingSales } from '@/lib/pnl'
import {
  dayLabel,
  monthWeeks,
  purchaseRate,
  sumMonth,
  sumVendor,
  sumWeek,
  sumWeekAll,
  toAmountMap,
  WEEKDAY_KO,
} from '@/lib/purchases'
import {
  getMonthClosings,
  getPurchaseMonth,
  getPurchaseVendors,
} from '@/lib/queries'
import { guardMenu } from '@/lib/session'
import { ymLabel } from '@/lib/settlement'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'icn1'

/** CSV 셀 이스케이프 — 콤마·따옴표·줄바꿈이 들어가도 안전하게 */
function cell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const row = (...cells: Array<string | number>) => cells.map(cell).join(',')

/**
 * 거래처 매입 현황 CSV 내보내기 — 화면과 같은 세 덩어리(요약표 · 거래처별 격자 ·
 * 매입비율)를 그대로 쓴다.
 * GET /api/export/purchases?ym=2026-07
 *
 * 엑셀이 UTF-8 한글을 깨뜨리지 않도록 BOM을 붙인다.
 */
export async function GET(request: NextRequest) {
  const { activeStore } = await guardMenu('/purchases')

  const ymParam = request.nextUrl.searchParams.get('ym') ?? ''
  const now = new Date()
  const ym = /^\d{4}-\d{2}$/.test(ymParam)
    ? ymParam
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = ym.split('-').map(Number)

  const [vendors, { entries, notes }, closings] = await Promise.all([
    getPurchaseVendors(activeStore.id),
    getPurchaseMonth(activeStore.id, ym),
    getMonthClosings(activeStore.id, year, month),
  ])

  const active = vendors.filter((v) => v.is_active)
  const vendorIds = active.map((v) => v.id)
  const weeks = monthWeeks(ym)
  const amounts = toAmountMap(entries)
  const noteBy = new Map(notes.map((n) => [n.week_no, n.note]))

  const salesByDate = new Map(closings.map((c) => [c.date, closingSales(c)]))
  const weekSales = weeks.map((w) =>
    w.days.reduce((s, d) => s + (d ? salesByDate.get(d) ?? 0 : 0), 0)
  )
  const monthSales = weekSales.reduce((s, v) => s + v, 0)
  const monthTotal = sumMonth(amounts, vendorIds, weeks)

  const lines: string[] = []

  lines.push(row(`${activeStore.name} ${ymLabel(ym)} 매입 현황 (VAT 포함)`))
  lines.push('')

  // ── 업체별 분류 ──
  lines.push(row('[업체별 분류]'))
  lines.push(row('일자', ...active.map((v) => v.name), '합계', '비고'))
  for (const w of weeks) {
    lines.push(
      row(
        w.label,
        ...active.map((v) => sumWeek(amounts, v.id, w)),
        sumWeekAll(amounts, vendorIds, w),
        noteBy.get(w.no) ?? ''
      )
    )
  }
  lines.push(
    row('계', ...active.map((v) => sumVendor(amounts, v.id, weeks)), monthTotal, '')
  )
  lines.push('')

  // ── 거래처별 일자 내역 ──
  for (const v of active) {
    lines.push(row(`[${v.name}]`))
    lines.push(row('요일', ...weeks.flatMap((w) => [w.label, '금액'])))
    WEEKDAY_KO.forEach((dow, r) => {
      lines.push(
        row(
          dow,
          ...weeks.flatMap((w) => {
            const d = w.days[r]
            if (!d) return ['', '']
            return [`${dayLabel(d)}일`, amounts[`${v.id}|${d}`] ?? 0]
          })
        )
      )
    })
    lines.push(
      row(
        '합계',
        ...weeks.flatMap((w) => ['', sumWeek(amounts, v.id, w)]),
        sumVendor(amounts, v.id, weeks)
      )
    )
    lines.push('')
  }

  // ── 매출 대비 매입 비율 ──
  lines.push(row('[매출 대비 매입 비율]'))
  lines.push(row('주', '매출', '매입', '비율(%)'))
  weeks.forEach((w, i) => {
    const purchase = sumWeekAll(amounts, vendorIds, w)
    lines.push(
      row(
        w.label,
        weekSales[i],
        purchase,
        purchaseRate(purchase, weekSales[i]).toFixed(1)
      )
    )
  })
  lines.push(
    row(
      `${month}월`,
      monthSales,
      monthTotal,
      purchaseRate(monthTotal, monthSales).toFixed(1)
    )
  )

  const csv = '﻿' + lines.join('\r\n')
  const filename = `${activeStore.tag}-${ym}-거래처매입.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
