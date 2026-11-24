'use client'

import { useState } from 'react'
import { ActionForm } from '@/components/ui/ActionForm'
import type { Profile, Store } from '@/lib/types'
import { PermissionEditor } from './PermissionEditor'
import {
  createManagerAccount,
  deleteManagerAccount,
  resetManagerPassword,
} from './actions'

/**
 * 오너 전용 점장 계정 관리.
 * 계정 생성·삭제·비밀번호 재설정은 전부 Supabase Admin API가 필요하므로
 * SUPABASE_SERVICE_ROLE_KEY 가 없으면 안내만 띄우고 폼을 잠근다.
 */
export function ManagerAccounts({
  managers,
  stores,
  currentUserId,
  serviceKeyReady,
}: {
  managers: Profile[]
  stores: Store[]
  currentUserId: string
  serviceKeyReady: boolean
}) {
  const storeName = (id: string | null) =>
    stores.find((s) => s.id === id)?.name ?? '—'
  // 계정별로 열린 패널 — 표·카드가 같은 상태를 쓴다
  const [modes, setModes] = useState<Record<string, Mode>>({})
  const rowProps = (m: Profile) => ({
    account: m,
    storeName: storeName(m.store_id),
    isSelf: m.id === currentUserId,
    disabled: !serviceKeyReady,
    mode: modes[m.id] ?? 'idle',
    setMode: (next: Mode) => setModes((v) => ({ ...v, [m.id]: next })),
  })

  return (
    <>
      {!serviceKeyReady && <ServiceKeyNotice />}

      <div className="card mt-4">
        <h3 className="card-title">점장 계정</h3>
        <p className="card-sub">
          발급된 계정은 지정한 매장 데이터에만 접근할 수 있습니다.
        </p>

        {/* 휴대폰: 계정마다 카드 한 장 */}
        <div className="space-y-2.5 shell:hidden">
          {managers.length === 0 && (
            <p className="py-6 text-center text-[13px] text-muted">
              아직 발급된 점장 계정이 없습니다.
            </p>
          )}
          {managers.map((m) => (
            <AccountCard key={m.id} {...rowProps(m)} />
          ))}
        </div>

        <div className="hidden overflow-x-auto shell:block">
          <table className="tbl">
            <thead>
              <tr>
                <th>아이디</th>
                <th>이름</th>
                <th>매장</th>
                <th>권한</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {managers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted">
                    아직 발급된 점장 계정이 없습니다.
                  </td>
                </tr>
              )}
              {managers.map((m) => (
                <AccountRow key={m.id} {...rowProps(m)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-4">
        <h3 className="card-title">+ 점장 계정 발급</h3>
        <p className="card-sub">
          아이디는 영문 소문자·숫자로 정합니다. 점장은 이 아이디만 입력해서
          로그인합니다.
        </p>
        <AddAccountForm stores={stores} disabled={!serviceKeyReady} />
      </div>
    </>
  )
}

function ServiceKeyNotice() {
  return (
    <div className="card mt-4 border-brand/30 bg-brand/[.05]">
      <h3 className="card-title">계정 관리를 쓰려면 키가 하나 필요합니다</h3>
      <p className="card-sub !mb-3">
        계정 발급·삭제는 Supabase 관리자 권한이 필요해서, 서버에만 두는 키가
        있어야 동작합니다.
      </p>
      <ol className="ml-4 list-decimal space-y-1.5 text-[13px] leading-relaxed text-ink-2">
        <li>
          Supabase Dashboard → <b>Settings → API</b> 로 들어갑니다.
        </li>
        <li>
          <b>service_role</b> 항목의 <b>Reveal</b> 을 눌러 값을 복사합니다.
          (<code className="rounded bg-line-soft px-1">eyJ…</code> 로 시작하는 긴 문자열)
        </li>
        <li>
          프로젝트의 <code className="rounded bg-line-soft px-1">.env.local</code> 파일에서
          <code className="rounded bg-line-soft px-1">SUPABASE_SERVICE_ROLE_KEY=</code> 뒤에
          붙여넣습니다.
        </li>
        <li>개발 서버를 껐다 켭니다. (배포 환경은 Vercel 환경변수에도 같이 등록)</li>
      </ol>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        이 키는 모든 매장 데이터에 접근할 수 있는 마스터 키입니다. 브라우저에
        노출되지 않도록 <b>절대 NEXT_PUBLIC_ 접두어를 붙이지 마세요.</b> 깃에도
        올라가지 않습니다(.env.local 은 .gitignore에 있음).
      </p>
    </div>
  )
}

// 'idle' → 버튼만 / 'perm' → 권한 설정 / 'confirm' → 삭제 / 'password' → 비번
type Mode = 'idle' | 'perm' | 'confirm' | 'password'

interface RowProps {
  account: Profile
  storeName: string
  isSelf: boolean
  disabled: boolean
  mode: Mode
  setMode: (m: Mode) => void
}

/** 권한 설정 / 비번 변경 / 삭제 버튼 (표·카드 공용) */
function AccountButtons({
  isSelf,
  disabled,
  mode,
  setMode,
  btnClass,
}: RowProps & { btnClass: string }) {
  const toggle = (m: Mode) => setMode(mode === m ? 'idle' : m)
  return (
    <>
      <button
        type="button"
        onClick={() => toggle('perm')}
        className={`btn-ghost ${btnClass} hover:!border-brand hover:!text-brand-deep`}
      >
        권한 설정
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => toggle('password')}
        className={`btn-ghost ${btnClass}`}
      >
        비번 변경
      </button>
      <button
        type="button"
        disabled={disabled || isSelf}
        title={isSelf ? '본인 계정은 삭제할 수 없습니다' : undefined}
        onClick={() => toggle('confirm')}
        className={`btn-ghost ${btnClass} hover:!border-bad hover:!text-bad`}
      >
        삭제
      </button>
    </>
  )
}

/** 열린 패널 (권한·삭제 확인·비번). idPrefix 는 표·카드 id 겹침 방지용 */
function AccountPanel({
  account,
  mode,
  setMode,
  idPrefix,
}: RowProps & { idPrefix: string }) {
  if (mode === 'perm') return <PermissionEditor account={account} />

  if (mode === 'confirm') {
    return (
      <div className="rounded-[10px] border border-bad/30 bg-bad/[.05] p-3.5">
        <p className="mb-2 text-[13px] text-ink-2">
          <b>{account.name}</b>({account.login_id}) 계정을 삭제할까요?
          로그인할 수 없게 됩니다. 이 점장이 입력한 마감·할일 기록은 그대로
          남습니다.
        </p>
        <ActionForm
          action={deleteManagerAccount}
          submitLabel="삭제 확정"
          onDone={() => setMode('idle')}
          extraButton={
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMode('idle')}
            >
              취소
            </button>
          }
        >
          <input type="hidden" name="user_id" value={account.id} />
        </ActionForm>
      </div>
    )
  }

  if (mode === 'password') {
    return (
      <div className="rounded-[10px] border border-line bg-line-soft/40 p-3.5">
        <ActionForm
          action={resetManagerPassword}
          submitLabel="비밀번호 변경"
          onDone={() => setMode('idle')}
          extraButton={
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMode('idle')}
            >
              취소
            </button>
          }
        >
          <input type="hidden" name="user_id" value={account.id} />
          <label className="fld-label" htmlFor={`${idPrefix}pw-${account.id}`}>
            {account.name} 님의 새 비밀번호 (8자 이상)
          </label>
          <input
            id={`${idPrefix}pw-${account.id}`}
            name="password"
            type="text"
            autoComplete="off"
            placeholder="새 비밀번호"
            className="fld-input"
          />
        </ActionForm>
      </div>
    )
  }

  return null
}

