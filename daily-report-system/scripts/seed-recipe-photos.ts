/**
 * 레시피 사진 업로드 — PDF에서 잘라낸 완성샷을 owner-center 버킷에 올린다.
 *
 *   npx tsx scripts/seed-recipe-photos.ts <사진폴더>
 *
 * <사진폴더> 안의 {slug}.jpg 파일들을 recipe-photos/{slug}.jpg 경로로 업로드한다.
 * .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 있어야 한다.
 * service_role 키를 쓰므로 RLS를 우회한다. 여러 번 실행해도 안전하다(upsert).
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import fs from 'node:fs'

config({ path: resolve(process.cwd(), '.env.local') })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'owner-center'

if (!URL || !SERVICE_KEY) {
  console.error('\n✗ .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 넣어주세요.\n')
  process.exit(1)
}

const dir = process.argv[2]
if (!dir || !fs.existsSync(dir)) {
  console.error('\n✗ 사진 폴더 경로를 인자로 주세요. 예: npx tsx scripts/seed-recipe-photos.ts ./photos\n')
  process.exit(1)
}

const db = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.jpg'))
  console.log(`\n${files.length}개 사진 업로드 시작 (버킷: ${BUCKET})\n`)

  let ok = 0
  for (const file of files) {
    const slug = file.replace(/\.jpg$/i, '')
    const path = `recipe-photos/${slug}.jpg`
    const bytes = fs.readFileSync(resolve(dir, file))
    const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
      upsert: true,
      contentType: 'image/jpeg',
    })
    if (error) {
      console.error(`  ✗ ${slug}: ${error.message}`)
    } else {
      ok++
      console.log(`  ✓ ${slug}`)
    }
  }
  console.log(`\n완료: ${ok}/${files.length}\n`)
}

main().catch((e) => {
  console.error('\n✗ 업로드 실패:', e.message, '\n')
  process.exit(1)
})
