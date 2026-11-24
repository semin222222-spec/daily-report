'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ingredientsToLines,
  prepToLines,
  type Recipe,
  type RecipeCategory,
} from '@/lib/recipes'
import { uploadResumable } from '@/lib/resumable-upload'
import { VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS, compressVideo, formatMB } from '@/lib/video-compress'
import { addRecipe, updateRecipe } from './actions'

const BUCKET = 'owner-center'

/** 영상 선택 상태 — keep: 기존 유지, new: 새로 고름(변환 완료), remove: 지우기 */
type VideoState =
  | { kind: 'keep' }
  | { kind: 'new'; file: File; url: string; note: string }
  | { kind: 'remove' }

export function RecipeForm({
  categories,
  recipe,
  photoUrl,
  videoUrl,
  onDone,
}: {
  categories: RecipeCategory[]
  /** 없으면 새 메뉴 추가, 있으면 수정 */
  recipe?: Recipe
  /** 수정 모드일 때 현재 사진의 서명 URL */
  photoUrl?: string
  /** 수정 모드일 때 현재 영상의 서명 URL */
  videoUrl?: string
  onDone: () => void
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string>(photoUrl ?? '')
  const [id] = useState(() => recipe?.id ?? crypto.randomUUID())
  const [video, setVideo] = useState<VideoState>({ kind: 'keep' })
  /** 변환·업로드 진행 안내 (빈 문자열이면 숨김) */
  const [videoStatus, setVideoStatus] = useState('')
  const [videoBusy, setVideoBusy] = useState(false)

  const shownVideoUrl =
    video.kind === 'new' ? video.url : video.kind === 'keep' ? videoUrl ?? '' : ''

  async function onVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 동작하게
    if (!picked) return
    setError('')
    setVideoBusy(true)
    setVideoStatus('영상 확인 중…')
    try {
      const { file, compressed } = await compressVideo(picked, (r) =>
        setVideoStatus(`용량 줄이는 중… ${Math.round(r * 100)}%`),
      )
      if (file.size > VIDEO_MAX_BYTES) {
        throw new Error(
          `영상이 ${formatMB(file.size)}로 너무 큽니다 (최대 ${formatMB(VIDEO_MAX_BYTES)}). ` +
            (compressed
              ? '영상을 더 짧게 잘라서 올려주세요.'
              : '이 기기에서는 자동 압축이 안 돼요. 휴대폰 사진 앱에서 짧게 자르거나, 카메라 설정을 1080p로 낮춰 찍어주세요.'),
        )
      }
      const note = compressed
        ? `${formatMB(picked.size)} → ${formatMB(file.size)}로 줄였어요`
        : `원본 그대로 ${formatMB(file.size)}`
      setVideo({ kind: 'new', file, url: URL.createObjectURL(file), note })
      setVideoStatus('')
    } catch (err) {
      setVideoStatus('')
      setError(err instanceof Error ? err.message : '영상을 처리하지 못했습니다.')
    } finally {
      setVideoBusy(false)
    }
  }

  function pickPhoto() {
    fileRef.current?.click()
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const form = e.currentTarget
      const fd = new FormData(form)
      fd.set('id', id)

      const file = fileRef.current?.files?.[0]
      let photoPath = recipe?.photo_path ?? ''
      if (file) {
        const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
        const path = `recipe-photos/${id}.${ext}`
        const supabase = createClient()
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: true })
        if (upErr) throw upErr
        photoPath = path
      }
      fd.set('photo_path', photoPath)

      // 영상: 새로 골랐으면 올리고, 지우기를 눌렀으면 비운다. 이전 파일은 저장 후 정리.
      const oldVideo = recipe?.video_path ?? ''
      let videoPath = oldVideo
      if (video.kind === 'new') {
        const path = `recipe-videos/${id}-${Date.now()}.mp4`
        setVideoStatus('영상 올리는 중… 0%')
        await uploadResumable(createClient(), BUCKET, path, video.file, (r) =>
          setVideoStatus(`영상 올리는 중… ${Math.round(r * 100)}%`),
        )
        videoPath = path
      } else if (video.kind === 'remove') {
        videoPath = ''
      }
      fd.set('video_path', videoPath)

      if (recipe) {
        await updateRecipe(fd)
      } else {
        await addRecipe(fd)
      }
      if (oldVideo && oldVideo !== videoPath) {
        // 바뀌었거나 지운 옛 영상은 저장소에서 지운다 (실패해도 저장 자체는 성공)
        await createClient().storage.from(BUCKET).remove([oldVideo])
      }
      setVideoStatus('')
      router.refresh()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
      setVideoStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <h3 className="card-title !mb-4">{recipe ? '레시피 수정' : '레시피 추가'}</h3>

      {error && (
        <div className="mb-3 rounded-[10px] border border-bad/30 bg-bad/[.06] px-3.5 py-2.5 text-[13px] text-bad">
          {error}
        </div>
      )}

      <div className="form-grid">
        <div>
          <label className="fld-label">카테고리</label>
          <select
            name="category_id"
            defaultValue={recipe?.category_id ?? categories[0]?.id}
            required
            className="fld-input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="fld-label">메뉴명</label>
          <input
            name="name"
            defaultValue={recipe?.name}
            required
            maxLength={60}
            className="fld-input"
            placeholder="예: 삐딱한우육회"
          />
        </div>
      </div>

      <div className="mt-3.5">
        <label className="fld-label">사진</label>
        <div className="flex items-center gap-3">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-[#fbfaf8]">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] text-muted">사진 없음</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
            className="hidden"
          />
          <button type="button" onClick={pickPhoto} className="btn-ghost">
            사진 선택
          </button>
        </div>
      </div>

      <div className="mt-3.5">
        <label className="fld-label">조리 영상</label>
        <p className="mb-2 text-[12px] text-muted">
          휴대폰 영상을 그대로 고르면 720p로 자동으로 줄여서 올려요. 최대{' '}
          {VIDEO_MAX_SECONDS / 60}분 · {formatMB(VIDEO_MAX_BYTES)}.
        </p>
        {shownVideoUrl && (
          <video
            src={shownVideoUrl}
            controls
            playsInline
            preload="metadata"
            className="mb-2 max-h-72 w-full max-w-sm rounded-lg border border-line bg-black"
          />
        )}
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          onChange={onVideoChange}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            className="btn-ghost"
            disabled={busy || videoBusy}
          >
            {shownVideoUrl ? '영상 바꾸기' : '영상 선택'}
          </button>
          {shownVideoUrl && !videoBusy && (
            <button
              type="button"
              onClick={() => setVideo({ kind: 'remove' })}
              disabled={busy}
              className="rounded-md px-2 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
            >
              영상 지우기
            </button>
          )}
          {videoStatus ? (
            <span className="text-[12px] font-semibold text-brand-deep">{videoStatus}</span>
          ) : (
            video.kind === 'new' && <span className="text-[12px] text-good">{video.note}</span>
          )}
        </div>
      </div>

      <div className="mt-3.5">
        <label className="fld-label">재료 (한 줄에 하나, &ldquo;재료명:수량&rdquo;)</label>
        <textarea
          name="ingredients_text"
          defaultValue={recipe ? ingredientsToLines(recipe.ingredients) : ''}
          rows={5}
          className="fld-input font-mono !text-[13px]"
          placeholder={'한우우둔살:180g\n소금양념:4g'}
        />
      </div>

      <div className="form-grid mt-3.5">
        <div>
          <label className="fld-label">가니쉬</label>
          <input
            name="garnish"
            defaultValue={recipe?.garnish}
            maxLength={200}
            className="fld-input"
            placeholder="쪽파, 깨, 참기름"
          />
        </div>
        <div>
          <label className="fld-label">소스</label>
          <input
            name="sauce"
            defaultValue={recipe?.sauce}
            maxLength={200}
            className="fld-input"
            placeholder="크리미, 칠리"
          />
        </div>
      </div>

      <div className="mt-3.5">
        <label className="fld-label">제조 및 제공 방법 (한 줄에 한 단계)</label>
        <textarea
          name="steps_text"
          defaultValue={recipe ? recipe.steps.join('\n') : ''}
          rows={5}
          className="fld-input"
          placeholder={'해동된 우둔살에 소금양념과 참기름을 버무린다\n접시에 넓게 펴준다'}
        />
      </div>

      <div className="mt-3.5">
        <label className="fld-label">특이사항 (한 줄에 하나)</label>
        <textarea
          name="notes_text"
          defaultValue={recipe ? recipe.notes.join('\n') : ''}
          rows={3}
          className="fld-input"
        />
      </div>

      <div className="mt-3.5">
        <label className="fld-label">원재료 전처리 (한 줄에 하나, &ldquo;이름:내용&rdquo;)</label>
        <textarea
          name="prep_text"
          defaultValue={recipe ? prepToLines(recipe.prep) : ''}
          rows={3}
          className="fld-input font-mono !text-[13px]"
          placeholder={'소금양념:설탕 300g, 미원 120g, 맛소금 120g'}
        />
      </div>

      <div className="btn-row">
        <button type="button" onClick={onDone} className="btn-ghost" disabled={busy}>
          취소
        </button>
        <button type="submit" className="btn" disabled={busy || videoBusy}>
          {busy ? '저장 중…' : videoBusy ? '영상 처리 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}
