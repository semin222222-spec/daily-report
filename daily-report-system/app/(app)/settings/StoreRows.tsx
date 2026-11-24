'use client'

import { Fragment, useState } from 'react'
import { ActionForm } from '@/components/ui/ActionForm'
import { StoreLogo } from '@/components/BrandMark'
import type { Profile, Store } from '@/lib/types'
import { setStoreActive, updateStore } from './actions'

/**
 * 매장 목록 + 인라인 수정.
 * 지점명은 로그인 화면 칩에 그대로 나오기 때문에 나중에 고칠 수 있어야 한다.
 * 휴대폰에선 표 대신 매장마다 카드 한 장.
 */
export function StoreRows({
  stores,
  managers,
  logos,
}: {
  stores: Store[]
  managers: Profile[]
  /** 매장 id → 로고 경로 (없으면 null) */
  logos: Record<string, string | null>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  // 표·카드 공용 조각
  const nameOf = (s: Store) => (
    <span className="flex items-center gap-2 font-semibold">
      <StoreLogo
        tag={s.tag}
        name={s.name}
        color={s.color}
        badge={s.badge}
        size={18}
        src={logos[s.id]}
      />
      {s.name}
      {!s.is_active && (
        <span className="pill bg-line-soft text-muted">비활성</span>
      )}
    </span>
  )
  const accountsOf = (assigned: Profile[]) =>
    assigned.length > 0 ? (
      assigned.map((m) => m.login_id).join(', ')
    ) : (
      <span className="text-muted">계정 없음</span>
    )
  const logoOf = (s: Store) =>
    logos[s.id] ? (
      <span className="pill pill-g">있음</span>
    ) : (
      <span className="text-[11.5px] text-muted">{s.tag}.png 없음</span>
    )
  const buttonsOf = (s: Store, btnClass: string) => {
    const isEditing = editing === s.id
    return (
      <>
        <button
          type="button"
          onClick={() => setEditing(isEditing ? null : s.id)}
          className={`btn-ghost ${btnClass}`}
        >
          {isEditing ? '닫기' : '수정'}
        </button>
        <button
          type="button"
          onClick={() => setToggling(toggling === s.id ? null : s.id)}
          className={`btn-ghost ${btnClass} ${
            s.is_active ? 'hover:!border-bad hover:!text-bad' : ''
          }`}
        >
          {s.is_active ? '비활성화' : '복구'}
        </button>
      </>
    )
  }
  const panelsOf = (s: Store, assigned: Profile[], idPrefix: string) => (
    <>
      {toggling === s.id && (
        <TogglePanel
          store={s}
          assigned={assigned}
          onClose={() => setToggling(null)}
        />
      )}
      {editing === s.id && (
        <EditPanel
          store={s}
          idPrefix={idPrefix}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )

  return (
    <>
      {/* 휴대폰: 카드 목록 */}
      <div className="space-y-2.5 shell:hidden">
        {stores.map((s) => {
          const assigned = managers.filter((m) => m.store_id === s.id)
          return (
            <div key={s.id} className="space-y-2">
              <div
                className={`rounded-[12px] border border-line p-3 ${
                  s.is_active ? '' : 'opacity-55'
                }`}
              >
                {nameOf(s)}
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-muted">지점명</dt>
                  <dd>{s.branch || <span className="text-muted">—</span>}</dd>
                  <dt className="text-muted">점장 계정</dt>
                  <dd className="break-all tabular-nums">{accountsOf(assigned)}</dd>
                  <dt className="text-muted">로고</dt>
                  <dd>{logoOf(s)}</dd>
                </dl>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {buttonsOf(s, '!px-3 !text-[13px]')}
                </div>
              </div>
              {panelsOf(s, assigned, 'm-')}
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto shell:block">
        <table className="tbl">
          <thead>
            <tr>
              <th>매장</th>
              <th>지점명</th>
              <th>점장 계정</th>
              <th>로고</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => {
              const assigned = managers.filter((m) => m.store_id === s.id)

              return (
                <Fragment key={s.id}>
                  <tr className={s.is_active ? '' : 'opacity-55'}>
                    <td>{nameOf(s)}</td>
                    <td>{s.branch || <span className="text-muted">—</span>}</td>
                    <td className="tabular-nums">{accountsOf(assigned)}</td>
                    <td>{logoOf(s)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {buttonsOf(s, '!px-3 !py-1.5 !text-xs')}
                      </div>
                    </td>
                  </tr>

                  {toggling === s.id && (
                    <tr>
                      <td colSpan={5} className="!text-left">
                        <TogglePanel
                          store={s}
                          assigned={assigned}
                          onClose={() => setToggling(null)}
                        />
                      </td>
                    </tr>
                  )}

                  {editing === s.id && (
                    <tr>
                      <td colSpan={5} className="!text-left">
                        <EditPanel
                          store={s}
                          idPrefix=""
                          onClose={() => setEditing(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

/** 비활성화 / 복구 확인 */
function TogglePanel({
  store: s,
  assigned,
  onClose,
}: {
  store: Store
  assigned: Profile[]
  onClose: () => void
}) {
  return (
    <div
      className={`rounded-[10px] border p-3.5 ${
        s.is_active ? 'border-bad/30 bg-bad/[.05]' : 'border-line bg-line-soft/40'
      }`}
    >
      <p className="mb-2 text-[13px] text-ink-2">
        {s.is_active ? (
          <>
            <b>{s.name}</b>을(를) 비활성화할까요? 매장
            스위처·계정 발급 목록에서 사라집니다.{' '}
            <b>기록(마감·정산·스케줄)은 지워지지 않고</b>{' '}
            그대로 남아서, 복구하면 다시 보입니다.
            {assigned.length > 0 && (
              <>
                {' '}
                이 매장 담당 점장(
                {assigned.map((m) => m.login_id).join(', ')})은
                로그인해도 들어올 수 없게 됩니다.
              </>
            )}
          </>
        ) : (
          <>
            <b>{s.name}</b>을(를) 다시 활성화할까요? 원래
            데이터가 그대로 돌아옵니다.
          </>
        )}
      </p>
      <ActionForm
        action={setStoreActive}
        submitLabel={s.is_active ? '비활성화' : '복구하기'}
        onDone={onClose}
        extraButton={
          <button type="button" className="btn-ghost" onClick={onClose}>
            취소
          </button>
        }
      >
        <input type="hidden" name="id" value={s.id} />
        <input type="hidden" name="active" value={String(!s.is_active)} />
      </ActionForm>
    </div>
  )
}

/** 매장 정보 수정 폼. idPrefix 는 표·카드가 같이 그려질 때 id 겹침 방지용 */
function EditPanel({
  store: s,
  idPrefix,
  onClose,
}: {
  store: Store
  idPrefix: string
  onClose: () => void
}) {
  return (
    <div className="rounded-[10px] border border-line bg-line-soft/40 p-3.5">
      <ActionForm
        action={updateStore}
        submitLabel="매장 정보 저장"
        onDone={onClose}
        extraButton={
          <button type="button" className="btn-ghost" onClick={onClose}>
            취소
          </button>
        }
      >
        <input type="hidden" name="id" value={s.id} />
        <div className="form-grid">
          <div>
            <label className="fld-label" htmlFor={`${idPrefix}nm-${s.id}`}>
              매장 이름
            </label>
            <input
              id={`${idPrefix}nm-${s.id}`}
              name="name"
              defaultValue={s.name}
              className="fld-input"
            />
          </div>
          <div>
            <label className="fld-label" htmlFor={`${idPrefix}br-${s.id}`}>
              지점명
            </label>
            <input
              id={`${idPrefix}br-${s.id}`}
              name="branch"
              defaultValue={s.branch}
              placeholder="예: 을지로점"
              className="fld-input"
            />
          </div>
          <div>
            <label className="fld-label" htmlFor={`${idPrefix}bd-${s.id}`}>
              배지 (한 글자)
            </label>
            <input
              id={`${idPrefix}bd-${s.id}`}
              name="badge"
              maxLength={2}
              defaultValue={s.badge}
              className="fld-input"
            />
          </div>
          <div>
            <label className="fld-label" htmlFor={`${idPrefix}cl-${s.id}`}>
              매장 컬러
            </label>
            <input
              id={`${idPrefix}cl-${s.id}`}
              name="color"
              type="color"
              defaultValue={s.color}
              className="fld-input h-[42px] p-1"
            />
          </div>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          태그({s.tag})는 로고 파일명·기존 데이터와 묶여 있어
          바꿀 수 없습니다.
        </p>
      </ActionForm>
    </div>
  )
}
