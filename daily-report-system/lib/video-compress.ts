/**
 * 레시피 영상 — 올리기 전에 휴대폰(브라우저) 안에서 720p로 다시 인코딩해 용량을 줄인다.
 *
 * 휴대폰 원본(특히 4K)은 1분에 300MB를 넘기도 해서 올리기도, 직원이 보기도 느리다.
 * 브라우저 내장 영상 인코더(WebCodecs)를 쓰는 mediabunny로 변환하므로 별도 서버·유료 서비스가 없다.
 * 변환을 못 하는 오래된 기기에서는 원본을 그대로 올리되, 크기 제한을 넘으면 막는다.
 */

/** 영상 길이 제한 — 레시피 영상은 짧게. 이보다 길면 변환 전에 막는다 */
export const VIDEO_MAX_SECONDS = 5 * 60
/** 실제로 올라가는 파일(변환 후, 또는 변환 실패 시 원본)의 최대 크기 */
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024
/** 긴 변의 최대 픽셀 (1280 = 720p) */
const MAX_LONG_SIDE = 1280
/** 영상 비트레이트 — 720p 조리 영상엔 2Mbps면 충분. 1분 ≈ 15MB */
const VIDEO_BITRATE = 2_000_000

export function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)}MB`
}

export interface CompressResult {
  file: File
  /** true면 변환 성공, false면 이 기기에서 변환이 안 돼 원본 그대로 */
  compressed: boolean
}

/**
 * 영상을 720p mp4로 줄인다. 길이가 제한을 넘으면 에러.
 * 변환이 불가능한 환경이면 원본을 돌려준다(크기 검사는 호출하는 쪽에서 VIDEO_MAX_BYTES로).
 */
export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<CompressResult> {
  // 무거운 라이브러리라 영상을 고를 때만 불러온다
  const mb = await import('mediabunny')

  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS })
  try {
    let duration = 0
    let track: Awaited<ReturnType<typeof input.getPrimaryVideoTrack>> = null
    try {
      track = await input.getPrimaryVideoTrack()
      duration = await input.computeDuration()
    } catch {
      // 컨테이너를 못 읽음 → 원본 그대로 (재생 가능 여부는 브라우저 몫)
      return { file, compressed: false }
    }
    if (!track) throw new Error('영상 트랙이 없는 파일입니다.')

    if (duration > VIDEO_MAX_SECONDS + 1) {
      throw new Error(
        `영상이 너무 깁니다 (${Math.round(duration / 60)}분). ${VIDEO_MAX_SECONDS / 60}분 이하로 잘라서 올려주세요.`,
      )
    }

    if (typeof VideoEncoder === 'undefined' || !(await mb.canEncodeVideo('avc'))) {
      return { file, compressed: false }
    }

    // 회전 정보를 반영한 실제 화면 크기 기준으로, 긴 변이 1280을 넘지 않게
    const w = track.displayWidth
    const h = track.displayHeight
    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(w, h))
    const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), // 받자마자 재생 시작되게
      target: new mb.BufferTarget(),
    })

    const conversion = await mb.Conversion.init({
      input,
      output,
      video: {
        width: even(w * scale),
        height: even(h * scale),
        fit: 'contain',
        codec: 'avc', // 아이폰·안드로이드·PC 어디서나 재생되는 H.264
        bitrate: VIDEO_BITRATE,
        frameRate: 30,
        forceTranscode: true,
      },
      // 오디오는 손대지 않고 그대로 옮기거나, 필요하면 라이브러리가 알아서 변환한다
      audio: { bitrate: 96_000 },
    })

    if (!conversion.isValid) return { file, compressed: false }

    conversion.onProgress = (p) => onProgress?.(p)
    await conversion.execute()

    const buf = output.target.buffer
    if (!buf) return { file, compressed: false }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'video'
    const out = new File([buf], `${baseName}.mp4`, { type: 'video/mp4' })
    // 이미 작은 영상이라 오히려 커졌으면 원본을 쓴다
    if (out.size >= file.size) return { file, compressed: false }
    return { file: out, compressed: true }
  } catch (err) {
    // 길이 초과 등 우리가 낸 안내는 그대로, 변환 중 기기 오류는 원본으로 대체
    if (err instanceof Error && /영상이 너무 깁니다|영상 트랙이 없는/.test(err.message)) throw err
    console.warn('[video-compress] 변환 실패, 원본 사용', err)
    return { file, compressed: false }
  } finally {
    input.dispose?.()
  }
}
