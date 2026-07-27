'use client'

/**
 * AI·PDF 파일의 첫 페이지를 PNG 썸네일로 만든다 (브라우저에서).
 *
 * .ai 파일은 "PDF 호환"으로 저장돼 있으면 내부가 PDF라 pdf.js로 열린다.
 * (일러스트레이터 기본값이 PDF 호환이라 대부분 열린다)
 * 실패하면 null을 돌려주고, 호출부는 미리보기 없이 그냥 진행한다.
 */
export async function makePdfThumbnail(file: File): Promise<Blob | null> {
  try {
    const pdfjs = await import('pdfjs-dist')
    // 워커는 설치된 버전과 똑같은 걸 CDN에서 받는다 (버전 불일치 방지)
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

    const buf = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buf }).promise
    const page = await doc.getPage(1)

    // 긴 변 기준 최대 700px로 축소
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(700 / base.width, 700 / base.height, 2)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 투명 배경 파일도 깔끔하게 보이도록 흰 바탕을 깐다
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvasContext: ctx, viewport }).promise

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png', 0.9)
    )
  } catch {
    return null
  }
}

/** 이 확장자는 미리보기 PNG를 만들어볼 대상인가 (ai/pdf) */
export function canMakePreview(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['ai', 'pdf'].includes(ext)
}
