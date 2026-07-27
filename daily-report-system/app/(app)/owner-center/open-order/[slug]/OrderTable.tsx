'use client'

import { useEffect, useState } from 'react'
import type { OrderCategory } from '@/lib/owner-center'

/**
 * 발주 품목 표 + 입고 체크.
 *
 * 지금은 체크 상태를 브라우저(localStorage)에 저장하는 미리보기 단계다.
 * 디자인이 확정되면 DB로 옮겨 매장·점주별로 저장·공유되게 한다.
 */
export function OrderTable({ category }: { category: OrderCategory }) {
  const storeKey = `oc_order_${category.slug}`
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey)
      if (raw) setChecked(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [storeKey])

  function toggle(code: string) {
    setChecked((prev) => {
      const next = { ...prev, [code]: !prev[code] }
      try {
        localStorage.setItem(storeKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const doneCount = category.items.filter((i) => checked[i.code]).length
  const pct = category.items.length
    ? Math.round((doneCount / category.items.length) * 100)
    : 0

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="card-title !mb-0">품목 목록</h3>
        <span className="text-[13px] text-muted">
          입고 완료{' '}
          <b className="text-ink">
            {doneCount}/{category.items.length}
          </b>{' '}
          ({pct}%)
        </span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="!text-center">입고</th>
              <th>품목명</th>
              <th>규격/모델</th>
              <th>기준수량</th>
            </tr>
          </thead>
          <tbody>
            {category.items.map((it) => {
              const on = loaded && checked[it.code]
              return (
                <tr key={it.code} className={on ? 'opacity-55' : ''}>
                  <td className="!text-center">
                    <button
                      type="button"
                      onClick={() => toggle(it.code)}
                      aria-label={on ? '입고 취소' : '입고 완료'}
                      className="-m-2 grid h-10 w-10 place-items-center p-2"
                    >
                      <span
                        className={`grid h-[22px] w-[22px] place-items-center rounded border-2 text-[12px] font-bold transition ${
                          on
                            ? 'border-brand bg-brand text-white'
                            : 'border-line'
                        }`}
                      >
                        {on ? '✓' : ''}
                      </span>
                    </button>
                  </td>
                  <td>
                    <span
                      className={`font-semibold ${on ? 'line-through' : ''}`}
                    >
                      {it.name}
                    </span>
                    <span className="ml-1.5 text-[11px] text-muted">
                      {it.code}
                    </span>
                  </td>
                  <td className="text-ink-2">{it.spec || '—'}</td>
                  <td className="tabular-nums">
                    {it.qty || '—'}{' '}
                    <span className="text-muted">{it.unit}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        지금은 체크가 이 브라우저에만 저장되는 미리보기입니다. 확정되면
        매장·점주별로 저장되고, 사진·구매링크·예상단가도 함께 관리하게 만들 수
        있습니다.
      </p>
    </div>
  )
}
