'use client'

import { useRouter } from 'next/navigation'

/** 점주센터 공통 뒤로가기 — 브라우저 뒤로가기와 동일하게 한 단계 이전으로 */
export function BackButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="btn-ghost !px-3 !py-1.5 !text-[13px]"
    >
      ← 뒤로
    </button>
  )
}
