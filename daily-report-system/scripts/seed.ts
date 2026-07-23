/**
 * 시드 스크립트 — 매장 3개 + 데모 계정 4개 + 샘플 데이터 생성
 *
 *   npm run seed
 *
 * .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 있어야 한다.
 * service_role 키를 쓰므로 RLS를 우회한다. 로컬에서만 실행할 것.
 *
 * 여러 번 실행해도 안전하다(upsert / 존재하면 건너뜀).
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local') })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DOMAIN = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN || 'bbiddak.com'
// Supabase 기본 최소 비밀번호 길이가 6자라 시안의 "1234"는 쓸 수 없다.
const PASSWORD = process.env.SEED_PASSWORD || 'bbiddak1234'

if (!URL || !SERVICE_KEY) {
  console.error(
    '\n✗ .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 넣어주세요.\n' +
      '  service_role 키: Supabase Dashboard → Settings → API → service_role\n'
  )
  process.exit(1)
}

const db = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 매장 정의 ────────────────────────────────────────────────
const STORES = [
  { tag: 'bbiddak', name: '삐딱', color: '#f0542d', badge: '삐', kind: 'main', sort_order: 1 },
  { tag: 'woosam', name: '우삼집', color: '#d98324', badge: '우', kind: 'franchise', sort_order: 2 },
  { tag: 'ssuk', name: '쑥고개', color: '#4b7f52', badge: '쑥', kind: 'franchise', sort_order: 3 },
] as const

// ── 계정 정의 ────────────────────────────────────────────────
const ACCOUNTS = [
  { login_id: 'admin', name: '세민 (오너)', role: 'owner', store: null },
  { login_id: 'bbiddak', name: '삐딱 점장', role: 'manager', store: 'bbiddak' },
  { login_id: 'woosam', name: '우삼집 점장', role: 'manager', store: 'woosam' },
  { login_id: 'ssuk', name: '쑥고개 점장', role: 'manager', store: 'ssuk' },
] as const

// 매장별 규모 — 시안의 mock 숫자를 기준으로 잡았다
const PROFILE: Record<string, { base: number; costRate: number; guests: number; goal: number }> = {
  bbiddak: { base: 4_820_000, costRate: 0.33, guests: 214, goal: 150_000_000 },
  woosam: { base: 3_140_000, costRate: 0.36, guests: 158, goal: 95_000_000 },
  ssuk: { base: 2_010_000, costRate: 0.34, guests: 97, goal: 62_000_000 },
}

const FIXED: Record<string, [number, number, number, number]> = {
  //        임대료      관리비     공과금     보험·기타
  bbiddak: [8_000_000, 1_200_000, 2_400_000, 900_000],
  woosam: [5_500_000, 900_000, 1_700_000, 600_000],
  ssuk: [4_200_000, 700_000, 1_300_000, 500_000],
}

const STAFF: Record<string, Array<[string, string, 'monthly' | 'hourly', number, number]>> = {
  //        이름      포지션   형태        단가       월 근무시간
  bbiddak: [
    ['김정민', '주방', 'monthly', 2_600_000, 0],
    ['이서준', '홀', 'hourly', 11_000, 180],
    ['박하나', '홀', 'hourly', 10_500, 120],
  ],
  woosam: [
    ['최윤', '주방', 'monthly', 2_500_000, 0],
    ['정우', '홀', 'hourly', 10_500, 160],
  ],
  ssuk: [
    ['한별', '주방', 'monthly', 2_400_000, 0],
    ['조은', '홀', 'hourly', 10_000, 140],
  ],
}

const TODOS: Record<string, Array<[string, string, boolean]>> = {
  bbiddak: [
    ['홀 에어컨 필터 청소', '홀', false],
    ['주류 재고 확인 후 발주', '주방', false],
    ['포스 마감 정산', '점장', true],
  ],
  woosam: [
    ['신메뉴 시식 준비', '주방', false],
    ['배달 리뷰 답글 달기', '점장', false],
  ],
  ssuk: [['주차장 안내판 교체', '홀', false]],
}

const REVIEWS: Record<string, Array<[string, string, number, string, number]>> = {
  //        출처     작성자   별점  내용                                   몇 시간 전
  bbiddak: [
    ['naver', '김**', 5, '여기 삼겹살 진짜 미쳤어요… 사장님도 친절하고 재방문 각!', 0.2],
    ['kakao', '이**', 4, '분위기 좋고 맛있어요. 주차가 조금 아쉬웠어요.', 1],
    ['naver', '박**', 5, '단체로 갔는데 세팅 빠르고 좋았습니다.', 26],
  ],
  woosam: [
    ['naver', '최**', 5, '우삼집 국물 끝내줍니다. 또 올게요!', 3],
    ['kakao', '정**', 3, '맛은 좋은데 웨이팅이 길어요.', 27],
  ],
  ssuk: [['naver', '한**', 5, '쑥고개 조용하고 정갈해서 부모님 모시고 오기 좋아요.', 2]],
}

// ── 유틸 ─────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** 요일별 매출 배수 — 금·토가 높고 월요일이 낮다 */
const DOW_FACTOR = [0.95, 0.78, 0.84, 0.88, 0.97, 1.24, 1.34] // 일~토

function jitter(spread = 0.08) {
  return 1 + (Math.random() * 2 - 1) * spread
}

