'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

const DOMAIN = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN || 'bbiddak.com'

/**
 * 점장들은 이메일 대신 아이디("bbiddak")만 입력한다.
 * Supabase Auth는 이메일이 필요하므로 내부적으로 <아이디>@<도메인> 으로 변환해 인증한다.
 */
function toEmail(loginId: string) {
  const id = loginId.trim().toLowerCase()
  return id.includes('@') ? id : `${id}@${DOMAIN}`
}

/**
 * Supabase 인증 에러를 사람이 읽을 수 있는 문구로.
 *
 * 전부 "비밀번호가 틀렸습니다"로 뭉뚱그리면 실제 원인(계정 미승인, 도메인 거부,
 * 요청 제한)을 찾는 데 한참 걸린다. 코드별로 갈라준다.
 */
function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'invalid_credentials':
      return '아이디 또는 비밀번호가 올바르지 않습니다.'
    case 'email_not_confirmed':
      return '계정이 아직 활성화되지 않았습니다. 관리자에게 문의해주세요.'
    case 'email_address_invalid':
      return '계정 형식이 서버에서 거부되었습니다. 관리자에게 문의해주세요.'
    case 'over_request_rate_limit':
    case 'too_many_requests':
      return '시도가 너무 잦습니다. 잠시 후 다시 시도해주세요.'
    case 'user_banned':
      return '사용이 정지된 계정입니다. 관리자에게 문의해주세요.'
    default:
      return fallback || '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
  }
}

export interface LoginHint {
  login_id: string
  name: string
  role: string
  store_name: string
}

export function LoginForm({
  hints,
  notice,
}: {
  /** 실제 발급된 계정 목록 (login_hints() 결과) */
  hints: LoginHint[]
  /** 세션이 끊긴 사유 안내 (프로필 없음 / 매장 없음 등) */
  notice?: string | null
}) {
  const router = useRouter()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return

    if (!loginId.trim() || !password) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }

    setBusy(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: toEmail(loginId),
      password,
    })

    if (authError) {
      setError(authErrorMessage(authError.code, authError.message))
      setBusy(false)
      return
    }

    // refresh()로 서버 컴포넌트가 새 세션 쿠키를 읽게 한 뒤 이동한다.
    // 순서를 바꾸면 대시보드가 미인증 상태로 먼저 렌더돼 로그인 화면으로 튕긴다.
    router.refresh()
    router.push('/dashboard')
  }

  // 아이디 힌트 — 클릭하면 아이디 칸만 채운다(비밀번호는 채우지 않는다)

  return (
    <div className="flex flex-col justify-center bg-white px-[38px] py-[42px]">
      <h2 className="m-0 mb-1 text-xl font-bold">로그인</h2>
      <p className="m-0 mb-6 text-[13px] text-muted">
        매장 계정으로 로그인하면 해당 매장으로 들어갑니다.
      </p>

      {notice && (
        <div className="mb-4 rounded-[10px] border border-brand/30 bg-brand/[.07] px-3.5 py-3 text-[12.5px] leading-relaxed text-brand-deep">
          {notice}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="mb-3.5">
          <label htmlFor="login-id" className="fld-label">
            아이디
          </label>
          <input
            id="login-id"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="아이디"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full rounded-[11px] border border-line bg-[#fbfaf8] px-[13px] py-3 text-base
                       outline-none transition focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/[.12]"
          />
        </div>

        <div className="mb-3.5">
          <label htmlFor="login-pw" className="fld-label">
            비밀번호
          </label>
          <input
            id="login-pw"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[11px] border border-line bg-[#fbfaf8] px-[13px] py-3 text-base
                       outline-none transition focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/[.12]"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-[11px] border-0 bg-brand py-[13px] text-[15px] font-extrabold
                     tracking-[.01em] text-white transition hover:bg-brand-deep
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? '확인 중…' : '로그인'}
        </button>

        <div className="mt-2 min-h-[16px] text-[12.5px] text-bad" role="alert">
          {error}
        </div>
      </form>

      {/* 실제 발급된 계정만 보여준다. 없으면 이 영역 자체가 사라진다. */}
      {hints.length > 0 && (
        <div className="mt-5 border-t border-dashed border-line pt-4">
          <div className="mb-2 text-[11.5px] font-bold tracking-[.02em] text-muted">
            계정 안내 (클릭하면 아이디가 입력됩니다)
          </div>
          {hints.map((h) => (
            <button
              key={h.login_id}
              type="button"
              onClick={() => setLoginId(h.login_id)}
              className="mb-1.5 flex w-full justify-between gap-2 rounded-[9px] border border-line
                         bg-[#f7f5f1] px-[11px] py-2 text-left text-[12.5px] text-ink-2
                         transition hover:border-brand hover:text-ink"
            >
              <span className="min-w-0 truncate">
                <b className="text-ink">{h.login_id}</b> · {h.name}
              </span>
              <span className="shrink-0">
                {h.role === 'owner' ? '모든 매장' : h.store_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
