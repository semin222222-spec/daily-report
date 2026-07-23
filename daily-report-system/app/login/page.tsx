import { BrandLockup, StoreLogo } from '@/components/BrandMark'
import { getAvailableLogos } from '@/lib/logos'
import { createClient } from '@/lib/supabase/server'
import type { Store } from '@/lib/types'
import { LoginForm, type LoginHint } from './LoginForm'

export const dynamic = 'force-dynamic'

/** 매장 테이블을 못 읽을 때(마이그레이션 전) 쓰는 표시용 폴백 */
const FALLBACK_STORES: Store[] = [
  { tag: 'bbiddak', brand: 'bbiddak', name: '삐딱', branch: '을지로점', color: '#f0542d', badge: '삐', kind: 'main' },
  { tag: 'woosam', brand: 'woosam', name: '우삼집', branch: '연남점', color: '#d98324', badge: '우', kind: 'franchise' },
  { tag: 'ssuk', brand: 'ssuk', name: '쑥고개', branch: '', color: '#4b7f52', badge: '쑥', kind: 'franchise' },
].map((s, i) => ({
  ...s,
  id: s.tag,
  sort_order: i,
  is_active: true,
  created_at: '',
})) as Store[]

/** /auth/signout 이 넘겨준 사유를 사람이 읽을 수 있는 안내로 */
const SIGNOUT_REASONS: Record<string, string> = {
  'no-profile':
    '계정은 있지만 권한 설정이 없습니다. Supabase SQL Editor에서 004_accounts.sql 을 실행하거나, 오너에게 계정 연결을 요청해주세요.',
  'no-store':
    '등록된 매장이 없습니다. Supabase SQL Editor에서 003_seed.sql 을 먼저 실행해주세요.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const notice = searchParams.error
    ? SIGNOUT_REASONS[searchParams.error] ?? '로그인이 만료되었습니다. 다시 로그인해주세요.'
    : null

  const supabase = createClient()
  const { data } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const stores = data && data.length > 0 ? (data as Store[]) : FALLBACK_STORES

  // 계정 안내는 실제 발급된 계정을 읽어온다.
  // (예전에는 매장 태그로 아이디를 추측해서 없는 계정이 떴다)
  const { data: hintRows } = await supabase.rpc('login_hints')
  const hints = (hintRows ?? []) as LoginHint[]

  // 로고 파일 유무를 서버에서 확정한다 (깨진 이미지 방지)
  const logos = await getAvailableLogos()
  // 로고는 브랜드 기준 — 같은 브랜드의 여러 지점이 파일 하나를 공유한다
  const srcOf = (key: string) => (logos.has(key) ? `/logos/${key}.png` : null)

  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-8"
      style={{
        background:
          'radial-gradient(1200px 600px at 80% -10%, rgba(240,84,45,.22), transparent 60%),' +
          'radial-gradient(900px 500px at -10% 110%, rgba(217,131,36,.16), transparent 55%),' +
          '#191512',
      }}
    >
      <div
        className="grid w-full max-w-[940px] grid-cols-1 overflow-hidden rounded-3xl
                   border border-white/[.09] bg-white/[.03] shadow-land
                   shell:grid-cols-[1.15fr_.85fr]"
      >
        {/* ── 좌: 브랜드 ─────────────────────────── */}
        <div className="flex flex-col justify-center px-7 py-10 text-white shell:px-[46px] shell:py-[52px]">
          <div className="mb-5 text-[15px] font-bold tracking-[.28em] text-white/60 shell:text-[16px]">
            주식회사 삐딱
          </div>

          <BrandLockup
            src={srcOf('bbiddak')}
            symbolSize={62}
            textSize={46}
            className="shell:hidden"
          />
          <BrandLockup
            src={srcOf('bbiddak')}
            symbolSize={88}
            textSize={66}
            className="hidden shell:inline-flex"
          />

          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            매출과 손익을 한 곳에서 관리하는
            <br />삐딱 전용 정산 시스템
          </p>

          <div className="mt-9 flex flex-wrap gap-2.5">
            {stores.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-[9px] rounded-full border py-[9px] pl-2.5 pr-4 ${
                  s.kind === 'main'
                    ? 'border-brand/45 bg-brand/[.16]'
                    : 'border-white/10 bg-white/[.06]'
                }`}
              >
                <StoreLogo
                  tag={s.tag}
                  name={s.name}
                  color={s.color}
                  badge={s.badge}
                  size={26}
                  onDark
                  src={srcOf(s.brand || s.tag)}
                />
                <div>
                  <div className="text-[13.5px] font-semibold text-white/85">
                    {s.name}
                  </div>
                  {/* 지점명이 없는 매장은 이름만 (빈 줄이 생기지 않게) */}
                  {s.branch && (
                    <div className="text-[11px] text-white/45">{s.branch}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 우: 로그인 폼 ──────────────────────── */}
        <LoginForm hints={hints} notice={notice} />
      </div>
    </main>
  )
}
