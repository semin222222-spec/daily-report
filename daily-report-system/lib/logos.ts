import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { cache } from 'react'

/**
 * /public/logos 에 실제로 존재하는 매장 태그 집합.
 *
 * 왜 서버에서 확인하나:
 * 이미지 <img onError> 로 폴백하면, SSR된 HTML이 로드될 때 404가
 * 하이드레이션보다 먼저 터진다. React는 그 error 이벤트를 재생하지 않으므로
 * 깨진 이미지 아이콘이 그대로 남는다. 그래서 렌더 전에 파일 유무를 확정한다.
 *
 * cache()로 요청당 1회만 디렉터리를 읽는다.
 */
export const getAvailableLogos = cache(async (): Promise<Set<string>> => {
  try {
    const files = await readdir(join(process.cwd(), 'public', 'logos'))
    return new Set(
      files
        .filter((f) => /\.(png|jpe?g|svg|webp)$/i.test(f))
        .map((f) => f.replace(/\.[^.]+$/, ''))
    )
  } catch {
    // 폴더가 없으면 전부 타이포 폴백으로 간다
    return new Set<string>()
  }
})

/** 파일이 있으면 경로를, 없으면 null */
export async function logoSrc(tag: string): Promise<string | null> {
  const available = await getAvailableLogos()
  return available.has(tag) ? `/logos/${tag}.png` : null
}