function AccountRow(props: RowProps) {
  const { account, storeName, mode } = props
  return (
    <>
      <tr>
        <td className="font-semibold tabular-nums">{account.login_id}</td>
        <td>{account.name}</td>
        <td>{storeName}</td>
        <td>점장</td>
        <td className="text-right">
          <div className="flex flex-wrap justify-end gap-1.5">
            <AccountButtons {...props} btnClass="!px-3 !py-1.5 !text-xs" />
          </div>
        </td>
      </tr>

      {mode !== 'idle' && (
        <tr>
          <td colSpan={5} className="!text-left">
            <AccountPanel {...props} idPrefix="" />
          </td>
        </tr>
      )}
    </>
  )
}

/** 휴대폰용 계정 카드 — 버튼은 한 줄, 패널은 카드 아래 전체 폭 */
function AccountCard(props: RowProps) {
  const { account, storeName, mode } = props
  return (
    <div className="space-y-2">
      <div className="rounded-[12px] border border-line p-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-semibold tabular-nums">{account.login_id}</span>
          <span className="text-[13px] text-ink-2">{account.name}</span>
        </div>
        <div className="mt-0.5 text-[12.5px] text-muted">
          {storeName} · 점장
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <AccountButtons {...props} btnClass="!px-2 !text-[12.5px]" />
        </div>
      </div>
      {mode !== 'idle' && <AccountPanel {...props} idPrefix="m-" />}
    </div>
  )
}

function AddAccountForm({
  stores,
  disabled,
}: {
  stores: Store[]
  disabled: boolean
}) {
  return (
    <ActionForm
      action={createManagerAccount}
      submitLabel="+ 계정 발급"
      disabled={disabled}
    >
      <div className="form-grid">
        <div>
          <label className="fld-label" htmlFor="acct-id">
            아이디 (영문)
          </label>
          <input
            id="acct-id"
            name="login_id"
            placeholder="예: ssuk"
            autoCapitalize="none"
            autoComplete="off"
            disabled={disabled}
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="acct-name">
            이름
          </label>
          <input
            id="acct-name"
            name="name"
            placeholder="예: 쑥고개 점장"
            disabled={disabled}
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="acct-store">
            담당 매장
          </label>
          <select
            id="acct-store"
            name="store_id"
            disabled={disabled}
            className="fld-input"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {/* 목록에 없는 매장을 맡기려면 매장부터 만들어야 한다 */}
          <p className="mt-1.5 text-[12px] text-muted">
            현재 매장 {stores.length}곳.{' '}
            <a
              href="#add-store"
              className="font-bold text-brand-deep hover:underline"
            >
              매장 추가하기 →
            </a>
          </p>
        </div>
        <div>
          <label className="fld-label" htmlFor="acct-pw">
            초기 비밀번호 (8자 이상)
          </label>
          <input
            id="acct-pw"
            name="password"
            type="text"
            autoComplete="off"
            placeholder="본인에게 전달할 임시 비밀번호"
            disabled={disabled}
            className="fld-input"
          />
        </div>
      </div>
    </ActionForm>
  )
}
