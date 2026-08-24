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
import { addRecipe, updateRecipe } from './actions'

const BUCKET = 'owner-center'

export function RecipeForm({
  categories,
  recipe,
  photoUrl,
  onDone,
}: {
  categories: RecipeCategory[]
  /** 없으면 새 메뉴 추가, 있으면 수정 */
  recipe?: Recipe
  /** 수정 모드일 때 현재 사진의 서명 URL */
  photoUrl?: string
  onDone: () => void
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string>(photoUrl ?? '')
  const [id] = useState(() => recipe?.id ?? crypto.randomUUID())

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

      if (recipe) {
        await updateRecipe(fd)
      } else {
        await addRecipe(fd)
      }
      router.refresh()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
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
        <button type="submit" className="btn" disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}
