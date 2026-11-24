/**
 * 자료실에 이미지를 올릴 때 목록용 작은 썸네일(긴 변 320px JPEG)을 브라우저에서 만든다.
 * 원본(10~48MB)을 목록에서 그대로 불러오면 썸네일이 한참 늦게 뜨거나 아예 안 뜬다.
 * 실패하면 null — 그 파일은 목록에서 아이콘으로 보인다.
 */
const THUMB_SIDE = 320

export function isThumbableImage(name: string): boolean {
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(name)
}

export async function makeImageThumbnail(file: File): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, THUMB_SIDE / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#fff' // 투명 PNG는 흰 바탕으로
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8))
  } catch {
    return null
  }
}
