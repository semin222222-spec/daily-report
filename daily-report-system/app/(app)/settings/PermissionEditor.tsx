'use client'

import { useState, useTransition } from 'react'
import {
  PERM_LEVELS,
  PERM_MENUS,
  resolveLevel,
  type PermLevel,
} from '@/lib/permissions'
import type { Profile } from '@/lib/types'
import { saveMenuPermissions } from './actions'

/**
 * 점장 계정 하나의 메뉴별 권한 편집.
 * 각 메뉴를 숨김 / 조회만 / 수정가능 중 하나로 정한다.
 */
export function PermissionEditor({ account }: { account: Profile }) {
  const [pending, startTransition] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

  // 현재 값으로 초기화 (없으면 수정가능)
  const [levels, setLevels] = useState<Record<string, PermLevel>>(() =>
    Object.fromEntries(
      PERM_MENUS.map((m) => [
        m.key,
        resolveLevel('manager', account.permissions, m.key),
      ])
    )
  )

  function setAll(level: PermLevel) {
    setLevels(Object.fromEntries(PERM_MENUS.map((m) => [m.key, level])))
  }

  function save() {
    startTransition(async () => {
      const res = await saveMenuPermissions(account.id, levels)
      setFlash({ ok: res.ok, msg: res.message })
    })
  }

  return (
    <div className="rounded-[10px] border border-line bg-line-soft/30 p-3.5">
      <p className="mb-3 text-[12.5px] text-ink-2">
        메뉴별로 이 계정의 권한을 정하세요. <b>숨김</b>이면 메뉴가 보이지 않고,{' '}
        <b>조회만</b>은 보기만, <b>수정가능</b>은 등록·수정·삭제까지 가능합니다.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="self-center text-[12px] font-semibold text-muted">
          일괄:
        </span>
        {PERM_LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setAll(l.value)}
            className="btn-ghost !px-2.5 !py-1 !text-[11px]"
          >
            전체 {l.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {PERM_MENUS.map((m) => (
          <div
            key={m.key}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-2 last:border-b-0"
          >
            <div>
              <div className="text-[13.5px] font-semibold">{m.label}</div>
              <div className="text-[11.5px] text-muted">{m.desc}</div>
            </div>

            <div className="flex overflow-hidden rounded-[9px] border border-line">
              {PERM_LEVELS.map((l) => {
                const active = levels[m.key] === l.value
                const tone =
                  l.value === 'hidden'
                    ? 'bg-ink-2 text-white'
                    : l.value === 'view'
                      ? 'bg-s1 text-white'
                      : 'bg-good text-white'
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() =>
                      setLevels((v) => ({ ...v, [m.key]: l.value }))
                    }
                    className={`px-3 py-1.5 text-[12px] font-bold transition ${
                      active ? tone : 'bg-white text-ink-2 hover:bg-line-soft'
                    }`}
                  >
                    {active && '✓ '}
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {flash && (
        <div
          className={`mt-3 text-[13px] font-semibold ${
            flash.ok ? 'text-good' : 'text-bad'
          }`}
          role="status"
        >
          {flash.msg}
        </div>
      )}

      <div className="btn-row">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn"
        >
          {pending ? '저장 중…' : '권한 저장'}
        </button>
      </div>
    </div>
  )
}
