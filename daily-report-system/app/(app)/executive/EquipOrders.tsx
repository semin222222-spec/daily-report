'use client'

import { useMemo, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { num, won } from '@/lib/format'
import {
  EQUIP_SECTIONS,
  EQUIP_STATUSES,
  buyUrl,
  equipStatusMeta,
  groupBySection,
  lineAmount,
  orderKind,
  orderTotals,
  toSheetRows,
  wonInKorean,
  type EquipItem,
  type EquipOrder,
  type EquipOrderKind,
} from '@/lib/equip-order'
import type { OpenChecklist as OpenList } from '@/lib/types'
import {
  addEquipItem,
  createEquipOrder,
  deleteEquipItem,
  deleteEquipOrder,
  resetEquipChecks,
  saveEquipItem,
  saveEquipOrder,
  toggleEquipItem,
  type EquipResult,
} from './equip-actions'
import { EquipImport } from './EquipImport'
import { LinkEditor } from './LinkEditor'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? '저장 중…' : label}
    </button>
  )
}

const qtyText = (q: number) => Number(q).toLocaleString('ko-KR', { maximumFractionDigits: 2 })

/** 발주서 만들기 / 머리 수정 */
function OrderForm({
  kind,
  editing,
  orders,
  openLists,
  onDone,
  onCreated,
}: {
  kind: EquipOrderKind
  editing: EquipOrder | null
  orders: EquipOrder[]
  openLists: OpenList[]
  onDone: () => void
  onCreated: (id: string) => void
}) {
  const [state, formAction] = useFormState<EquipResult | null, FormData>(
    async (prev, fd) => {
      const res = editing ? await saveEquipOrder(prev, fd) : await createEquipOrder(prev, fd)
      if (res.ok) {
        if (res.id) onCreated(res.id)
        onDone()
      }
      return res
    },
    null
  )

  return (
    <form action={formAction} className="card">
      <h3 className="card-title">{editing ? '발주서 수정' : '새 발주서'}</h3>
      <p className="card-sub">
        가맹점 오픈 한 건 = 발주서 한 장. 지난 발주서를 복사해서 시작하면 수량만 고치면 됩니다.
      </p>
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div className="form-grid">
        <div>
          <label className="fld-label" htmlFor="eq-title">발주서 이름</label>
          <input
            id="eq-title"
            name="title"
            required
            defaultValue={editing?.title ?? ''}
            placeholder={kind === 'coupang' ? '예: 홍대점 쿠팡 발주' : '예: 홍대점 오픈 집기'}
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="eq-vendor">업체</label>
          <input
            id="eq-vendor"
            name="vendor"
            defaultValue={editing?.vendor ?? orders[0]?.vendor ?? ''}
            placeholder="예: 길흥주방"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="eq-date">견적 작성일</label>
          <input
            id="eq-date"
            name="quote_date"
            type="date"
            defaultValue={editing?.quote_date ?? ''}
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="eq-open">오픈 매장 (선택)</label>
          <select
            id="eq-open"
            name="open_checklist_id"
            defaultValue={editing?.open_checklist_id ?? ''}
            className="fld-input"
          >
            <option value="">연결 안 함</option>
            {openLists.map((o) => (
              <option key={o.id} value={o.id}>{o.title}</option>
            ))}
          </select>
        </div>

        {editing ? (
          <div>
            <label className="fld-label" htmlFor="eq-status">진행 상태</label>
            <select id="eq-status" name="status" defaultValue={editing.status} className="fld-input">
              {EQUIP_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="fld-label" htmlFor="eq-seed">시작 방식</label>
            <select id="eq-seed" name="seed" className="fld-input" defaultValue={orders[0]?.id ?? 'blank'}>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.title} 복사해서 시작</option>
              ))}
              <option value="blank">빈 발주서로 시작</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-3.5">
        <label className="fld-label" htmlFor="eq-memo">메모</label>
        <textarea
          id="eq-memo"
          name="memo"
          rows={2}
          defaultValue={editing?.memo ?? ''}
          placeholder="담당자 연락처 · 납품일 · 결제 조건 등"
          className="fld-input leading-relaxed"
        />
      </div>

      <label className="mt-3 flex items-center gap-2 text-[13px] font-semibold">
        <input
          type="checkbox"
          name="vat_included"
          defaultChecked={editing ? editing.vat_included : kind === 'coupang'}
        />
        단가가 부가세 포함가 (쿠팡 등 소매 구매)
      </label>

      {state && !state.ok && (
        <div className="mt-3 text-[13px] font-semibold text-bad" role="status">{state.message}</div>
      )}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onDone}>취소</button>
        <SubmitButton label={editing ? '수정 저장' : '발주서 만들기'} />
      </div>
    </form>
  )
}

