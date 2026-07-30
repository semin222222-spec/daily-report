'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { todayKST } from '@/lib/format'
import type { MeetingNote } from '@/lib/types'
import {
  deleteMeetingNote,
  saveMeetingNote,
  type NoteResult,
} from './actions'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? '저장 중…' : label}
    </button>
  )
}

/** 회의록 작성·수정 폼 */
function NoteForm({
  editing,
  onDone,
}: {
  editing: MeetingNote | null
  onDone: () => void
}) {
  const [state, formAction] = useFormState<NoteResult | null, FormData>(
    async (prev, fd) => {
      const res = await saveMeetingNote(prev, fd)
      if (res.ok) onDone()
      return res
    },
    null
  )

  return (
    <form action={formAction} key={editing?.id ?? 'new'} className="card">
      <h3 className="card-title">{editing ? '회의록 수정' : '새 회의록'}</h3>
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="form-grid">
        <div className="shell:col-span-2">
          <label className="fld-label" htmlFor="mn-title">
            제목
          </label>
          <input
            id="mn-title"
            name="title"
            required
            defaultValue={editing?.title ?? ''}
            placeholder="예: 7월 임원 정기회의"
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="mn-date">
            회의 날짜
          </label>
          <input
            id="mn-date"
            name="meeting_date"
            type="date"
            defaultValue={editing?.meeting_date ?? todayKST()}
            className="fld-input"
          />
        </div>
        <div>
          <label className="fld-label" htmlFor="mn-att">
            참석자
          </label>
          <input
            id="mn-att"
            name="attendees"
            defaultValue={editing?.attendees ?? ''}
            placeholder="예: 세민, 이도현, 장준휘"
            className="fld-input"
          />
        </div>
      </div>

      <div className="mt-3.5">
        <label className="fld-label" htmlFor="mn-body">
          회의 내용
        </label>
        <textarea
          id="mn-body"
          name="body"
          rows={10}
          defaultValue={editing?.body ?? ''}
          placeholder="안건 · 논의 · 결정사항 · 후속조치…"
          className="fld-input leading-relaxed"
        />
      </div>

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
        {editing && (
          <button type="button" className="btn-ghost" onClick={onDone}>
            취소
          </button>
        )}
        <SubmitButton label={editing ? '수정 저장' : '저장'} />
      </div>
    </form>
  )
}

export function MeetingNotes({
  notes,
  isOwner,
}: {
  notes: MeetingNote[]
  isOwner: boolean
}) {
  const [editing, setEditing] = useState<MeetingNote | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      {/* 오너만 작성·수정 */}
      {isOwner &&
        (creating || editing ? (
          <NoteForm
            editing={editing}
            onDone={() => {
              setEditing(null)
              setCreating(false)
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn"
          >
            + 새 회의록
          </button>
        ))}

      <div className="mt-4 space-y-3">
        {notes.length === 0 && (
          <p className="py-10 text-center text-[13px] text-muted">
            아직 회의록이 없습니다.
          </p>
        )}

        {notes.map((n) => (
          <div key={n.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-[15.5px] font-bold">{n.title}</h3>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                  {n.meeting_date && <span>📅 {n.meeting_date}</span>}
                  {n.attendees && <span>👥 {n.attendees}</span>}
                </div>
              </div>
              {isOwner && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(n)}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-line-soft hover:text-ink"
                  >
                    수정
                  </button>
                  <form action={deleteMeetingNote}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              )}
            </div>

            {n.body && (
              <p className="mt-3 whitespace-pre-wrap border-t border-line-soft pt-3 text-[13.5px] leading-relaxed">
                {n.body}
              </p>
            )}

            {/* 수정·저장 시 자동으로 찍히는 최종수정일 */}
            <div className="mt-3 text-right text-[11.5px] text-muted">
              최종수정 {n.updated_at.slice(0, 16).replace('T', ' ')}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