async function main() {
  console.log('\n삐딱 데일리 리포트 — 시드 시작\n')

  // 1) 매장 ---------------------------------------------------
  const storeIds: Record<string, string> = {}
  for (const s of STORES) {
    const { data, error } = await db
      .from('stores')
      .upsert({ ...s }, { onConflict: 'tag' })
      .select('id, tag')
      .single()
    if (error) throw new Error(`매장 ${s.name}: ${error.message}`)
    storeIds[s.tag] = data.id
    console.log(`  매장  ${s.name.padEnd(5)} ok`)
  }

  // 2) 계정 + 프로필 ------------------------------------------
  for (const a of ACCOUNTS) {
    const email = `${a.login_id}@${DOMAIN}`

    // 이미 있는 계정인지 확인 (재실행 대비)
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    let userId = list?.users.find((u) => u.email === email)?.id

    if (!userId) {
      const { data, error } = await db.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true, // 아이디 로그인이라 확인 메일을 보내지 않는다
      })
      if (error) throw new Error(`계정 ${a.login_id}: ${error.message}`)
      userId = data.user.id
    }

    const { error: pErr } = await db.from('profiles').upsert(
      {
        id: userId,
        login_id: a.login_id,
        name: a.name,
        role: a.role,
        store_id: a.store ? storeIds[a.store] : null,
      },
      { onConflict: 'id' }
    )
    if (pErr) throw new Error(`프로필 ${a.login_id}: ${pErr.message}`)
    console.log(`  계정  ${a.login_id.padEnd(7)} ${email}`)
  }

  // 3) 고정비 · 설정 -------------------------------------------
  for (const s of STORES) {
    const id = storeIds[s.tag]
    const [rent, mgmt, utility, insurance_etc] = FIXED[s.tag]
    await db
      .from('fixed_costs')
      .upsert({ store_id: id, rent, mgmt, utility, insurance_etc }, { onConflict: 'store_id' })
    await db.from('store_settings').upsert(
      {
        store_id: id,
        monthly_goal: PROFILE[s.tag].goal,
        target_cost_rate: 33,
        target_labor_rate: 20,
        business_days: 30,
      },
      { onConflict: 'store_id' }
    )
  }
  console.log('  고정비·목표 설정 ok')

  // 4) 직원 ----------------------------------------------------
  for (const s of STORES) {
    const id = storeIds[s.tag]
    const { count } = await db
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', id)
    if (count && count > 0) continue // 이미 있으면 건드리지 않는다

    await db.from('staff').insert(
      STAFF[s.tag].map(([name, position, pay_type, rate, work_hours]) => ({
        store_id: id,
        name,
        position,
        pay_type,
        rate,
        work_hours,
      }))
    )
  }
  console.log('  직원 ok')

  // 5) 최근 35일 마감 ------------------------------------------
  const today = new Date()
  for (const s of STORES) {
    const id = storeIds[s.tag]
    const p = PROFILE[s.tag]
    const rows = []

    // 오늘은 "미입력" 상태로 남겨둔다 — 일마감 화면의 미입력 표시를 확인하기 위해
    for (let back = 1; back <= 35; back++) {
      const d = new Date(today)
      d.setDate(d.getDate() - back)

      const sales = Math.round(
        (p.base * DOW_FACTOR[d.getDay()] * jitter()) / 1000
      ) * 1000

      const card = Math.round((sales * 0.62) / 1000) * 1000
      const cash = Math.round((sales * 0.13) / 1000) * 1000
      const delivery = Math.round((sales * 0.21) / 1000) * 1000
      const etc = sales - card - cash - delivery

      rows.push({
        store_id: id,
        date: isoDate(d),
        guests: Math.round(p.guests * DOW_FACTOR[d.getDay()] * jitter(0.1)),
        sales_card: card,
        sales_cash: cash,
        sales_delivery: delivery,
        sales_etc: etc,
        cost: Math.round((sales * p.costRate * jitter(0.06)) / 1000) * 1000,
        expense: Math.round((30_000 + Math.random() * 90_000) / 1000) * 1000,
        memo: '',
      })
    }

    const { error } = await db
      .from('daily_closings')
      .upsert(rows, { onConflict: 'store_id,date' })
    if (error) throw new Error(`마감 ${s.name}: ${error.message}`)
  }
  console.log('  일마감 35일치 ok (오늘은 미입력 상태로 둠)')

  // 6) 할일 ----------------------------------------------------
  for (const s of STORES) {
    const id = storeIds[s.tag]
    const { count } = await db
      .from('todos')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', id)
    if (count && count > 0) continue

    await db.from('todos').insert(
      TODOS[s.tag].map(([text, assignee, done]) => ({
        store_id: id,
        text,
        assignee,
        done,
        done_at: done ? new Date().toISOString() : null,
      }))
    )
  }
  console.log('  할일 ok')

  // 7) 리뷰 ----------------------------------------------------
  for (const s of STORES) {
    const id = storeIds[s.tag]
    const { count } = await db
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', id)
    if (count && count > 0) continue

    await db.from('reviews').insert(
      REVIEWS[s.tag].map(([source, author, rating, text, hoursAgo]) => ({
        store_id: id,
        source,
        author,
        rating,
        text,
        posted_at: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
        is_new: hoursAgo < 24,
      }))
    )
  }
  console.log('  리뷰 ok')

  console.log(`
─────────────────────────────────────────────
시드 완료. 데모 계정 (비밀번호 공통: ${PASSWORD})

  admin    오너 · 3개 매장 전부
  bbiddak   삐딱 점장
  woosam   우삼집 점장
  ssuk     쑥고개 점장

로그인 화면에서는 아이디만 입력하면 됩니다.
─────────────────────────────────────────────
`)
}

main().catch((e) => {
  console.error('\n✗ 시드 실패:', e.message, '\n')
  process.exit(1)
})
