'use client'

import { useMemo, useState } from 'react'
import { ActionForm } from '@/components/ui/ActionForm'
import type { Store } from '@/lib/types'
import { createStore } from './actions'

const NEW_BRAND = '__new__'

/**
 * 매장(지점) 추가.
 *
 * 브랜드를 고르면 컬러와 로고를 그대로 물려받는다.
 * "삐딱 문래점"을 만들 때 삐딱 컬러를 다시 고르고 로고를 또 올릴 필요가 없다.
 */
export function AddStoreForm({ stores }: { stores: Store[] }) {
  // 브랜드별 대표 매장 하나씩 (컬러·배지를 여기서 가져온다)
  const brands = useMemo(() => {
    const map = new Map<string, Store>()
    for (const s of stores) {
      const key = s.brand || s.tag
      if (!map.has(key)) map.set(key, s)
    }
    return [...map.entries()].map(([key, s]) => ({ key, store: s }))
  }, [stores])

  const [brand, setBrand] = useState(brands[0]?.key ?? NEW_BRAND)
  const isNew = brand === NEW_BRAND
  const picked = brands.find((b) => b.key === brand)?.store

  // 같은 브랜드 지점 수 + 1 로 태그를 미리 만들어 준다 (bbiddak-2)
  const suggestedTag = useMemo(() => {
    if (isNew) return ''
    const n = stores.filter((s) => (s.brand || s.tag) === brand).length + 1
    return `${brand}-${n}`
  }, [brand, isNew, stores])

  return (
    <ActionForm action={createStore} submitLabel="+ 매장 추가">
      <div className="form-grid">
        <div>
          <label className="fld-label" htmlFor="store-brand">
            브랜드
          </label>
          <select
            id="store-brand"
            name="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="fld-input"
          >
            {brands.map((b) => (
              <option key={b.key} value={b.key}>
                {b.store.name.split(' ')[0]} ({b.key})
              </option>
            ))}
            <option value={NEW_BRAND}>+ 새 브랜드</option>
          </select>

          {!isNew && picked && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
              <span
                className="inline-block h-3 w-3 rounded-[3px]"
                style={{ background: picked.color }}
              />
              컬러·로고를 <b className="text-ink-2">{picked.name.split(' ')[0]}</b>
              와 똑같이 씁니다
            </p>
          )}
        </div>

        <div>
          <label className="fld-label" htmlFor="store-name">
            매장 이름
          </label>
          <input
            id="store-name"
            name="name"
            required
            placeholder={isNew ? '예: 쑥고개' : '예: 삐딱 문래점'}
            className="fld-input"
          />
        </div>

        <div>
          <label className="fld-label" htmlFor="store-branch">
            지점명
          </label>
          <input
            id="store-branch"
            name="branch"
            placeholder="예: 문래점 (없으면 비워두세요)"
            className="fld-input"
          />
        </div>

        <div>
          <label className="fld-label" htmlFor="store-tag">
            태그 (영문 · 매장마다 고유)
          </label>
          <input
            id="store-tag"
            name="tag"
            required
            key={suggestedTag}
            defaultValue={suggestedTag}
            placeholder="예: bbiddak-mullae"
            autoCapitalize="none"
            className="fld-input"
          />
        </div>

        {/* 새 브랜드일 때만 컬러·브랜드키를 직접 정한다 */}
        {isNew && (
          <>
            <div>
              <label className="fld-label" htmlFor="store-newbrand">
                브랜드 키 (영문 · 로고 파일명)
              </label>
              <input
                id="store-newbrand"
                name="new_brand"
                required
                placeholder="예: ssuk → /logos/ssuk.png"
                autoCapitalize="none"
                className="fld-input"
              />
            </div>
            <div>
              <label className="fld-label" htmlFor="store-color">
                브랜드 컬러
              </label>
              <input
                id="store-color"
                name="color"
                type="color"
                defaultValue="#4b7f52"
                className="fld-input h-[42px] p-1"
              />
            </div>
          </>
        )}

        <div>
          <label className="fld-label" htmlFor="store-badge">
            배지 (한 글자)
          </label>
          <input
            id="store-badge"
            name="badge"
            maxLength={2}
            defaultValue={isNew ? '' : (picked?.badge ?? '')}
            key={`badge-${brand}`}
            placeholder="예: 삐"
            className="fld-input"
          />
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        {isNew ? (
          <>
            새 브랜드는 로고를{' '}
            <code className="rounded bg-line-soft px-1">
              /public/logos/브랜드키.png
            </code>{' '}
            로 넣으면 자동 적용됩니다. 없으면 배지 글자로 표시됩니다.
          </>
        ) : (
          <>
            같은 브랜드의 지점은 로고 파일 하나를 같이 씁니다. 따로 올리실 필요
            없습니다.
          </>
        )}
      </p>
    </ActionForm>
  )
}
