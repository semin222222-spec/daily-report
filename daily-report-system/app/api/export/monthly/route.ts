import { NextResponse, type NextRequest } from 'next/server'
import { closingSales } from '@/lib/pnl'
import { getMonthClosings, getSettlement } from '@/lib/queries'
import { getSessionContext } from '@/lib/session'
import { COST_GROUPS, SECTIONS, sumItems, ymLabel } from '@/lib/settlement'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'icn1'

/** CSV 셀 이스케이프 — 콤마·따옴표·줄바꿈이 들어가도 안전하게 */
function cell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const row = (...cells: Array<string | number>) => cells.map(cell).join(',')

/**
 * 월정산 CSV 내보내기.
 * GET /api/export/monthly?ym=2026-07
 *
 * 엑셀이 UTF-8 한글을 깨뜨리지 않도록 BOM을 붙인다.
 */
export async function GET(request: NextRequest) {
  const { activeStore } = await getSessionContext()

  const ymParam = request.nextUrl.searchParams.get('ym') ?? ''
  const now = new Date()
  const ym = /^\d{4}-\d{2}$/.test(ymParam)
    ? ymParam
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = ym.split('-').map(Number)

  const closings = await getMonthClosings(activeStore.id, year, month)
  const autoSales = closings.reduce((s, c) => s + closingSales(c), 0)
  const { settlement, items } = await getSettlement(activeStore.id, ym)

  const totalSales = settlement
    ? settlement.sales_auto
      ? autoSales
      : settlement.total_sales
    : autoSales

  const costTotal = COST_GROUPS.reduce(
    (s, g) => s + sumItems(items, g.categories),
    0
  )

  const lines: string[] = []

  lines.push(row(`${activeStore.name} ${ymLabel(ym)} 정산`))
  lines.push('')

  // ── 항목별 내역 ──
  for (const def of SECTIONS) {
    const rows = items.filter((i) => i.category === def.category)
    const title = def.group ? `${def.group} · ${def.title}` : def.title

    lines.push(row(`[${title}]`))
    lines.push(row('항목', '금액'))
    for (const it of rows) lines.push(row(it.name, it.amount))
    lines.push(row('소계', sumItems(rows, [def.category])))
    lines.push('')
  }

  // ── 요약 ──
  lines.push(row('[정산 요약]'))
  lines.push(row('이번달 총 매출', totalSales))
  for (const g of COST_GROUPS) {
    lines.push(row(g.label, -sumItems(items, g.categories)))
  }
  lines.push(row('총 수익', totalSales - costTotal))
  lines.push('')

  // ── 일별 내역 ──
  lines.push(row('[일별 매출]'))
  lines.push(
    row('날짜', '객수', '카드', '현금', '배달', '기타', '총매출', '식자재 원가', '당일 지출', '메모')
  )
  for (const c of closings) {
    lines.push(
      row(
        c.date,
        c.guests,
        c.sales_card,
        c.sales_cash,
        c.sales_delivery,
        c.sales_etc,
        closingSales(c),
        c.cost,
        c.expense,
        c.memo
      )
    )
  }
  lines.push(row('합계', '', '', '', '', '', autoSales))

  const csv = '﻿' + lines.join('\r\n')
  const filename = `${activeStore.tag}-${ym}-정산.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
