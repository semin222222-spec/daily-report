'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { logout, switchStore } from '@/app/(app)/actions'
import { StoreLogo } from '@/components/BrandMark'
import { formatDateKo, todayKST } from '@/lib/format'
import { VISIBLE_NAV_ITEMS, navLabel } from '@/lib/nav'
import type { SessionContext } from '@/lib/types'

/**
 * 앱 셸 — 시안의 #app (사이드바 248px + 메인).
 * 880px 이하에서는 사이드바가 오프캔버스로 빠지고 ☰ 버튼과 스크림이 나타난다.
 */
export function AppShell({
  session,
  logos,
  children,
}: {
  session: SessionContext
  /** 매장 tag → 로고 경로 (없으면 null). 서버에서 파일 유무를 확인해 넘겨준다 */
  logos: Record<string, string | null>
  children: React.ReactNode
}) {
  const { profile, stores, activeStore } = session
  const pathname = usePathname()
  const [sideOpen, setSideOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  // 메뉴를 눌러 페이지가 바뀌면 모바일 사이드바를 닫는다
  useEffect(() => {
    setSideOpen(false)
  }, [pathname])

  const isOwner = profile.role === 'owner'

  return (
    <div className="min-h-screen shell:grid shell:grid-cols-[248px_1fr]">
      {/* ── 스크림 (모바일) ─────────────────────── */}
      {sideOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 shell:hidden"
          onClick={() => setSideOpen(false)}
          aria-hidden
        />
      )}

      {/* ── 사이드바 ────────────────────────────── */}
      <aside
        className={`fixed z-50 flex h-screen w-[248px] flex-col bg-brand-ink px-4 py-5 text-white
                    transition-[left] duration-[250ms] shell:sticky shell:top-0 shell:left-0
                    ${sideOpen ? 'left-0' : '-left-[260px]'}`}
      >
        <div className="flex items-center gap-2.5 px-2 pb-[18px] pt-1.5">
          <div>
            <div className="text-[26px] font-black leading-none tracking-[-0.04em]">
              <span className="tilt text-brand">삐딱</span>
            </div>
            <small className="mt-1 block text-[10.5px] font-semibold tracking-[.15em] text-white/45">
              DAILY REPORT
            </small>
          </div>
        </div>

        <div className="mx-2.5 mb-2 mt-4 text-[10.5px] font-bold tracking-[.16em] text-white/35">
          매장정산
        </div>

        <nav className="flex flex-col overflow-y-auto">
          {VISIBLE_NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-0.5 flex w-full items-center gap-[11px] rounded-[11px] px-3 py-2.5
                            text-sm font-semibold transition ${
                              active
                                ? 'bg-brand text-white'
                                : 'text-white/70 hover:bg-white/[.06] hover:text-white'
                            }`}
              >
                <span className="w-[18px] text-center text-[15px]">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-3">
          <div className="px-2.5 py-1 text-[12.5px] text-white/80">
            👤 <b className="text-white">{profile.name}</b>
            <br />
            <span className="text-[11px] text-white/50">
              {isOwner ? '전체 관리자 · 모든 기능' : '매장 점장'}
            </span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1.5 w-full rounded-[9px] border border-white/[.12] bg-white/[.06]
                         py-2.5 text-[13px] font-semibold text-white/80
                         transition hover:bg-white/[.12] hover:text-white"
            >
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      {/* ── 메인 ────────────────────────────────── */}
      <div className="flex min-w-0 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center gap-4 border-b border-line
                     bg-page/85 px-4 py-3.5 backdrop-blur-lg shell:px-[26px]"
        >
          <button
            type="button"
            onClick={() => setSideOpen(true)}
            aria-label="메뉴 열기"
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px]
                       border border-line bg-white text-lg shell:hidden"
          >
            ☰
          </button>

          <div className="min-w-0">
            <h1 className="m-0 truncate text-[19px] font-extrabold">
              {navLabel(pathname)}
            </h1>
            <div className="text-[13px] text-muted">
              {formatDateKo(todayKST())}
            </div>
          </div>

          {/* 매장 스위처 — owner만, 매장이 2개 이상일 때만 */}
          {isOwner && stores.length > 1 && (
            <div className="ml-auto flex items-center gap-1.5 rounded-xl border border-line bg-white p-1">
              {stores.map((s) => {
                const active = s.id === activeStore.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => {
                        switchStore(s.id)
                      })
                    }
                    className={`flex items-center gap-[7px] rounded-[9px] px-2 py-[7px] text-[13px]
                                font-bold transition disabled:opacity-60 shell:px-3.5 ${
                                  active
                                    ? 'bg-page text-ink shadow-[inset_0_0_0_1px_#e7e4dd]'
                                    : 'text-ink-2 hover:text-ink'
                                }`}
                  >
                    <StoreLogo
                      tag={s.tag}
                      name={s.name}
                      color={s.color}
                      badge={s.badge}
                      size={18}
                      src={logos[s.tag]}
                    />
                    <span className="hidden sm:inline">{s.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* manager는 스위처 대신 본인 매장 표시 */}
          {!isOwner && (
            <div className="ml-auto flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
              <StoreLogo
                tag={activeStore.tag}
                name={activeStore.name}
                color={activeStore.color}
                badge={activeStore.badge}
                size={18}
                src={logos[activeStore.tag]}
              />
              <span className="text-[13px] font-bold text-ink">
                {activeStore.name}
              </span>
            </div>
          )}
        </header>

        <div className="w-full max-w-[1180px] px-4 pb-[60px] pt-6 shell:px-[26px]">
          {children}
        </div>
      </div>
    </div>
  )
}
