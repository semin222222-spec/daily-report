'use client'

import { useMemo, useState, useTransition } from 'react'
import { num, todayKST, won } from '@/lib/format'
import {
  compareLines,
  parseSheets,
  type DiffKind,
  type DiffRow,
  type EquipItem,
  type EquipLine,
  type EquipOrder,
} from '@/lib/equip-order'
import type { OpenChecklist as OpenList } from '@/lib/types'
import { importEquipOrder } from './equip-actions'

const KIND_META: Record<DiffKind, { label: string; pill: string; row: string }> = {
  price: { label: '단가 변동', pill: 'bg-warn/15 text-warn', row: 'bg-warn/[.06]' },
  missing: { label: '누락', pill: 'bg-bad/10 text-bad', row: 'bg-bad/[.05]' },
  new: { label: '신규', pill: 'bg-good/15 text-good', row: 'bg-good/[.06]' },
  spec: { label: '규격 변경', pill: 'bg-brand/10 text-brand-deep', row: 'bg-brand/[.04]' },
  qty: { label: '수량 변동', pill: 'bg-line-soft text-ink-2', row: '' },
  same: { label: '동일', pill: 'bg-line-soft text-muted', row: '' },
}
const KIND_ORDER: DiffKind[] = ['price', 'missing', 'new', 'spec', 'qty', 'same']

const toLine = (i: EquipItem): EquipLine => ({
  section: i.section,
  name: i.name,
  spec: i.spec,
  qty: Number(i.qty),
  unit_price: Number(i.unit_price),
  note: i.note,
  link: i.link,
})

