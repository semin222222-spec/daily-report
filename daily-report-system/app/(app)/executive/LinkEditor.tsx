'use client'

import { useState } from 'react'
import { coupangSearchUrl, groupBySection, type EquipItem } from '@/lib/equip-order'
import { saveEquipLink } from './equip-actions'

type SaveState = 'saving' | 'saved' | 'error'

/**
 * 구매 링크 한꺼번에 입력.
 * 품목마다 입력칸이 있고, 쿠팡 앱 「공유 → 링크 복사」한 것을 붙여넣으면 바로 저장된다.
 * 한 번 넣어 두면 🛒 버튼이 검색 대신 그 상품 페이지로 바로 간다.
 */
export function LinkEditor({
  title,
  items,
  onClose,
}: {
  title: string
  items: EquipItem[]
  onClose: () => void
}) {
  // 저장한 링크를 화면에 바로 반영 (서버 새로고침을 기다리지 않음)
  const [links, setLinks] = useState<Record<string, string>>(
    () => Object.fromEntries(items.map((it) => [it.id, it.link ?? '']))
  )
  const [state, setState] = useState<Record<string, SaveState>>({})
  const [onlyEmpty, setOnlyEmpty] = useState(true)

  const filled = items.filter((it) => links[it.id]).length
  // 기준은 처음 열 때의 링크 — 붙여넣는 즉시 줄이 사라지지 않게
  const visible = onlyEmpty ? items.filter((it) => !it.link) : items

  async function save(id: string, raw: string) {
    const prev = links[id] ?? ''
    if (raw.trim() === prev) return
    setState((s) => ({ ...s, [id]: 'saving' }))
    try {
      const res = await saveEquipLink(id, raw)
      if (!res.ok) {
        setState((s) => ({ ...s, [id]: 'error' }))
        return
      }
      setLinks((l) => ({ ...l, [id]: res.link }))
      setState((s) => ({ ...s, [id]: 'saved' }))
    } catch {
      setState((s) => ({ ...s, [id]: 'error' }))
    }
  }

  return (
    <>
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="card-title">🔗 링크 한꺼번에 입력 — {title}</h3>
            <p className="card-sub">
              쿠팡 앱에서 상품을 열고 <b>공유 → 링크 복사</b> 한 뒤 해당 칸에 붙여넣으면 바로
              저장됩니다. 상품명이 같이 붙어 와도 주소만 골라 저장합니다. 🔍 를 누르면 쿠팡에서
              그 품목을 검색합니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn !px-3 !py-1.5 !text-[13px]">
            완료
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[200px] flex-1 items-center gap-2.5">
            <div className="bar">
              <span style={{ width: `${items.length ? (filled / items.length) * 100 : 0}%` }} />
            </div>
            <span className="shrink-0 text-[13px] font-extrabold tabular-nums">
              {filled}/{items.length}
            </span>
          </div>
          <label className="flex items-center gap-1.5 text-[12.5px] font-semibold">
            <input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} />
            처음 열 때 링크 없던 품목만
          </label>
        </div>
      </div>

      {groupBySection(visible).map(([section, list]) => (
        <div key={section} className="card mt-4">
          <h3 className="mb-2 text-[15px] font-bold">
            {section} <span className="text-[12px] font-normal text-muted">{list.length}개</span>
          </h3>
          <div className="divide-y divide-line-soft">
            {list.map((it) => {
              const st = state[it.id]
              return (
                <div key={it.id} className="flex flex-wrap items-center gap-2 py-2">
                  <div className="w-full min-w-0 shell:w-[38%]">
                    <div className="truncate text-[13px] font-semibold">{it.name}</div>
                    {it.spec && <div className="truncate text-[11.5px] text-muted">{it.spec}</div>}
                  </div>
                  <a
                    href={coupangSearchUrl(it.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="쿠팡에서 검색"
                    className="rounded-md px-1.5 py-1 text-[14px] no-underline hover:bg-line-soft"
                  >
                    🔍
                  </a>
                  <input
                    defaultValue={links[it.id]}
                    placeholder="쿠팡 링크 붙여넣기"
                    aria-label={`${it.name} 구매 링크`}
                    onPaste={(e) => {
                      // 붙여넣자마자 저장 — 칸을 벗어날 필요 없이 다음 칸으로
                      const text = e.clipboardData.getData('text')
                      const url = text.match(/https?:\/\/[^\s"'<>]+/i)?.[0]
                      if (url) {
                        e.preventDefault()
                        e.currentTarget.value = url
                        save(it.id, url)
                      }
                    }}
                    onBlur={(e) => save(it.id, e.currentTarget.value)}
                    className={`fld-input min-w-0 flex-1 !py-1.5 !text-[12.5px] ${
                      st === 'error' ? '!border-bad' : st === 'saved' ? '!border-good' : ''
                    }`}
                  />
                  <span className="w-[52px] shrink-0 text-[11.5px] font-semibold">
                    {st === 'saving' && <span className="text-muted">저장 중</span>}
                    {st === 'saved' && <span className="text-good">✓ 저장</span>}
                    {st === 'error' && <span className="text-bad">주소 확인</span>}
                    {!st && links[it.id] && (
                      <a href={links[it.id]} target="_blank" rel="noopener noreferrer" className="text-muted no-underline hover:text-ink">
                        열기 ↗
                      </a>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {visible.length === 0 && (
        <div className="card mt-4 py-6 text-center text-[13px] text-muted">
          모든 품목에 링크가 들어가 있습니다 👍
        </div>
      )}
    </>
  )
}
