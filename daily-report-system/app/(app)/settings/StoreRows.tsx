'use client'

import { Fragment, useState } from 'react'
import { ActionForm } from '@/components/ui/ActionForm'
import { StoreLogo } from '@/components/BrandMark'
import type { Profile, Store } from '@/lib/types'
import { setStoreActive, updateStore } from './actions'

/**
 * 매장 목록 + 인라인 수정.
 * 지점명은 로그인 화면 칩에 그대로 나오기 때문에 나중에 고칠 수 있어야 한다.
 */
export function StoreRows({
  stores,
  managers,
  logos,
}: {
  stores: Store[]
  managers: Profile[]
  /** tag → 로고 경로 (없으면 null) */
  logos: Record<string, string | null>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  return (
    <div className="overflow-x-auto">
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
            const isEditing = editing === s.id

            return (
              <Fragment key={s.id}>
                <tr className={s.is_active ? '' : 'opacity-55'}>
                  <td>
                    <span className="flex items-center gap-2 font-semibold">
                      <StoreLogo
                        tag={s.tag}
                        name={s.name}
                        color={s.color}
                        badge={s.badge}
                        size={18}
                        src={logos[s.tag]}
                      />
                      {s.name}
                      {!s.is_active && (
                        <span className="pill bg-line-soft text-muted">
                          비활성
                        </span>
                      )}
                    </span>
                  </td>
                  <td>{s.branch || <span className="text-muted">—</span>}</td>
                  <td className="tabular-nums">
                    {assigned.length > 0
                      ? assigned.map((m) => m.login_id).join(', ')
                      : <span className="text-muted">계정 없음</span>}
                  </td>
                  <td>
                    {logos[s.tag] ? (
                      <span className="pill pill-g">있음</span>
                    ) : (
                      <span className="text-[11.5px] text-muted">
                        {s.tag}.png 없음
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(isEditing ? null : s.id)}
                        className="btn-ghost !px-3 !py-1.5 !text-xs"
                      >
                        {isEditing ? '닫기' : '수정'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setToggling(toggling === s.id ? null : s.id)
                        }
                        className={`btn-ghost !px-3 !py-1.5 !text-xs ${
                          s.is_active
                            ? 'hover:!border-bad hover:!text-bad'
                            : ''
                        }`}
                      >
                        {s.is_active ? '비활성화' : '복구'}
                      </button>
                    </div>
                  </td>
                </tr>

                {toggling === s.id && (
                  <tr>
                    <td colSpan={5} className="!text-left">
                      <div
                        className={`rounded-[10px] border p-3.5 ${
                          s.is_active
                            ? 'border-bad/30 bg-bad/[.05]'
                            : 'border-line bg-line-soft/40'
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
                          onDone={() => setToggling(null)}
                          extraButton={
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => setToggling(null)}
                            >
                              취소
                            </button>
                          }
                        >
                          <input type="hidden" name="id" value={s.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={String(!s.is_active)}
                          />
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                )}

                {isEditing && (
                  <tr>
                    <td colSpan={5} className="!text-left">
                      <div className="rounded-[10px] border border-line bg-line-soft/40 p-3.5">
                        <ActionForm
                          action={updateStore}
                          submitLabel="매장 정보 저장"
                          onDone={() => setEditing(null)}
                          extraButton={
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => setEditing(null)}
                            >
                              취소
                            </button>
                          }
                        >
                          <input type="hidden" name="id" value={s.id} />
                          <div className="form-grid">
                            <div>
                              <label
                                className="fld-label"
                                htmlFor={`nm-${s.id}`}
                              >
                                매장 이름
                              </label>
                              <input
                                id={`nm-${s.id}`}
                                name="name"
                                defaultValue={s.name}
                                className="fld-input"
                              />
                            </div>
                            <div>
                              <label
                                className="fld-label"
                                htmlFor={`br-${s.id}`}
                              >
                                지점명
                              </label>
                              <input
                                id={`br-${s.id}`}
                                name="branch"
                                defaultValue={s.branch}
                                placeholder="예: 을지로점"
                                className="fld-input"
                              />
                            </div>
                            <div>
                              <label
                                className="fld-label"
                                htmlFor={`bd-${s.id}`}
                              >
                                배지 (한 글자)
                              </label>
                              <input
                                id={`bd-${s.id}`}
                                name="badge"
                                maxLength={2}
                                defaultValue={s.badge}
                                className="fld-input"
                              />
                            </div>
                            <div>
                              <label
                                className="fld-label"
                                htmlFor={`cl-${s.id}`}
                              >
                                매장 컬러
                              </label>
                              <input
                                id={`cl-${s.id}`}
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
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
