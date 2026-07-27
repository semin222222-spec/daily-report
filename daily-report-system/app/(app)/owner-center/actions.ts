'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { OC_COOKIE } from '@/lib/owner-center'

/** 점주센터 PIN. 환경변수로 바꿀 수 있고, 없으면 기본값. */
function ownerPin(): string {
  return process.env.OWNER_CENTER_PIN || '1234'
}

export interface PinResult {
  ok: boolean
  message: string
}

/** PIN 확인 → 맞으면 쿠키를 심고 점주센터로 보낸다 */
export async function verifyPin(
  _prev: PinResult | null,
  formData: FormData
): Promise<PinResult> {
  const pin = String(formData.get('pin') ?? '').trim()

  if (!pin) return { ok: false, message: 'PIN을 입력해주세요.' }
  if (pin !== ownerPin()) {
    return { ok: false, message: 'PIN이 올바르지 않습니다.' }
  }

  cookies().set(OC_COOKIE, '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12, // 12시간
  })

  redirect('/owner-center')
}

/** 점주센터에서 나가기(잠금) */
export async function lockOwnerCenter() {
  cookies().delete(OC_COOKIE)
  redirect('/dashboard')
}
