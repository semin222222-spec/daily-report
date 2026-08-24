'use client'

import { useState, useTransition } from 'react'
import { DEFAULT_VENDORS } from '@/lib/purchases'
import type { PurchaseVendor } from '@/lib/types'
import {
  addVendor,
  deleteVendor,
  moveVendor,
  renameVendor,
  seedVendors,
  toggleVendor,
} from './actions'

/**
 * 거래처 관리 — 매입표의 열을 만드는 곳.
 *
 * 삭제 대신 "끄기"를 기본으로 둔다. 거래를 끊은 거래처를 지우면 지난달 매입
 * 기록까지 함께 사라지기 때문(on delete cascade). 완전 삭제는 확인을 받는다.
 */
export function VendorManager({
  vendors,
  readOnly,
}: {
  vendors: PurchaseVendor[]
  readOnly: boolean
}) {
  const [open, setOpen] = useState(vendors.length === 0)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  function run(fn: () => Promise<{ ok: boolean; message: string } | void>) {
    startTransition(async () => {
      const res = await fn()
      if (res) setMsg({ ok: res.ok, text: res.message })
    })
  }

  function submitNew() {
    const name = newName.trim()
    if (!name) return
    const fd = new FormData()
    fd.set('name', name)
    setNewName('')
    run(() => addVendor(fd))
  }

  function submitRename(id: string) {
    const name = editName.trim()
    if (!name) return
    const fd = new FormData()
    fd.set('id', id)
    fd.set('name', name)
    setEditing(null)
    run(() => renameVendor(fd))
  }

  function simple(
    action: (fd: FormData) => Promise<void>,
    fields: Record<string, string>
  ) {
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields)) fd.set(k, v)
    run(() => action(fd))
  }

  if (readOnly) return null

  return (
    <div className="card mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="card-title">거래처 관리</h3>
          <p className="card-sub !mb-0">
            여기서 등록한 거래처가 위 매입표의 열이 됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn-ghost !px-3 !py-1.5 !text-xs"
        >
          {open ? '접기' : `열기 (${vendors.length}곳)`}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {vendors.length === 0 && (
            <div className="mb-4 rounded-[10px] border border-line bg-line-soft/40 p-3">
              <p className="mb-2 text-[13px] text-ink-2">
                기본 거래처 {DEFAULT_VENDORS.length}곳을 한 번에 넣을 수
                있습니다 — {DEFAULT_VENDORS.join(' · ')}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => seedVendors())}
                className="btn !py-2 !text-[13px]"
              >
                기본 거래처 불러오기
              </button>
            </div>
          )}

          <ul className="mb-4 space-y-2">
            {vendors.map((v, i) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line px-3 py-2"
              >
                {editing === v.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename(v.id)
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      autoFocus
                      aria-label="거래처 이름"
                      className="fld-input min-w-0 flex-1 !py-1.5 !text-[13px]"
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => submitRename(v.id)}
                      className="btn !py-1.5 !text-xs"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="btn-ghost !px-3 !py-1.5 !text-xs"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`min-w-0 flex-1 truncate text-[14px] font-bold ${
                        v.is_active ? 'text-ink' : 'text-muted line-through'
                      }`}
                    >
                      {v.name}
                    </span>
                    {!v.is_active && (
                      <span className="pill bg-line-soft text-muted">사용 안 함</span>
                    )}

                    <button
                      type="button"
                      disabled={pending || i === 0}
                      onClick={() => simple(moveVendor, { id: v.id, dir: 'up' })}
                      aria-label="위로"
                      className="btn-ghost !min-h-0 !px-2.5 !py-1.5 !text-xs disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={pending || i === vendors.length - 1}
                      onClick={() => simple(moveVendor, { id: v.id, dir: 'down' })}
                      aria-label="아래로"
                      className="btn-ghost !min-h-0 !px-2.5 !py-1.5 !text-xs disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditing(v.id)
                        setEditName(v.name)
                      }}
                      className="btn-ghost !min-h-0 !px-3 !py-1.5 !text-xs"
                    >
                      이름
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        simple(toggleVendor, {
                          id: v.id,
                          active: v.is_active ? '0' : '1',
                        })
                      }
                      title={
                        v.is_active
                          ? '매입표에서 숨깁니다. 지난 기록은 그대로 남습니다.'
                          : '매입표에 다시 표시합니다.'
                      }
                      className="btn-ghost !min-h-0 !px-3 !py-1.5 !text-xs"
                    >
                      {v.is_active ? '끄기' : '켜기'}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (
                          !confirm(
                            `'${v.name}'을(를) 완전히 삭제합니다.\n이 거래처의 지난 매입 기록도 모두 사라집니다. 계속할까요?`
                          )
                        ) {
                          return
                        }
                        simple(deleteVendor, { id: v.id })
                      }}
                      aria-label="삭제"
                      className="grid !min-h-0 w-9 place-items-center rounded-[10px] border
                                 border-line py-1.5 text-xs text-muted transition
                                 hover:border-bad hover:text-bad"
                    >
                      ✕
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNew()
              }}
              placeholder="거래처 이름 (예: 태산(고기))"
              aria-label="새 거래처 이름"
              className="fld-input min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={pending || !newName.trim()}
              onClick={submitNew}
              className="btn shrink-0"
            >
              + 거래처 추가
            </button>
          </div>

          {msg && (
            <div
              className={`mt-3 text-[13px] font-semibold ${
                msg.ok ? 'text-good' : 'text-bad'
              }`}
              role="status"
            >
              {msg.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
