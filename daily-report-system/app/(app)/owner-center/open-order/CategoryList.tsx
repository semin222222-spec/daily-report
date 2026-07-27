'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { OcCategory } from '@/lib/owner-center'
import { addCategory, deleteCategory, renameCategory } from './actions'

export function CategoryList({
  categories,
  counts,
  done,
}: {
  categories: OcCategory[]
  counts: Record<string, number>
  /** 카테고리별 구매완료 품목 수 */
  done: Record<string, number>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  /**
   * 카드 색: 미완료 품목이 있으면 빨강, 전부 구매완료면 초록, 품목 없으면 기본.
   * (구매상태 = '구매완료' 기준)
   */
  function cardTone(id: string) {
    const total = counts[id] ?? 0
    const ok = done[id] ?? 0
    if (total === 0) return { card: '', dot: 'bg-line', label: '품목 없음', text: 'text-muted' }
    if (ok >= total)
      return {
        card: 'border-good/40 bg-good/[.05]',
        dot: 'bg-good',
        label: '완료',
        text: 'text-[#0a7d0a]',
      }
    return {
      card: 'border-bad/40 bg-bad/[.05]',
      dot: 'bg-bad',
      label: `${total - ok}개 미완료`,
      text: 'text-bad',
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 shell:grid-cols-3">
        {categories.map((c, i) => {
          const no = String(i + 1).padStart(2, '0')
          if (editing === c.id) {
            return (
              <form
                key={c.id}
                action={renameCategory}
                className="card"
                onSubmit={() => setEditing(null)}
              >
                <input type="hidden" name="id" value={c.id} />
                <label className="fld-label">카테고리 이름</label>
                <input
                  name="name"
                  defaultValue={c.name}
                  autoFocus
                  className="fld-input"
                />
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setEditing(null)}
                  >
                    취소
                  </button>
                  <button type="submit" className="btn">
                    저장
                  </button>
                </div>
              </form>
            )
          }

          const tone = cardTone(c.id)
          return (
            <div
              key={c.id}
              className={`card flex h-full flex-col ${tone.card}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted">{no}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(c.id)}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirming(confirming === c.id ? null : c.id)
                    }
                    className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <Link href={`/owner-center/open-order/${c.id}`} className="mt-1 block">
                <h3 className="text-[15px] font-bold hover:text-brand-deep">
                  {c.name}
                </h3>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${tone.dot}`}
                  />
                  <span className={`text-[12px] font-semibold ${tone.text}`}>
                    {tone.label}
                  </span>
                  <span className="text-[12px] text-muted">
                    · {counts[c.id] ?? 0}개 품목 →
                  </span>
                </div>
              </Link>

              {confirming === c.id && (
                <form
                  action={deleteCategory}
                  onSubmit={() => setConfirming(null)}
                  className="mt-3 rounded-[10px] border border-bad/30 bg-bad/[.05] p-2.5"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <p className="mb-2 text-[12px] text-ink-2">
                    <b>{c.name}</b> 카테고리와 안의 품목이 모두 삭제됩니다.
                  </p>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      className="btn-ghost !px-3 !py-1.5 !text-xs"
                      onClick={() => setConfirming(null)}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="btn !bg-bad !px-3 !py-1.5 !text-xs hover:!bg-bad"
                    >
                      삭제 확정
                    </button>
                  </div>
                </form>
              )}
            </div>
          )
        })}

        {/* 카테고리 추가 카드 */}
        {adding ? (
          <form
            action={addCategory}
            className="card"
            onSubmit={() => setAdding(false)}
          >
            <label className="fld-label">새 카테고리 이름</label>
            <input
              name="name"
              autoFocus
              placeholder="예: 인테리어 소품"
              className="fld-input"
            />
            <div className="btn-row">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setAdding(false)}
              >
                취소
              </button>
              <button type="submit" className="btn">
                추가
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="grid min-h-[92px] place-items-center rounded-card border-2 border-dashed border-line text-[14px] font-bold text-muted transition hover:border-brand hover:text-brand-deep"
          >
            + 카테고리 추가
          </button>
        )}
      </div>
    </>
  )
}
