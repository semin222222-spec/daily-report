'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { humanSize, type OcFile } from '@/lib/owner-center'

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
  isOwner,
}: {
  folder: string
  files: OcFile[]
  /** 파일 id → 서명 다운로드 URL (서버에서 미리 만든 것) */
  urls: Record<string, string>
  isOwner: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [query, setQuery] = useState('')

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
      for (const file of chosen) {
        const path = safePath(folder, file.name)
        // 파일은 브라우저에서 Storage로 직접 올라간다(서버 용량 제한 없음).
        // RLS(관리자만 insert)가 실제 방어선이다.
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr

        const { error: metaErr } = await supabase.from('oc_files').insert({
          folder,
          name: file.name.slice(0, 200),
          path,
          size: file.size,
          mime: file.type,
        })
        if (metaErr) throw metaErr
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove(f: OcFile) {
    setBusy(true)
    setError('')
    const supabase = createClient()
    try {
      await supabase.storage.from(BUCKET).remove([f.path])
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
              {busy ? '올리는 중…' : '+ 파일 올리기'}
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
              {isImage(f.name) && urls[f.id] ? (
                // 이미지 파일: 썸네일 미리보기 (누르면 원본 크게)
                <a
                  href={urls[f.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-line-soft"
                  title="크게 보기"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urls[f.id]}
                    alt={f.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-brand/[.08] text-[22px]">
                  {fileIcon(f.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">
                  {f.name}
                </div>
                <div className="text-[12px] text-muted">
                  {humanSize(f.size)} · {f.created_at.slice(0, 10)}
                </div>
              </div>

              {urls[f.id] && (
                <a
                  href={urls[f.id]}
                  download={f.name}
                  className="btn-ghost !px-3 !py-1.5 !text-xs"
                >
                  다운로드
                </a>
              )}

              {isOwner &&
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
    </div>
  )
}

/** 브라우저가 썸네일로 그릴 수 있는 이미지인지 (.ai/.psd 는 미리보기 불가라 제외) */
function isImage(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)
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
