'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { verifyPin, type PinResult } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn w-full" disabled={pending}>
      {pending ? '확인 중…' : '들어가기'}
    </button>
  )
}

/** 점주센터 진입 PIN 입력 */
export function PinGate() {
  const [state, formAction] = useFormState<PinResult | null, FormData>(
    verifyPin,
    null
  )

  return (
    <div className="mx-auto mt-10 max-w-[380px]">
      <div className="card text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-[28px]">
          🔐
        </div>
        <h3 className="card-title !text-[17px]">점주센터</h3>
        <p className="card-sub !mb-5">
          삐딱 점주 전용 공간입니다. PIN을 입력해주세요.
        </p>

        <form action={formAction}>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="PIN 번호"
            className="fld-input mb-3 text-center text-lg tracking-[.3em]"
          />
          {state && !state.ok && (
            <div className="mb-3 text-[13px] font-semibold text-bad" role="alert">
              {state.message}
            </div>
          )}
          <SubmitButton />
        </form>

        <p className="mt-4 text-[12px] text-muted">
          PIN을 모르면 본사(오너)에게 문의하세요.
        </p>
      </div>
    </div>
  )
}
