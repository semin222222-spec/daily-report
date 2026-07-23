'use client'

import { useState } from 'react'
import { ActionForm } from '@/components/ui/ActionForm'
import { addReview } from './actions'

/** 리뷰 수동 입력 — 접었다 펼 수 있게 해서 목록을 가리지 않게 한다 */
export function AddReviewForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full"
      >
        + 리뷰 직접 추가
      </button>
    )
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="card-title">리뷰 직접 추가</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[13px] text-muted hover:text-ink"
        >
          닫기
        </button>
      </div>
      <p className="card-sub">
        네이버·카카오에서 복사해 붙여넣으면 됩니다.
      </p>

      <ActionForm action={addReview} submitLabel="리뷰 추가">
        <div className="form-grid">
          <div>
            <label className="fld-label" htmlFor="rv-source">
              출처
            </label>
            <select id="rv-source" name="source" className="fld-input">
              <option value="naver">네이버지도</option>
              <option value="kakao">카카오맵</option>
            </select>
          </div>
          <div>
            <label className="fld-label" htmlFor="rv-author">
              작성자
            </label>
            <input
              id="rv-author"
              name="author"
              placeholder="예: 김**"
              className="fld-input"
            />
          </div>
          <div>
            <label className="fld-label" htmlFor="rv-rating">
              별점 (0~5)
            </label>
            <input
              id="rv-rating"
              name="rating"
              type="number"
              min={0}
              max={5}
              step="0.5"
              defaultValue={5}
              className="fld-input"
            />
          </div>
          <div>
            <label className="fld-label" htmlFor="rv-posted">
              작성일
            </label>
            <input
              id="rv-posted"
              name="posted_at"
              type="date"
              className="fld-input"
            />
          </div>
        </div>

        <div className="mt-3.5">
          <label className="fld-label" htmlFor="rv-text">
            리뷰 내용
          </label>
          <textarea
            id="rv-text"
            name="text"
            rows={3}
            required
            placeholder="리뷰 내용을 붙여넣으세요"
            className="fld-input"
          />
        </div>
      </ActionForm>
    </div>
  )
}
