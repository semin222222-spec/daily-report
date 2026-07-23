'use server'

import { revalidatePath } from 'next/cache'
import { getSessionContext } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import type { ReviewSource } from '@/lib/types'

export interface ActionResult {
  ok: boolean
  message: string
}

/**
 * 리뷰 수동 입력.
 *
 * 네이버·카카오는 새 리뷰를 외부로 밀어주는 공식 API가 없어서,
 * 이번 버전의 기본 입력 경로는 (1) 이 폼과 (2) POST /api/reviews 다.
 * 자동 크롤링은 스코프 밖 — /api/reviews 가 그 확장 지점이다.
 */
export async function addReview(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { activeStore } = await getSessionContext()

  const source = String(formData.get('source') ?? 'naver') as ReviewSource
  if (source !== 'naver' && source !== 'kakao') {
    return { ok: false, message: '출처를 확인해주세요.' }
  }

  const text = String(formData.get('text') ?? '').trim()
  if (!text) return { ok: false, message: '리뷰 내용을 입력해주세요.' }

  const rating = Number(formData.get('rating') ?? 5)
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    return { ok: false, message: '별점은 0~5 사이여야 합니다.' }
  }

  const postedRaw = String(formData.get('posted_at') ?? '')
  const postedAt = postedRaw ? new Date(postedRaw) : new Date()
  if (Number.isNaN(postedAt.getTime())) {
    return { ok: false, message: '작성일이 올바르지 않습니다.' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('reviews').insert({
    store_id: activeStore.id,
    source,
    author: String(formData.get('author') ?? '').trim().slice(0, 60),
    rating,
    text: text.slice(0, 2000),
    posted_at: postedAt.toISOString(),
    is_new: true,
  })

  if (error) return { ok: false, message: `저장 실패: ${error.message}` }

  revalidatePath('/reviews')
  return { ok: true, message: '리뷰를 추가했습니다.' }
}

/** NEW 배지 일괄 해제 — "확인했음" 처리 */
export async function markReviewsSeen(): Promise<void> {
  const { activeStore } = await getSessionContext()

  const supabase = createClient()
  await supabase
    .from('reviews')
    .update({ is_new: false })
    .eq('store_id', activeStore.id)
    .eq('is_new', true)

  revalidatePath('/reviews')
}