function Delta({ before, after }: { before?: number; after?: number }) {
  if (before === undefined || after === undefined || before === after) return null
  const d = after - before
  const pct = before ? (d / before) * 100 : 0
  return (
    <span className={`ml-1 text-[11px] font-bold ${d > 0 ? 'text-bad' : 'text-good'}`}>
      {d > 0 ? '▲' : '▼'}
      {num(Math.abs(d))}
      {before ? ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)` : ''}
    </span>
  )
}

/**
 * 업체가 보낸 견적 엑셀을 올리면
 *  1) 품목을 읽고  2) 지난 발주서와 비교해 누락·신규·단가 변동을 보여주고
 *  3) 확인 후 새 발주서로 저장한다.
 * 엑셀은 브라우저 안에서만 읽는다(서버로 파일을 보내지 않음).
 */
export function EquipImport({
  orders,
  items,
  openLists,
  defaultBaseId,
  onCancel,
  onSaved,
}: {
  orders: EquipOrder[]
  items: EquipItem[]
  openLists: OpenList[]
  defaultBaseId: string | null
  onCancel: () => void
  onSaved: (id: string) => void
}) {
  const [fileName, setFileName] = useState('')
  const [lines, setLines] = useState<EquipLine[] | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [reading, setReading] = useState(false)
  const [baseId, setBaseId] = useState<string>(defaultBaseId ?? '')
  const [filter, setFilter] = useState<DiffKind | 'changed' | 'all'>('changed')
  const [keepMissing, setKeepMissing] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, startSaving] = useTransition()

  const base = orders.find((o) => o.id === baseId) ?? null
  const [vatIncluded, setVatIncluded] = useState(base?.vat_included ?? false)
  const baseLines = useMemo(
    () => items.filter((i) => i.order_id === baseId).map(toLine),
    [items, baseId]
  )
  const diff = useMemo(
    () => (lines ? compareLines(baseLines, lines, vatIncluded) : null),
    [baseLines, lines, vatIncluded]
  )

  async function readFile(file: File) {
    setReading(true)
    setMessage(null)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer())
      const sheets = wb.SheetNames.map(
        (n) =>
          XLSX.utils.sheet_to_json(wb.Sheets[n], {
            header: 1,
            defval: '',
            raw: true,
            blankrows: false,
          }) as (string | number)[][]
      )
      const res = parseSheets(sheets)
      setFileName(file.name)
      setLines(res.lines)
      setWarnings(res.warnings)
    } catch (e) {
      setLines(null)
      setWarnings([`엑셀을 읽지 못했습니다: ${(e as Error).message}`])
    } finally {
      setReading(false)
    }
  }

  const visible: DiffRow[] = useMemo(() => {
    if (!diff) return []
    if (filter === 'all') return diff.rows
    if (filter === 'changed') return diff.rows.filter((r) => r.kind !== 'same')
    return diff.rows.filter((r) => r.kind === filter)
  }, [diff, filter])

  function save(form: HTMLFormElement) {
    if (!lines || !diff) return
    const fd = new FormData(form)
    // diff 의 after 는 지난 발주 링크를 이어받은 줄이라 그것으로 저장한다
    const current = diff.rows.filter((r) => r.after).map((r) => r.after!)
    const finalLines = keepMissing
      ? [...current, ...diff.rows.filter((r) => r.kind === 'missing').map((r) => r.before!)]
      : current
    startSaving(async () => {
      try {
        const res = await importEquipOrder({
          title: String(fd.get('title') ?? ''),
          vendor: String(fd.get('vendor') ?? ''),
          quote_date: String(fd.get('quote_date') ?? ''),
          open_checklist_id: String(fd.get('open_checklist_id') ?? ''),
          memo: String(fd.get('memo') ?? ''),
          vat_included: vatIncluded,
          lines: finalLines,
        })
        setMessage({ ok: res.ok, text: res.message })
        if (res.ok && res.id) onSaved(res.id)
      } catch (e) {
        setMessage({ ok: false, text: (e as Error).message })
      }
    })
  }

  return (
    <>
      {/* ── 1. 파일 선택 ───────────────────────────── */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="card-title">📥 견적 엑셀 업로드 · 비교</h3>
            <p className="card-sub">
              업체가 보낸 견적 엑셀(.xlsx · .xls · .csv)을 올리면 지난 발주서와 비교해
              <b> 누락 · 신규 · 단가 변동</b>을 알려줍니다. 엑셀에 <b>품명 · 규격 · 수량 · 단가</b>
              머리글만 있으면 양식이 달라도 읽습니다.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="btn-ghost !px-3 !py-1.5 !text-[13px]">
            닫기
          </button>
        </div>

        <div className="form-grid">
          <div>
            <label className="fld-label" htmlFor="eq-file">견적 엑셀 파일</label>
            <input
              id="eq-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) readFile(f)
              }}
              className="fld-input !py-2 file:mr-3 file:rounded-md file:border-0 file:bg-brand/10 file:px-3 file:py-1 file:text-[12.5px] file:font-bold file:text-brand-deep"
            />
          </div>
          <div>
            <label className="fld-label" htmlFor="eq-base">비교할 지난 발주서</label>
            <select
              id="eq-base"
              value={baseId}
              onChange={(e) => {
                setBaseId(e.target.value)
                setVatIncluded(orders.find((o) => o.id === e.target.value)?.vat_included ?? false)
              }}
              className="fld-input"
            >
              <option value="">비교 안 함 (처음 등록)</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                  {o.quote_date ? ` (${o.quote_date})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {reading && <p className="mt-3 text-[13px] text-muted">엑셀 읽는 중…</p>}
        {warnings.length > 0 && (
          <ul className="mt-3 space-y-0.5 rounded-[10px] bg-warn/[.07] px-3 py-2 text-[12px] text-ink-2">
            {warnings.slice(0, 8).map((w, i) => (
              <li key={i}>⚠️ {w}</li>
            ))}
            {warnings.length > 8 && <li>… 외 {warnings.length - 8}건</li>}
          </ul>
        )}
      </div>

      {/* ── 2. 비교 결과 ───────────────────────────── */}
      {diff && lines && lines.length > 0 && (
        <>
          <div className="card mt-4">
            <h3 className="card-title">
              비교 결과 <span className="text-[12.5px] font-semibold text-muted">— {fileName}</span>
            </h3>
            <p className="card-sub">
              {base ? `기준: ${base.title} (${baseLines.length}품목)` : '비교 대상 없음'} → 이번
              엑셀 {lines.length}품목
            </p>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('changed')}
                className={`pill ${filter === 'changed' ? '!bg-ink !text-white' : 'bg-line-soft text-ink-2'}`}
              >
                변경 전체 {diff.rows.length - diff.counts.same}
              </button>
              {KIND_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  disabled={diff.counts[k] === 0}
                  className={`pill ${filter === k ? '!bg-ink !text-white' : KIND_META[k].pill} disabled:opacity-40`}
                >
                  {KIND_META[k].label} {diff.counts[k]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`pill ${filter === 'all' ? '!bg-ink !text-white' : 'bg-line-soft text-muted'}`}
              >
                모두 보기
              </button>
            </div>

            {base && (
              <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-center shell:grid-cols-4">
                <div>
                  <div className="text-[11.5px] text-muted">지난 총계</div>
                  <div className="text-[15px] font-extrabold tabular-nums">{won(diff.before.total)}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-muted">이번 총계</div>
                  <div className="text-[15px] font-extrabold tabular-nums">{won(diff.after.total)}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-muted">총계 차이</div>
                  <div
                    className={`text-[15px] font-extrabold tabular-nums ${
                      diff.after.total > diff.before.total ? 'text-bad' : 'text-good'
                    }`}
                  >
                    {diff.after.total >= diff.before.total ? '+' : '−'}
                    {won(Math.abs(diff.after.total - diff.before.total))}
                  </div>
                </div>
                <div>
                  <div className="text-[11.5px] text-muted">단가 변동 영향 (공급가)</div>
                  <div
                    className={`text-[15px] font-extrabold tabular-nums ${
                      diff.priceImpact > 0 ? 'text-bad' : diff.priceImpact < 0 ? 'text-good' : ''
                    }`}
                  >
                    {diff.priceImpact >= 0 ? '+' : '−'}
                    {won(Math.abs(diff.priceImpact))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card mt-4">
            <div className="-mx-1 overflow-x-auto">
              <table className="tbl min-w-[720px]">
                <thead>
                  <tr>
                    <th className="w-[84px]">결과</th>
                    <th>품명</th>
                    <th>규격</th>
                    <th className="text-right">수량</th>
                    <th className="text-right">단가</th>
                    <th className="text-right">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[13px] text-muted">
                        {filter === 'changed' ? '지난 발주와 달라진 점이 없습니다 👍' : '해당 항목이 없습니다.'}
                      </td>
                    </tr>
                  )}
                  {visible.map((r, i) => {
                    const meta = KIND_META[r.kind]
                    const cur = r.after ?? r.before!
                    return (
                      <tr key={i} className={meta.row}>
                        <td>
                          <span className={`pill ${meta.pill}`}>{meta.label}</span>
                        </td>
                        <td className="font-semibold">
                          {cur.name}
                          <div className="text-[11px] font-normal text-muted">{cur.section}</div>
                        </td>
                        <td className="text-ink-2">
                          {r.kind === 'spec' ? (
                            <>
                              <span className="text-muted line-through">{r.before!.spec || '-'}</span>
                              {' → '}
                              <b>{r.after!.spec || '-'}</b>
                            </>
                          ) : (
                            cur.spec
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right tabular-nums">
                          {r.qtyChanged && (
                            <span className="text-muted line-through">{num(r.before!.qty)}</span>
                          )}{' '}
                          {num(cur.qty)}
                        </td>
                        <td className="whitespace-nowrap text-right tabular-nums">
                          {r.priceChanged && (
                            <span className="text-muted line-through">{num(r.before!.unit_price)}</span>
                          )}{' '}
                          <b>{num(cur.unit_price)}</b>
                          {r.priceChanged && (
                            <Delta before={r.before!.unit_price} after={r.after!.unit_price} />
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right tabular-nums">
                          {num(cur.qty * cur.unit_price)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 3. 새 발주서로 저장 ─────────────────── */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save(e.currentTarget)
            }}
            className="card mt-4"
          >
            <h3 className="card-title">새 발주서로 저장</h3>
            <p className="card-sub">비교 결과를 확인했으면 이번 엑셀 내용을 발주서로 남겨 다음 비교의 기준으로 씁니다.</p>
            <div className="form-grid">
              <div>
                <label className="fld-label" htmlFor="im-title">발주서 이름</label>
                <input
                  id="im-title"
                  name="title"
                  required
                  defaultValue={fileName.replace(/\.(xlsx|xls|csv)$/i, '')}
                  placeholder="예: 홍대점 오픈 집기"
                  className="fld-input"
                />
              </div>
              <div>
                <label className="fld-label" htmlFor="im-vendor">업체</label>
                <input id="im-vendor" name="vendor" defaultValue={base?.vendor ?? ''} className="fld-input" />
              </div>
              <div>
                <label className="fld-label" htmlFor="im-date">견적 작성일</label>
                <input id="im-date" name="quote_date" type="date" defaultValue={todayKST()} className="fld-input" />
              </div>
              <div>
                <label className="fld-label" htmlFor="im-open">오픈 매장 (선택)</label>
                <select id="im-open" name="open_checklist_id" defaultValue="" className="fld-input">
                  <option value="">연결 안 함</option>
                  {openLists.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3.5">
              <label className="fld-label" htmlFor="im-memo">메모</label>
              <input id="im-memo" name="memo" placeholder="단가 인상 협의 결과 등" className="fld-input" />
            </div>

            <label className="mt-3 flex items-center gap-2 text-[13px] font-semibold">
              <input
                type="checkbox"
                checked={vatIncluded}
                onChange={(e) => setVatIncluded(e.target.checked)}
              />
              단가가 부가세 포함가 (쿠팡 등 소매 구매)
            </label>

            {diff.counts.missing > 0 && (
              <label className="mt-3 flex items-center gap-2 text-[13px] font-semibold">
                <input
                  type="checkbox"
                  checked={keepMissing}
                  onChange={(e) => setKeepMissing(e.target.checked)}
                />
                누락된 {diff.counts.missing}개 품목도 지난 단가 그대로 포함해서 저장
              </label>
            )}

            {message && (
              <div className={`mt-3 text-[13px] font-semibold ${message.ok ? 'text-good' : 'text-bad'}`} role="status">
                {message.text}
              </div>
            )}

            <div className="btn-row">
              <button type="button" className="btn-ghost" onClick={onCancel}>취소</button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? '저장 중…' : `${lines.length + (keepMissing ? diff.counts.missing : 0)}개 품목 저장`}
              </button>
            </div>
          </form>
        </>
      )}
    </>
  )
}
