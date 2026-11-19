'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { humanSize, type OcFile } from '@/lib/owner-center'
import { canMakePreview, makePdfThumbnail } from '@/lib/pdf-thumb'
import { uploadResumable } from '@/lib/resumable-upload'

const BUCKET = 'owner-center'

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
  const shown = q
    ? files.filter((f) => f.name.toLowerCase().includes(q))
    : files

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

        const { error: metaErr } = await supabase.from('oc_files').insert({
          folder,
          name: file.name.slice(0, 200),
          path,
          size: file.size,
          mime: file.type,
          preview_path: previewPath,
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

      {files.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted">
          아직 올라온 파일이 없습니다.
          {isOwner ? ' 위에서 파일을 올려보세요.' : ''}
        </p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted">
          &lsquo;{query}&rsquo; 와 일치하는 파일이 없습니다.
        </p>
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
                <div className="text-[12px] text-muted">
                  {humanSize(f.size)} · {f.created_at.slice(0, 10)}
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
