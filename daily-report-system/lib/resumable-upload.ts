import * as tus from 'tus-js-client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 큰 파일을 Supabase Storage에 이어올리기(TUS) 방식으로 올린다.
 * - 6MB 조각으로 나눠 올리고, 네트워크가 잠깐 끊겨도 자동으로 다시 이어서 올린다.
 * - onProgress(0~1)로 진행률을 알려준다.
 */
export async function uploadResumable(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.')

  return new Promise<void>((resolve, reject) => {
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
      onError: (err) => reject(new Error(friendlyError(err))),
      onProgress: (sent, total) => onProgress?.(total ? sent / total : 0),
      onSuccess: () => resolve(),
    })

    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0])
      upload.start()
    })
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

function friendlyError(err: Error): string {
  const msg = err.message ?? ''
  if (/413|too large|exceeded the maximum/i.test(msg)) {
    return '파일이 업로드 허용 용량보다 큽니다. 본사에 용량 한도 상향을 요청하세요.'
  }
  return msg || '업로드에 실패했습니다.'
}
