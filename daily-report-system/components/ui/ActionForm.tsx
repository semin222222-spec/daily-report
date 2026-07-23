'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

export interface ActionResult {
  ok: boolean
  message: string
}

export type FormAction = (
  prev: ActionResult | null,
  formData: FormData
) => Promise<ActionResult>

function SubmitButton({
  label,
  disabled,
}: {
  label: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn" disabled={pending || disabled}>
      {pending ? '저장 중…' : label}
    </button>
  )
}

/**
 * 서버 액션 + 결과 메시지 + 제출 버튼을 묶은 얇은 래퍼.
 * 설정 화면처럼 "폼 여러 개가 각자 저장되는" 곳에서 반복을 줄인다.
 */
export function ActionForm({
  action,
  submitLabel = '저장',
  disabled,
  extraButton,
  onDone,
  children,
}: {
  action: FormAction
  submitLabel?: string
  /** 필수 설정이 빠져 폼을 잠가야 할 때 */
  disabled?: boolean
  /** 제출 버튼 왼쪽에 놓을 취소 버튼 등 */
  extraButton?: React.ReactNode
  /** 성공했을 때 호출 — 인라인 폼을 접는 용도 */
  onDone?: () => void
  children: React.ReactNode
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    action,
    null
  )

  useEffect(() => {
    if (state?.ok) onDone?.()
    // onDone은 매 렌더 새로 만들어지므로 의존성에서 뺀다 — 넣으면 무한 루프가 난다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form action={formAction}>
      {children}

      {state && (
        <div
          className={`mt-3 text-[13px] font-semibold ${
            state.ok ? 'text-good' : 'text-bad'
          }`}
          role="status"
        >
          {state.message}
        </div>
      )}

      <div className="btn-row">
        {extraButton}
        <SubmitButton label={submitLabel} disabled={disabled} />
      </div>
    </form>
  )
}