/** 품목 한 줄의 입력칸들 (추가·수정 공용) */
function ItemFields({ item, section }: { item?: EquipItem; section: string }) {
  return (
    // 큰 화면에선 섹션 카드가 반쪽 폭이라 3칸 × 2줄로 접는다
    <div className="grid grid-cols-2 gap-2 shell:grid-cols-[110px_1.6fr_1.2fr_80px_110px_1fr] xl:grid-cols-3">
      <select name="section" defaultValue={item?.section ?? section} aria-label="구분" className="fld-input !py-2 !text-[13px]">
        {Array.from(new Set([...EQUIP_SECTIONS, section, item?.section ?? ''])).filter(Boolean).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input name="name" required defaultValue={item?.name} placeholder="품명" className="fld-input !py-2 !text-[13px]" />
      <input name="spec" defaultValue={item?.spec} placeholder="규격" className="fld-input !py-2 !text-[13px]" />
      <input name="qty" type="number" min={0} step="any" inputMode="decimal" defaultValue={item ? Number(item.qty) : ''} placeholder="수량" className="fld-input !py-2 !text-[13px]" />
      <input name="unit_price" type="number" min={0} inputMode="numeric" defaultValue={item ? Number(item.unit_price) : ''} placeholder="단가" className="fld-input !py-2 !text-[13px]" />
      <input name="note" defaultValue={item?.note} placeholder="비고" className="fld-input !py-2 !text-[13px]" />
      <input
        name="link"
        type="url"
        defaultValue={item?.link}
        placeholder="구매 링크 (쿠팡 상품 주소, 비우면 품명으로 검색)"
        className="fld-input col-span-2 !py-2 !text-[13px] shell:col-span-6 xl:col-span-3"
      />
    </div>
  )
}

/** 견적서 모양 그대로 인쇄 (화면에는 안 보임) */
function PrintSheet({ order, items }: { order: EquipOrder; items: EquipItem[] }) {
  const t = orderTotals(items, order.vat_included)
  let no = 0
  return (
    <div id="equip-print-area" className="fixed -left-[10000px] top-0 w-[800px] bg-white text-black">
      <h1 className="mb-1 text-center text-[26px] font-extrabold tracking-[0.6em]">발주서</h1>
      <div className="mb-3 flex justify-between text-[12px]">
        <div>
          <div className="text-[15px] font-bold">{order.title}</div>
          <div>작성일 : {order.quote_date ?? '-'}</div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-bold">{order.vendor}</div>
          {order.memo && <div className="max-w-[360px] whitespace-pre-wrap">{order.memo}</div>}
        </div>
      </div>
      <table className="w-full border-collapse text-[11.5px]">
        <thead>
          <tr>
            <td colSpan={7} className="border border-black px-2 py-1.5 text-[13px] font-bold">
              合計金 &nbsp; {wonInKorean(t.total)} 원整 <span className="float-right">{won(t.total)}</span>
            </td>
          </tr>
          <tr className="bg-[#f2f2f2]">
            {['NO', '품명', '규격', '수량', '단가', '금액', '비고'].map((h) => (
              <th key={h} className="border border-black px-1.5 py-1">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupBySection(items).map(([section, list]) => (
            <FragmentRows key={section} section={section}>
              {list.map((it) => {
                no++
                return (
                  <tr key={it.id} className="break-inside-avoid">
                    <td className="border border-black px-1 py-[3px] text-center">{no}</td>
                    <td className="border border-black px-1.5 py-[3px] text-center">{it.name}</td>
                    <td className="border border-black px-1.5 py-[3px] text-center">{it.spec}</td>
                    <td className="border border-black px-1.5 py-[3px] text-center">{qtyText(it.qty)}</td>
                    <td className="border border-black px-1.5 py-[3px] text-right">{num(it.unit_price)}</td>
                    <td className="border border-black px-1.5 py-[3px] text-right">{num(lineAmount(it))}</td>
                    <td className="border border-black px-1.5 py-[3px] text-center">{it.note}</td>
                  </tr>
                )
              })}
            </FragmentRows>
          ))}
          {[
            ['합 계', t.supply],
            ['부 가 세', t.vat],
            ['총 계', t.total],
          ].map(([label, v]) => (
            <tr key={label as string} className="break-inside-avoid font-bold">
              <td colSpan={5} className="border border-black px-2 py-1 text-center">{label}</td>
              <td colSpan={2} className="border border-black px-2 py-1 text-right">{num(v as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px]">
        {order.vat_included
          ? '* 단가는 부가세 포함 금액입니다. (합계·부가세는 역산)'
          : '* 단가는 부가세 별도 금액입니다.'}
      </p>
    </div>
  )
}

function FragmentRows({ section, children }: { section: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="break-inside-avoid">
        <td className="border border-black" />
        <td colSpan={6} className="border border-black px-2 py-[3px] font-bold">{section}</td>
      </tr>
      {children}
    </>
  )
}

/**
 * 발주리스트 — 주방 집기(업체 견적) / 쿠팡 발주 탭이 같은 화면을 쓴다.
 * 발주서를 골라 품목을 보고 고친다. [엑셀 업로드·비교]로 업체가 보낸
 * 새 견적을 지난 발주와 비교한 뒤 새 발주서로 저장한다.
 */
export function EquipOrders({
  kind,
  orders: allOrders,
  items,
  openLists,
  isOwner,
}: {
  kind: EquipOrderKind
  orders: EquipOrder[]
  items: EquipItem[]
  openLists: OpenList[]
  isOwner: boolean
}) {
  // 이 탭 종류의 발주서만
  const orders = useMemo(
    () => allOrders.filter((o) => orderKind(o) === kind),
    [allOrders, kind]
  )
  const [selected, setSelected] = useState<string | null>(orders[0]?.id ?? null)
  const [mode, setMode] = useState<'view' | 'create' | 'edit' | 'import' | 'links'>('view')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [addingSection, setAddingSection] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [checkMap, setCheckMap] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')
  const [, startTransition] = useTransition()

  const current = orders.find((o) => o.id === selected) ?? orders[0] ?? null

  const itemsOf = (orderId: string) =>
    items.filter((i) => i.order_id === orderId && !removed.has(i.id))

  const rows = useMemo(
    () => (current ? itemsOf(current.id) : []),
    [items, current?.id, removed]
  )
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => `${r.name} ${r.spec} ${r.note}`.toLowerCase().includes(q))
  }, [rows, query])

  const vatIn = current?.vat_included ?? false
  const totals = orderTotals(rows, vatIn)
  const openTitle = openLists.find((o) => o.id === current?.open_checklist_id)?.title

  // 주문함 체크 — 화면을 먼저 바꾸고 저장이 뒤따른다
  const isChecked = (it: EquipItem) => checkMap[it.id] ?? it.checked
  const checkedRows = rows.filter(isChecked)
  const checkedTotal = orderTotals(checkedRows, vatIn).total

  function toggleCheck(it: EquipItem) {
    if (!isOwner) return
    const next = !isChecked(it)
    setCheckMap((m) => ({ ...m, [it.id]: next }))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', it.id)
      fd.set('checked', String(next))
      await toggleEquipItem(fd)
    })
  }

  // 차례로 담기: 화면에 보이는 순서(섹션 순)대로 아직 체크 안 한 첫 품목
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const ordered = groupBySection(rows).flatMap(([, list]) => list)
  const nextItem = vatIn
    ? ordered.find((it) => !isChecked(it) && !skipped.has(it.id)) ?? null
    : null

  /** 아직 안 담은 품목을 "품명 / 규격 / 수량" 줄로 복사 (카톡으로 넘기기용) */
  async function copyList() {
    const text = ordered
      .filter((it) => !isChecked(it))
      .map((it) => `- ${it.name}${it.spec ? ` / ${it.spec}` : ''} × ${qtyText(it.qty)}`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(`[${current?.title ?? '발주'}] 남은 품목\n${text}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('복사하지 못했습니다. 브라우저 권한을 확인해주세요.')
    }
  }

  function resetChecks() {
    if (!current || !confirm('주문함 체크를 모두 지울까요?')) return
    setCheckMap(Object.fromEntries(rows.map((r) => [r.id, false])))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('order_id', current.id)
      await resetEquipChecks(fd)
    })
  }

  function removeItem(id: string) {
    if (!isOwner) return
    setRemoved((s) => new Set(s).add(id))
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteEquipItem(fd)
    })
  }

  function submitItem(e: React.FormEvent<HTMLFormElement>, after: () => void, action: (fd: FormData) => Promise<void>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    after()
    startTransition(async () => {
      await action(fd)
    })
  }

  async function downloadExcel() {
    if (!current) return
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet(toSheetRows(rows, vatIn))
    ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 36 }, { wch: 22 }, { wch: 7 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 40 }]
    // 링크 칸(I열)을 눌러서 열 수 있게 하이퍼링크로
    rows.forEach((_, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r: i + 1, c: 8 })]
      if (cell && typeof cell.v === 'string' && cell.v) cell.l = { Target: cell.v }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '발주리스트')
    XLSX.writeFile(wb, `${current.title || '발주리스트'}.xlsx`)
  }

  // ── 폼 / 업로드 화면 ───────────────────────────
  if (mode === 'create' || (mode === 'edit' && current)) {
    return (
      <OrderForm
        kind={kind}
        editing={mode === 'edit' ? current : null}
        orders={orders}
        openLists={openLists}
        onDone={() => setMode('view')}
        onCreated={(id) => setSelected(id)}
      />
    )
  }
  if (mode === 'links' && current) {
    return (
      <LinkEditor
        key={current.id}
        title={current.title}
        items={groupBySection(rows).flatMap(([, list]) => list)}
        onClose={() => setMode('view')}
      />
    )
  }
  if (mode === 'import') {
    return (
      <EquipImport
        kind={kind}
        orders={orders}
        items={items}
        openLists={openLists}
        defaultBaseId={current?.id ?? null}
        onCancel={() => setMode('view')}
        onSaved={(id) => {
          setSelected(id)
          setMode('view')
        }}
      />
    )
  }

  const toolbar = isOwner && (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" onClick={() => setMode('create')} className="btn-ghost !px-3 !py-1.5 !text-[13px]">
        + 새 발주서
      </button>
      <button type="button" onClick={() => setMode('import')} className="btn !px-3 !py-1.5 !text-[13px]">
        📥 엑셀 업로드 · 비교
      </button>
    </div>
  )

  if (!current) {
    return (
      <div className="card text-center">
        <p className="py-6 text-[13.5px] text-muted">
          아직 발주서가 없습니다.
          <br />
          {kind === 'coupang'
            ? '쿠팡에서 살 품목을 직접 추가하거나 엑셀로 올려 시작하세요.'
            : '업체 견적 엑셀을 올리거나 직접 만들어 시작하세요.'}
        </p>
        <div className="flex justify-center">{toolbar}</div>
      </div>
    )
  }

  const status = equipStatusMeta(current.status)
  let no = 0

  return (
    <>
      {/* ── 발주서 선택 ───────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {orders.map((o) => {
          const active = o.id === current.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setSelected(o.id)
                setEditingItem(null)
              }}
              className={`rounded-[10px] border px-3 py-1.5 text-[13px] font-bold transition ${
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-white text-ink-2 hover:border-brand/50 hover:text-ink'
              }`}
            >
              {o.title}
            </button>
          )
        })}
        <div className="ml-auto">{toolbar}</div>
      </div>

      {/* ── 요약 ───────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-extrabold">{current.title}</h3>
              <span className={`pill ${status.pill}`}>{status.label}</span>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              {current.vendor || '업체 미정'} · 작성일 {current.quote_date ?? '미정'}
              {openTitle && ` · 🏗️ ${openTitle}`}
            </p>
            {current.memo && (
              <p className="mt-1 whitespace-pre-wrap text-[12px] text-muted">{current.memo}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={downloadExcel} className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink">
              엑셀 받기
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink">
              인쇄 · PDF
            </button>
            {isOwner && (
              <>
                <button type="button" onClick={() => setMode('edit')} className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink">
                  수정
                </button>
                <form
                  action={deleteEquipOrder}
                  onSubmit={(e) => {
                    if (!confirm(`"${current.title}" 발주서를 삭제할까요? 품목도 모두 지워집니다.`)) e.preventDefault()
                  }}
                >
                  <input type="hidden" name="id" value={current.id} />
                  <button type="submit" className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad">
                    삭제
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-center shell:grid-cols-4">
          <div>
            <div className="text-[11.5px] text-muted">품목</div>
            <div className="text-[15px] font-extrabold tabular-nums">{num(rows.length)}개</div>
          </div>
          <div>
            <div className="text-[11.5px] text-muted">{vatIn ? '공급가 (역산)' : '합계 (공급가)'}</div>
            <div className="text-[15px] font-extrabold tabular-nums">{won(totals.supply)}</div>
          </div>
          <div>
            <div className="text-[11.5px] text-muted">{vatIn ? '부가세 (포함됨)' : '부가세'}</div>
            <div className="text-[15px] font-extrabold tabular-nums">{won(totals.vat)}</div>
          </div>
          <div>
            <div className="text-[11.5px] text-muted">총계</div>
            <div className="text-[15px] font-extrabold tabular-nums text-brand-deep">{won(totals.total)}</div>
          </div>
        </div>
        <p className="mt-2 text-right text-[11.5px] text-muted">
          {wonInKorean(totals.total)} 원整
        </p>

        {/* 쿠팡처럼 직접 담아 주문하는 발주 — 몇 개 담았는지 진행 표시 */}
        {vatIn && rows.length > 0 && (
          <div className="mt-3 border-t border-line-soft pt-3">
            <div className="flex items-center gap-2.5">
              <div className="bar">
                <span style={{ width: `${(checkedRows.length / rows.length) * 100}%` }} />
              </div>
              <span className="shrink-0 text-[13px] font-extrabold tabular-nums">
                {checkedRows.length}/{rows.length}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted">
              <span>
                ☑ 주문한 품목 {won(checkedTotal)} · 남은 금액 {won(totals.total - checkedTotal)} — 🛒을
                누르면 쿠팡 상품(또는 검색)이 열립니다
              </span>
              <span className="flex gap-1">
                {isOwner && (
                  <button type="button" onClick={() => setMode('links')} className="rounded-md px-1.5 py-0.5 font-semibold text-brand-deep hover:bg-brand/10">
                    🔗 링크 한꺼번에 입력 ({rows.filter((r) => r.link).length}/{rows.length})
                  </button>
                )}
                <button type="button" onClick={copyList} className="rounded-md px-1.5 py-0.5 font-semibold hover:bg-line-soft hover:text-ink">
                  {copied ? '복사됨 ✓' : '남은 목록 복사'}
                </button>
                {isOwner && checkedRows.length > 0 && (
                  <button type="button" onClick={resetChecks} className="rounded-md px-1.5 py-0.5 font-semibold hover:bg-line-soft hover:text-ink">
                    체크 모두 지우기
                  </button>
                )}
              </span>
            </div>

            {/* 차례로 담기 — 버튼 하나로 다음 품목 쿠팡 창 열기 + 체크 */}
            {isOwner && (
              nextItem ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-brand/30 bg-brand/[.04] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-brand-deep">
                      다음 담을 품목 · {nextItem.section}
                    </div>
                    <div className="truncate text-[13.5px] font-bold">
                      {nextItem.name}
                      {nextItem.spec && <span className="font-normal text-muted"> · {nextItem.spec}</span>}
                    </div>
                    <div className="text-[12px] text-ink-2">
                      수량 <b>{qtyText(nextItem.qty)}</b> · {won(lineAmount(nextItem))}
                    </div>
                  </div>
                  <button type="button" onClick={() => setSkipped((s) => new Set(s).add(nextItem.id))} className="btn-ghost !px-3 !py-1.5 !text-[12.5px]">
                    건너뛰기
                  </button>
                  <a
                    href={buyUrl(nextItem)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => toggleCheck(nextItem)}
                    className="btn !px-3 !py-1.5 !text-[12.5px] no-underline"
                  >
                    🛒 쿠팡 열고 체크 →
                  </a>
                </div>
              ) : (
                rows.length > checkedRows.length && skipped.size > 0 && (
                  <button type="button" onClick={() => setSkipped(new Set())} className="mt-3 text-[12px] font-semibold text-muted hover:text-ink">
                    건너뛴 품목 {skipped.size}개 다시 보기
                  </button>
                )
              )
            )}
          </div>
        )}
      </div>

      {/* ── 검색 ───────────────────────────────────── */}
      {rows.length > 8 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="품명 · 규격 검색"
          aria-label="품목 검색"
          className="fld-input mt-4"
        />
      )}

      {/* ── 섹션별 품목 표 — 큰 화면에선 주방 기물 | 홀 기물 나란히 ── */}
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
      {groupBySection(shown).map(([section, list]) => {
        const sub = orderTotals(list, vatIn)
        return (
          <div key={section} className="card !mb-0 min-w-0 xl:!p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-[15.5px] font-bold">{section}</h3>
              <span className="text-[12px] text-muted">{list.length}개</span>
              <span className="ml-auto text-[13px] font-bold tabular-nums">
                {won(vatIn ? sub.total : sub.supply)}
              </span>
            </div>

            {/* 큰 화면: 카드 안에서만 스크롤해 두 섹션이 한 화면에 들어오게 한다 */}
            <div className="-mx-1 overflow-x-auto xl:max-h-[calc(100vh-260px)] xl:overflow-y-auto">
              <table className="tbl min-w-[560px] text-[13px] xl:min-w-0 [&_td]:py-2 [&_th]:whitespace-nowrap [&_th]:py-2">
                <thead className="sticky top-0 z-[1] bg-white">
                  <tr>
                    <th className="w-[34px] !text-center">{vatIn ? '주문' : 'NO'}</th>
                    <th className="!text-left">품명</th>
                    <th className="!text-left">규격</th>
                    <th className="text-right">수량</th>
                    <th className="text-right">단가</th>
                    <th className="text-right">금액</th>
                    {isOwner && <th className="w-[64px]" />}
                  </tr>
                </thead>
                <tbody>
                  {list.map((it) => {
                    no++
                    if (editingItem === it.id) {
                      return (
                        <tr key={it.id}>
                          <td colSpan={isOwner ? 7 : 6}>
                            <form
                              onSubmit={(e) => submitItem(e, () => setEditingItem(null), saveEquipItem)}
                              className="rounded-[12px] border border-brand/40 bg-brand/[.03] p-2.5"
                            >
                              <input type="hidden" name="id" value={it.id} />
                              <ItemFields item={it} section={section} />
                              <div className="mt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingItem(null)} className="btn-ghost !py-1.5 !text-[12.5px]">취소</button>
                                <button type="submit" className="btn !py-1.5 !text-[12.5px]">수정 저장</button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )
                    }
                    const done = vatIn && isChecked(it)
                    return (
                      <tr key={it.id} className={done ? 'bg-good/[.05]' : undefined}>
                        <td className="!text-center text-muted tabular-nums">
                          {vatIn ? (
                            <button
                              type="button"
                              disabled={!isOwner}
                              onClick={() => toggleCheck(it)}
                              aria-label={done ? '주문 취소' : '주문함'}
                              className={`mx-auto grid h-[20px] w-[20px] place-items-center rounded border-2 text-[11px] font-bold transition disabled:opacity-50 ${
                                done ? 'border-brand bg-brand text-white' : 'border-line'
                              }`}
                            >
                              {done ? '✓' : ''}
                            </button>
                          ) : (
                            no
                          )}
                        </td>
                        <td className={`!text-left font-semibold ${done ? 'text-muted line-through' : ''}`}>
                          {it.name}
                          {(it.link || vatIn) && (
                            <a
                              href={buyUrl(it)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={it.link ? '구매 페이지 열기' : '쿠팡에서 검색'}
                              className="ml-1 inline-block rounded px-1 text-[12px] no-underline hover:bg-line-soft"
                            >
                              🛒
                            </a>
                          )}
                          {/* 비고는 칸을 따로 두지 않고 품명 아래에 작게 */}
                          {it.note && <div className="text-[11px] font-normal text-muted">{it.note}</div>}
                        </td>
                        <td className="!text-left text-[12px] text-ink-2">{it.spec}</td>
                        <td className="whitespace-nowrap tabular-nums">{qtyText(it.qty)}</td>
                        <td className="whitespace-nowrap tabular-nums">{num(it.unit_price)}</td>
                        <td className="whitespace-nowrap font-semibold tabular-nums">{num(lineAmount(it))}</td>
                        {isOwner && (
                          <td className="whitespace-nowrap !px-0">
                            <button type="button" onClick={() => setEditingItem(it.id)} className="rounded-md px-1 py-1 text-[11px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink">수정</button>
                            <button type="button" onClick={() => removeItem(it.id)} className="rounded-md px-1 py-1 text-[11px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad">삭제</button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 추가 폼은 눌렀을 때만 펼친다 — 평소엔 버튼 한 줄 */}
            {isOwner && !query && (addingSection === section ? (
              <form
                onSubmit={(e) => {
                  const form = e.currentTarget
                  submitItem(e, () => form.reset(), addEquipItem)
                }}
                className="mt-3 border-t border-line-soft pt-3"
              >
                <input type="hidden" name="order_id" value={current.id} />
                <ItemFields section={section} />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setAddingSection(null)} className="btn-ghost !px-3 !py-1.5 !text-[13px]">닫기</button>
                  <button type="submit" className="btn !px-3 !py-1.5 !text-[13px]">추가</button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingSection(section)}
                className="mt-2 w-full rounded-[10px] border border-dashed border-line py-1.5 text-[12.5px] font-semibold text-muted transition hover:border-brand/50 hover:text-ink"
              >
                + {section} 품목 추가
              </button>
            ))}
          </div>
        )
      })}
      </div>

      {rows.length === 0 && isOwner && (
        <div className="card mt-4">
          <h3 className="card-title">첫 품목 추가</h3>
          <form onSubmit={(e) => { const f = e.currentTarget; submitItem(e, () => f.reset(), addEquipItem) }}>
            <input type="hidden" name="order_id" value={current.id} />
            <ItemFields section={EQUIP_SECTIONS[0]} />
            <div className="mt-2 flex justify-end">
              <button type="submit" className="btn !py-1.5 !text-[13px]">추가</button>
            </div>
          </form>
        </div>
      )}

      <PrintSheet order={current} items={rows} />
    </>
  )
}
