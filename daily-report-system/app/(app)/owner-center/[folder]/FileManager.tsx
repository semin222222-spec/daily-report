'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { humanSize, type OcFile } from '@/lib/owner-center'
import { canMakePreview, makePdfThumbnail } from '@/lib/pdf-thumb'
import { isThumbableImage, makeImageThumbnail } from '@/lib/image-thumb'
import { uploadResumable } from '@/lib/resumable-upload'

const BUCKET = 'owner-center'
/** 분류 탭 — '전체'와 '미분류'는 고정 값 */
const ALL = '__all__' // 분류 폴더 카드 화면
const FLAT = '__flat__' // 분류 상관없이 모든 파일
const UNCAT = ''
const VIEW_KEY = 'oc-file-view'
const NEW_CAT = '__new__'

/** 파일명에서 안전한 저장 경로를 만든다 (한글·공백·특수문자 처리) */
function safePath(folder: string, name: string): string {
  const ext = name.includes('.') ? name.split('.').pop() : ''
  const rand = Math.random().toString(36).slice(2, 10)
  const base = `${Date.now()}-${rand}`
  return ext ? `${folder}/${base}.${ext}` : `${folder}/${base}`
}

export function FileManager({
  folder,
  files,
  urls,
  thumbs,
  isOwner,
}: {
  folder: string
  files: OcFile[]
  /** 파일 id → 서명 다운로드 URL (원본) */
  urls: Record<string, string>
  /** 파일 id → 썸네일 서명 URL (이미지 원본 또는 AI·PDF 미리보기 PNG) */
  thumbs: Record<string, string>
  isOwner: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [previewing, setPreviewing] = useState<OcFile | null>(null)
  const [tab, setTab] = useState<string>(ALL)
  /** 방금 만든, 아직 파일이 없는 분류 (파일을 넣으면 DB에 생긴다) */
  const [extraCats, setExtraCats] = useState<string[]>([])

  // 분류 목록: 파일에 쓰인 분류를 개수와 함께, 가나다순. 미분류는 맨 뒤.
  const catCounts = new Map<string, number>()
  for (const c of extraCats) catCounts.set(c, 0)
  for (const f of files) catCounts.set(f.category, (catCounts.get(f.category) ?? 0) + 1)
  const categories = Array.from(catCounts.keys())
    .filter((c) => c !== UNCAT)
    .sort((a, b) => a.localeCompare(b, 'ko'))
  const uncatCount = catCounts.get(UNCAT) ?? 0
  // 지금 탭이 사라졌으면(마지막 파일을 옮겼을 때) 전체로
  const activeTab = tab === ALL || tab === FLAT || catCounts.has(tab) ? tab : ALL

  // 목록/격자 보기 — 기기마다 마지막 선택을 기억한다
  const [view, setViewState] = useState<'grid' | 'list'>('grid')
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY)
      if (v === 'grid' || v === 'list') setViewState(v)
    } catch {}
  }, [])
  function setView(v: 'grid' | 'list') {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {}
  }
  /** 격자 타일의 '⋯' 관리 메뉴가 열린 파일 */
  const [menuFor, setMenuFor] = useState<string | null>(null)

  // ESC로 미리보기 닫기 + 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!previewing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewing(null)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [previewing])

  // 파일명으로 실시간 필터 (대소문자·공백 무시)
  const q = query.trim().toLowerCase()
  // 검색 중에는 분류와 상관없이 전체에서 찾는다
  const shown = q
    ? files.filter((f) => f.name.toLowerCase().includes(q))
    : activeTab === ALL || activeTab === FLAT
      ? files
      : files.filter((f) => f.category === activeTab)

  // 분류가 있으면 첫 화면은 폴더 카드 (검색 중이면 바로 결과)
  const showFolders = !q && activeTab === ALL && categories.length > 0
  const folderCards = [
    ...categories.map((c) => ({ key: c, label: c })),
    ...(uncatCount > 0 ? [{ key: UNCAT, label: '미분류' }] : []),
  ].map((c) => {
    const items = files.filter((f) => f.category === c.key)
    return { ...c, n: items.length, covers: items.filter((f) => thumbs[f.id]).slice(0, 4) }
  })

  /** 새 분류 이름을 묻는다. 취소하면 null */
  function askNewCategory(): string | null {
    const name = window.prompt('새 분류 이름 (예: 포스터, 간판)')?.trim()
    return name ? name.slice(0, 30) : null
  }

  async function setCategory(f: OcFile, value: string) {
    let category = value
    if (value === NEW_CAT) {
      const name = askNewCategory()
      if (!name) return
      category = name
    }
    if (category === f.category) return
    setBusy(true)
    setError('')
    try {
      const { error: upErr } = await createClient()
        .from('oc_files')
        .update({ category })
        .eq('id', f.id)
      if (upErr) throw upErr
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '분류 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? [])
    if (chosen.length === 0) return
    setBusy(true)
    setError('')

    const supabase = createClient()
    try {
      for (const [i, file] of chosen.entries()) {
        const path = safePath(folder, file.name)
        const label = chosen.length > 1 ? `(${i + 1}/${chosen.length}) ` : ''
        setProgress(`${label}0%`)
        // 파일은 브라우저에서 Storage로 직접 올라간다(서버 용량 제한 없음).
        // 6MB 조각 이어올리기라 큰 디자인 파일도 끊김 없이 올라간다.
        // RLS(관리자만 insert)가 실제 방어선이다.
        await uploadResumable(supabase, BUCKET, path, file, (r) =>
          setProgress(`${label}${Math.floor(r * 100)}%`),
        )

        // AI·PDF면 첫 페이지를 PNG 미리보기로 만들어 함께 올린다
        let previewPath = ''
        if (canMakePreview(file.name)) {
          const blob = await makePdfThumbnail(file)
          if (blob) {
            const pp = `${path}.preview.png`
            const { error: pErr } = await supabase.storage
              .from(BUCKET)
              .upload(pp, blob, { upsert: false, contentType: 'image/png' })
            if (!pErr) previewPath = pp
          }
        }

        // 이미지면 목록용 작은 썸네일을 만들어 함께 올린다 (원본은 목록에서 안 불러옴)
        let thumbPath = ''
        if (isThumbableImage(file.name)) {
          const blob = await makeImageThumbnail(file)
          if (blob) {
            const tp = `${path}.thumb.jpg`
            const { error: tErr } = await supabase.storage
              .from(BUCKET)
              .upload(tp, blob, { upsert: false, contentType: 'image/jpeg' })
            if (!tErr) thumbPath = tp
          }
        }

        const { error: metaErr } = await supabase.from('oc_files').insert({
          folder,
          name: file.name.slice(0, 200),
          path,
          size: file.size,
          mime: file.type,
          preview_path: previewPath,
          thumb_path: thumbPath,
          // 분류 탭을 보고 있을 때 올리면 그 분류로 들어간다
          category: activeTab === ALL || activeTab === FLAT ? UNCAT : activeTab,
        })
        if (metaErr) throw metaErr
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setBusy(false)
      setProgress('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  /** 화면에 보이는 이름만 바꾼다 (저장소 경로는 원래 무작위라 그대로 둔다) */
  async function rename(f: OcFile) {
    let name = draftName.trim()
    if (!name) return setError('파일 이름을 입력하세요.')
    // 확장자를 지웠으면 원래 확장자를 붙여준다 (다운로드 후 열리게)
    const ext = extOf(f.name)
    if (f.name.includes('.') && extOf(name) !== ext) name = `${name}.${ext}`
    if (name === f.name) return setRenaming(null)

    setBusy(true)
    setError('')
    try {
      const { error: upErr } = await createClient()
        .from('oc_files')
        .update({ name: name.slice(0, 200) })
        .eq('id', f.id)
      if (upErr) throw upErr
      setRenaming(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '이름 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(f: OcFile) {
    setBusy(true)
    setError('')
    const supabase = createClient()
    try {
      // 원본 + 미리보기 PNG를 함께 지운다
      const paths = [f.path]
      if (f.preview_path) paths.push(f.preview_path)
      if (f.thumb_path) paths.push(f.thumb_path)
      await supabase.storage.from(BUCKET).remove(paths)
      const { error: delErr } = await supabase
        .from('oc_files')
        .delete()
        .eq('id', f.id)
      if (delErr) throw delErr
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="card-title !mb-0">
          파일 {q ? `${shown.length}/${files.length}` : files.length}개
        </h3>
        {isOwner && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={onPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="btn"
            >
              {busy ? `올리는 중… ${progress}` : '+ 파일 올리기'}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-[10px] border border-bad/30 bg-bad/[.06] px-3.5 py-2.5 text-[13px] text-bad">
          {error}
        </div>
      )}

      {/* 파일 검색 */}
      {files.length > 0 && (
        <div className="relative mb-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="파일명으로 검색"
            className="fld-input !pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색 지우기"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-line-soft hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* 분류 폴더 카드 — 첫 화면. 누르면 그 분류의 파일이 격자로 펼쳐진다 */}
      {showFolders && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 shell:grid-cols-4">
          {folderCards.map((c) => (
            <button
              key={c.key || '_'}
              type="button"
              onClick={() => setTab(c.key)}
              className="group overflow-hidden rounded-xl border border-line bg-white text-left transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
            >
              <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-px bg-line-soft">
                {c.covers.length === 0 ? (
                  <div className="col-span-2 row-span-2 grid place-items-center bg-brand/[.06] text-[34px]">
                    📁
                  </div>
                ) : (
                  c.covers.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={f.id}
                      src={thumbs[f.id]}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full bg-white object-cover ${
                        c.covers.length === 1
                          ? 'col-span-2 row-span-2'
                          : c.covers.length === 2
                            ? 'row-span-2'
                            : c.covers.length === 3 && i === 0
                              ? 'row-span-2'
                              : ''
                      }`}
                    />
                  ))
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="truncate text-[14px] font-extrabold group-hover:text-brand">
                  {c.label}
                </span>
                <span className="shrink-0 rounded-full bg-line-soft px-2 py-0.5 text-[11.5px] font-bold text-muted">
                  {c.n}
                </span>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTab(FLAT)}
            className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-line text-center text-[13px] font-bold text-muted transition hover:border-brand/40 hover:text-brand"
          >
            <span>
              🗂️
              <br />
              모든 파일 보기 · {files.length}
            </span>
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                const name = askNewCategory()
                if (name) {
                  setExtraCats((prev) => (prev.includes(name) ? prev : [...prev, name]))
                  setTab(name)
                }
              }}
              className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-line text-[13px] font-bold text-muted transition hover:border-brand/40 hover:text-brand"
            >
              + 새 분류
            </button>
          )}
        </div>
      )}

      {/* 분류 안: 분류 바로가기 칩 + 목록/격자 전환 */}
      {!showFolders && files.length > 0 && (
        <div className="mb-2 flex items-start gap-2">
        <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-2">
          {!q && [
            ...(categories.length > 0
              ? [{ key: ALL, label: '← 분류', n: -1 }]
              : []),
            { key: FLAT, label: '전체', n: files.length },
            ...categories.map((c) => ({ key: c, label: c, n: catCounts.get(c) ?? 0 })),
            ...(uncatCount > 0 && categories.length > 0
              ? [{ key: UNCAT, label: '미분류', n: uncatCount }]
              : []),
          ].map((t) => {
            const on = activeTab === t.key || (t.key === FLAT && activeTab === ALL)
            return (
              <button
                key={t.key || '_'}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ${
                  on
                    ? 'border-brand bg-brand text-white'
                    : t.n < 0
                      ? 'border-transparent bg-line-soft text-ink'
                      : 'border-line bg-white text-ink-2 hover:border-brand/40'
                }`}
              >
                {t.label}
                {t.n >= 0 && (
                  <span className={`ml-1 font-semibold ${on ? 'text-white/80' : 'text-muted'}`}>
                    {t.n}
                  </span>
                )}
              </button>
            )
          })}
          {!q && isOwner && (
            <button
              type="button"
              onClick={() => {
                const name = askNewCategory()
                if (name) {
                  setExtraCats((prev) => (prev.includes(name) ? prev : [...prev, name]))
                  setTab(name)
                }
              }}
              className="shrink-0 rounded-full border border-dashed border-line px-3 py-1.5 text-[12.5px] font-bold text-muted hover:border-brand/40 hover:text-brand"
            >
              + 분류
            </button>
          )}
        </div>
          <div className="flex shrink-0 rounded-lg border border-line p-0.5" role="group" aria-label="보기 방식">
            {(
              [
                ['grid', '▦', '격자로 보기'],
                ['list', '☰', '목록으로 보기'],
              ] as const
            ).map(([v, icon, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-label={label}
                title={label}
                aria-pressed={view === v}
                className={`grid h-7 w-8 place-items-center rounded-md text-[15px] transition ${
                  view === v ? 'bg-ink text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {showFolders ? null : files.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted">
          아직 올라온 파일이 없습니다.
          {isOwner ? ' 위에서 파일을 올려보세요.' : ''}
        </p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted">
          {q ? (
            <>&lsquo;{query}&rsquo; 와 일치하는 파일이 없습니다.</>
          ) : (
            <>
              이 분류에는 아직 파일이 없습니다.
              {isOwner && ' 지금 올리면 이 분류로 들어가고, 다른 파일은 분류 칸에서 옮길 수 있어요.'}
            </>
          )}
        </p>
      ) : view === 'grid' && renaming === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 shell:grid-cols-5">
          {shown.map((f) => (
            <div
              key={f.id}
              className="relative flex flex-col overflow-hidden rounded-xl border border-line bg-white"
            >
              <button
                type="button"
                onClick={() => (canPreview(f, thumbs) ? setPreviewing(f) : undefined)}
                className="block aspect-square w-full overflow-hidden bg-[#fbfaf8]"
                title={canPreview(f, thumbs) ? '미리보기' : f.name}
              >
                {thumbs[f.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbs[f.id]}
                    alt={f.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition hover:scale-[1.03]"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[38px]">
                    {fileIcon(f.name)}
                  </span>
                )}
              </button>
              <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                <div className="line-clamp-2 break-all text-[12.5px] font-semibold leading-snug" title={f.name}>
                  {f.name}
                </div>
                <div className="text-[11px] text-muted">{humanSize(f.size)}</div>
                <div className="mt-auto flex items-center gap-1">
                  {urls[f.id] && (
                    <a
                      href={downloadUrl(urls[f.id], f.name)}
                      download={f.name}
                      className="btn-ghost flex-1 !px-2 !py-1 text-center !text-[11.5px]"
                    >
                      다운로드
                    </a>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuFor(menuFor === f.id ? null : f.id)
                        setConfirming(null)
                      }}
                      aria-label="파일 관리"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[16px] font-bold text-muted hover:bg-line-soft hover:text-ink"
                    >
                      ⋯
                    </button>
                  )}
                </div>
              </div>

              {/* 관리 메뉴: 분류 이동 · 이름 · 삭제 */}
              {isOwner && menuFor === f.id && (
                <div className="absolute inset-x-1.5 bottom-1.5 z-10 rounded-lg border border-line bg-white p-2 shadow-lg">
                  <label className="mb-1 block text-[11px] font-semibold text-muted">분류</label>
                  <select
                    value={f.category}
                    onChange={(e) => {
                      setMenuFor(null)
                      setCategory(f, e.target.value)
                    }}
                    disabled={busy}
                    className="mb-1.5 w-full rounded-md border border-line bg-white px-1.5 py-1 text-[12px] font-semibold"
                  >
                    <option value={UNCAT}>미분류</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value={NEW_CAT}>+ 새 분류…</option>
                  </select>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuFor(null)
                        setView('list')
                        setRenaming(f.id)
                        setDraftName(f.name)
                      }}
                      className="btn-ghost flex-1 !px-2 !py-1 !text-[11.5px]"
                    >
                      이름
                    </button>
                    {confirming === f.id ? (
                      <button
                        type="button"
                        onClick={() => remove(f)}
                        disabled={busy}
                        className="btn flex-1 !bg-bad !px-2 !py-1 !text-[11.5px] hover:!bg-bad"
                      >
                        정말 삭제
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(f.id)}
                        className="flex-1 rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted hover:bg-bad/10 hover:text-bad"
                      >
                        삭제
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMenuFor(null)}
                      aria-label="닫기"
                      className="rounded-md px-1.5 text-[12px] text-muted hover:bg-line-soft"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-line-soft">
          {shown.map((f) => (
            <div key={f.id} className="flex items-center gap-3 py-3">
              {thumbs[f.id] ? (
                // 이미지 원본 또는 AI·PDF 미리보기 썸네일 (누르면 미리보기)
                <button
                  type="button"
                  onClick={() => setPreviewing(f)}
                  className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white transition hover:ring-2 hover:ring-brand/40"
                  title="미리보기"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbs[f.id]}
                    alt={f.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-brand/[.08] text-[22px]">
                  {fileIcon(f.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {renaming === f.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      rename(f)
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      maxLength={200}
                      className="fld-input !py-1.5 !text-[14px]"
                      aria-label="새 파일 이름"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="btn !px-3 !py-1.5 !text-xs"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      className="btn-ghost !px-3 !py-1.5 !text-xs"
                    >
                      취소
                    </button>
                  </form>
                ) : canPreview(f, thumbs) ? (
                  <button
                    type="button"
                    onClick={() => setPreviewing(f)}
                    className="block max-w-full truncate text-left text-[14px] font-semibold hover:text-brand hover:underline"
                    title="미리보기"
                  >
                    {f.name}
                  </button>
                ) : (
                  <div className="truncate text-[14px] font-semibold">
                    {f.name}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                  <span>
                    {humanSize(f.size)} · {f.created_at.slice(0, 10)}
                  </span>
                  {isOwner ? (
                    <select
                      value={f.category}
                      onChange={(e) => setCategory(f, e.target.value)}
                      disabled={busy}
                      aria-label="분류"
                      className="rounded-md border border-line bg-white px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-2"
                    >
                      <option value={UNCAT}>미분류</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value={NEW_CAT}>+ 새 분류…</option>
                    </select>
                  ) : (
                    q && f.category && <span className="pill">{f.category}</span>
                  )}
                </div>
              </div>

              {canPreview(f, thumbs) && urls[f.id] && (
                <button
                  type="button"
                  onClick={() => setPreviewing(f)}
                  className="btn-ghost !px-3 !py-1.5 !text-xs max-sm:!hidden"
                >
                  미리보기
                </button>
              )}

              {urls[f.id] && (
                <a
                  href={downloadUrl(urls[f.id], f.name)}
                  download={f.name}
                  className="btn-ghost !px-3 !py-1.5 !text-xs"
                >
                  다운로드
                </a>
              )}

              {isOwner && renaming !== f.id && confirming !== f.id && (
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(f.id)
                    setDraftName(f.name)
                  }}
                  className="rounded-md px-2 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-brand/10 hover:text-brand"
                >
                  이름
                </button>
              )}

              {isOwner &&
                renaming !== f.id &&
                (confirming === f.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => remove(f)}
                      disabled={busy}
                      className="btn !bg-bad !px-3 !py-1.5 !text-xs hover:!bg-bad"
                    >
                      삭제
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="btn-ghost !px-3 !py-1.5 !text-xs"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(f.id)}
                    className="rounded-md px-2 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-bad/10 hover:text-bad"
                  >
                    삭제
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        {isOwner
          ? 'AI·PDF·이미지 등 어떤 파일이든 올릴 수 있습니다. 올리기·삭제는 관리자만 가능하고, 점주들은 다운로드만 됩니다.'
          : '파일 다운로드는 자유롭게 하실 수 있습니다. 올리기·삭제는 관리자(본사)만 가능합니다.'}
      </p>

      {previewing && (
        <PreviewModal
          file={previewing}
          url={urls[previewing.id]}
          thumb={thumbs[previewing.id]}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  )
}

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp']

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

/**
 * 서명 URL에 download 파라미터를 붙여, 받은 파일이 화면의 이름으로 저장되게 한다.
 * (다른 도메인 링크라 <a download> 속성만으로는 이름이 적용되지 않는다)
 */
function downloadUrl(url: string, name: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(name)}`
}

/** 미리보기 가능한 파일: 이미지·PDF 원본, 또는 썸네일(AI 등)이 있는 파일 */
function canPreview(f: OcFile, thumbs: Record<string, string>): boolean {
  const ext = extOf(f.name)
  return IMAGE_EXT.includes(ext) || ext === 'pdf' || Boolean(thumbs[f.id])
}

function PreviewModal({
  file,
  url,
  thumb,
  onClose,
}: {
  file: OcFile
  url?: string
  thumb?: string
  onClose: () => void
}) {
  const ext = extOf(file.name)
  const isImage = IMAGE_EXT.includes(ext)
  const isPdf = ext === 'pdf'

  let body: React.ReactNode
  if (isImage && url) {
    body = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={file.name}
        className="mx-auto max-h-full max-w-full object-contain"
      />
    )
  } else if (isPdf && url) {
    body = (
      <iframe
        src={url}
        title={file.name}
        className="h-full w-full rounded-lg bg-white"
      />
    )
  } else if (thumb) {
    // AI 등: 원본은 브라우저에서 못 여니 첫 페이지 미리보기 이미지를 보여준다
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={file.name}
          className="max-h-[calc(100%-2rem)] max-w-full object-contain"
        />
        <p className="text-[12px] text-white/70">
          첫 페이지 미리보기입니다. 원본은 다운로드해서 확인하세요.
        </p>
      </div>
    )
  } else {
    body = (
      <p className="grid h-full place-items-center text-[14px] text-white/80">
        이 형식은 미리보기를 지원하지 않습니다. 다운로드해서 확인하세요.
      </p>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${file.name} 미리보기`}
      className="fixed inset-0 z-50 flex flex-col bg-black/80 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="mb-3 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">
          {file.name}
        </div>
        {url && (
          <a
            href={downloadUrl(url, file.name)}
            download={file.name}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/25"
          >
            다운로드
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white hover:bg-white/25"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
        {body}
      </div>
    </div>
  )
}

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['ai', 'eps'].includes(ext)) return '🎨'
  if (['psd'].includes(ext)) return '🖼️'
  if (['pdf'].includes(ext)) return '📕'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️'
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊'
  if (['doc', 'docx', 'hwp'].includes(ext)) return '📄'
  if (['ppt', 'pptx'].includes(ext)) return '📽️'
  if (['mp4', 'mov', 'avi'].includes(ext)) return '🎬'
  return '📎'
}
