import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 점주센터 이미지(자료실 썸네일·미리보기, 레시피 사진)를 우리 주소로 내려준다.
 *
 * 왜 서명 URL을 안 쓰나: 서명 URL은 페이지를 열 때마다 토큰이 바뀌어서
 * 브라우저가 같은 사진인 줄 모르고 매번 전부 새로 받는다(하얀 칸이 한참 보임).
 * 이 주소는 내용이 같으면 주소도 같아서, 한 번 받으면 브라우저가 일주일 동안 기억한다.
 *
 *  - 자료실 썸네일(.thumb.jpg)·미리보기(.preview.png): 올릴 때마다 새 경로라 그대로 내려준다.
 *  - 레시피 사진(recipe-photos/…): 원본이 0.5~3MB라 w 폭으로 줄여서 내려준다.
 *    같은 경로에 사진을 덮어쓰므로 v(레시피 수정 시각)를 주소에 붙여 바뀌면 새로 받게 한다.
 *
 * 로그인 확인은 미들웨어가, 읽기 권한은 Storage RLS가 한다.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const path = sp.get('p') ?? ''
  const isDerived = /\.(thumb\.jpg|preview\.png)$/.test(path)
  const isRecipePhoto = /^recipe-photos\/[^/]+\.(jpe?g|png|webp|gif|heic|avif)$/i.test(path)
  if (path.includes('..') || (!isDerived && !isRecipePhoto)) {
    return new NextResponse('bad path', { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase.storage.from('owner-center').download(path)
  if (error || !data) return new NextResponse('not found', { status: 404 })

  const headers = {
    // 로그인한 본인 브라우저에만 저장(공용 캐시 X), 일주일
    'cache-control': 'private, max-age=604800, immutable',
  }

  if (isDerived) {
    return new NextResponse(data, {
      headers: { ...headers, 'content-type': path.endsWith('.png') ? 'image/png' : 'image/jpeg' },
    })
  }

  // 레시피 사진: 요청 폭으로 줄인 JPEG (최대 1200px)
  const w = Math.min(1200, Math.max(64, Number(sp.get('w')) || 320))
  try {
    const sharp = (await import('sharp')).default
    const out = await sharp(Buffer.from(await data.arrayBuffer()))
      .rotate()
      .resize(w, w, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()
    return new NextResponse(new Uint8Array(out), { headers: { ...headers, 'content-type': 'image/jpeg' } })
  } catch {
    // 줄이기에 실패하면 원본 그대로
    return new NextResponse(data, { headers: { ...headers, 'content-type': data.type || 'image/jpeg' } })
  }
}
