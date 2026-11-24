/**
 * 점주센터 자료실의 기존 이미지 파일에 목록용 작은 썸네일(thumb_path)을 만들어 붙인다. (1회성)
 * 새로 올리는 파일은 브라우저가 올릴 때 직접 만든다(lib/image-thumb.ts).
 *
 *   node scripts/backfill-oc-thumbs.mjs
 *
 * .env.local 의 SUPABASE_SERVICE_ROLE_KEY 사용. 이미 thumb_path가 있는 파일은 건너뛴다.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const BUCKET = 'owner-center'
const IMG = /\.(png|jpe?g|webp|gif|bmp|avif)$/i

const { data: files, error } = await supabase
  .from('oc_files')
  .select('id, name, path, thumb_path')
  .eq('thumb_path', '')
if (error) throw error

const targets = files.filter((f) => IMG.test(f.name))
console.log(`썸네일 만들 이미지 ${targets.length}개`)

let ok = 0
for (const f of targets) {
  try {
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(f.path)
    if (dlErr) throw dlErr
    const input = Buffer.from(await blob.arrayBuffer())
    const thumb = await sharp(input, { limitInputPixels: false })
      .rotate()
      .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer()
    const tp = `${f.path}.thumb.jpg`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(tp, thumb, { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw upErr
    const { error: dbErr } = await supabase.from('oc_files').update({ thumb_path: tp }).eq('id', f.id)
    if (dbErr) throw dbErr
    ok++
    console.log(`✓ ${f.name}  ${(input.length / 1048576).toFixed(1)}MB → ${(thumb.length / 1024).toFixed(0)}KB`)
  } catch (e) {
    console.log(`✗ ${f.name}: ${e.message ?? e}`)
  }
}
console.log(`완료 ${ok}/${targets.length}`)
