import * as tus from 'tus-js-client'
import type { SupabaseClient } from '@supabase/supabase-js'

/** 이 크기 이하는 일반 업로드(모든 기기에서 안정적), 초과분만 이어올리기 */
const RESUMABLE_THRESHOLD = 50 * 1024 * 1024
/** 이어올리기가 이 시간 동안 1바이트도 진행이 없으면 멈춘 것으로 보고 중단 */
const STALL_MS = 30_000

/**
 * 파일을 Supabase Storage에 올린다.
 * - 50MB 이하: 일반 업로드 (사진·일반 디자인 파일)
 * - 50MB 초과: 6MB 조각 이어올리기(TUS). 네트워크가 잠깐 끊겨도 자동으로 이어 올린다.
 *
 * 아이폰에서 조각이 빈 내용으로 가 0%에서 멈췄던 일이 있다. 원인은 서비스워커(public/sw.js)가
 * 요청을 다시 보내며 사파리가 본문을 빼먹은 것이었다(그쪽에서 수정). 혹시 모를 재발에 대비해
 * 작은 파일은 일반 업로드로, 큰 파일만 TUS로 보내고 멈춤 감시를 붙여 둔다.
 */
export async function uploadResumable(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  if (file.size <= RESUMABLE_THRESHOLD) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false, contentType: file.type || undefined })
    if (error) throw new Error(friendlyError(error))
    onProgress?.(1)
    return
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.')

  return new Promise<void>((resolve, reject) => {
    let lastSent = -1
    let lastMoveAt = Date.now()
    let done = false

    const finish = (err?: Error) => {
      if (done) return
      done = true
      clearInterval(watchdog)
      if (err) reject(err)
      else resolve()
    }

    const upload = new tus.Upload(file, {
      endpoint: resumableEndpoint(),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // Supabase는 6MB 고정
      onError: (err) => finish(new Error(friendlyError(err))),
      onProgress: (sent, total) => {
        if (sent > lastSent) {
          lastSent = sent
          lastMoveAt = Date.now()
        }
        onProgress?.(total ? sent / total : 0)
      },
      onSuccess: () => finish(),
    })

    // 진행이 멈추면(빈 조각 무한 반복 등) 중단하고 안내한다
    const watchdog = setInterval(() => {
      if (Date.now() - lastMoveAt > STALL_MS) {
        upload.abort(true).catch(() => {})
        finish(
          new Error(
            '업로드가 진행되지 않아 중단했습니다. 와이파이 상태를 확인하거나 PC에서 다시 올려주세요.',
          ),
        )
      }
    }, 5000)

    upload.start()
  })
}

/** https://<ref>.supabase.co → https://<ref>.storage.supabase.co (대용량 업로드 전용 주소) */
function resumableEndpoint(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  const m = base.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/)
  return m
    ? `https://${m[1]}.storage.supabase.co/storage/v1/upload/resumable`
    : `${base}/storage/v1/upload/resumable`
}

function friendlyError(err: { message?: string }): string {
  const msg = err.message ?? ''
  if (/413|too large|exceeded the maximum/i.test(msg)) {
    return '파일이 업로드 허용 용량(500MB)보다 큽니다.'
  }
  return msg || '업로드에 실패했습니다.'
}
