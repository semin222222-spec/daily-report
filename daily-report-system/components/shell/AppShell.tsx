'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { logout, switchStore } from '@/app/(app)/actions'
import { StoreLogo } from '@/components/BrandMark'
import { InstallButton } from '@/components/InstallButton'
import { formatDateKo, todayKST } from '@/lib/format'
import { isNavActive, navLabel, type NavItem } from '@/lib/nav'
import type { SessionContext } from '@/lib/types'

/**
 * 앱 셸 — 시안의 #app (사이드바 248px + 메인).
 * 880px 이하에서는 사이드바가 오프캔버스로 빠지고 ☰ 버튼과 스크림이 나타난다.
 */
export function AppShell({
  session,
  logos,
  navItems,
  children,
}: {
  session: SessionContext
  /** 매장 id → 로고 경로 (없으면 null). 브랜드 기준으로 서버에서 확인해 넘겨준다 */
  logos: Record<string, string | null>
  /** 이 계정 권한으로 보이는 메뉴만 (서버에서 필터링) */
  navItems: NavItem[]
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

  // 모바일 사이드바가 열려 있는 동안: 뒤 화면 스크롤 잠금 + ESC로 닫기
  useEffect(() => {
    if (!sideOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSideOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [sideOpen])

  // 글자를 입력하는 동안(키보드가 올라와 있을 때)은 하단 메뉴를 숨긴다.
  // 키보드 위에 메뉴가 떠서 입력칸을 가리는 걸 막는다. (globals.css의 data-typing)
  useEffect(() => {
    const isTextField = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'TEXTAREA' ||
        el.isContentEditable ||
        (el.tagName === 'INPUT' &&
          !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'].includes(
            (el as HTMLInputElement).type,
          )))
    const onIn = (e: FocusEvent) => {
      if (isTextField(e.target)) document.documentElement.dataset.typing = '1'
    }
    const onOut = () => {
      // 다음 칸으로 바로 옮겨가는 경우 깜빡이지 않게 한 박자 늦게 확인
      setTimeout(() => {
        if (!isTextField(document.activeElement)) delete document.documentElement.dataset.typing
      }, 50)
    }
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => {
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
      delete document.documentElement.dataset.typing
    }
  }, [])

  const isOwner = profile.role === 'owner'

  // 하단 메뉴: 자주 쓰는 화면 4개 (이 계정에 보이는 것 중에서) + 전체 메뉴
  const tabItems = BOTTOM_TABS.map((href) => navItems.find((n) => n.href === href)).filter(
    (n): n is NavItem => Boolean(n),
  ).slice(0, 4)

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
        className={`fixed top-0 z-50 flex h-[100dvh] w-[min(82vw,280px)] flex-col overscroll-contain
                    bg-brand-ink px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]
                    pt-[max(1.25rem,env(safe-area-inset-top))] text-white
                    transition-transform duration-[250ms] ease-out
                    shell:sticky shell:w-[248px] shell:translate-x-0 shell:pt-5
                    ${sideOpen ? 'left-0 translate-x-0 shadow-land' : 'left-0 -translate-x-[105%]'}`}
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

        <nav className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-0.5 flex w-full shrink-0 items-center gap-[11px] rounded-[11px] px-3 py-3 shell:py-2.5
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

        <div className="mt-3 shrink-0 border-t border-white/10 pt-3">
          <div className="px-2.5 py-1 text-[12.5px] text-white/80">
            👤 <b className="text-white">{profile.name}</b>
            <br />
            <span className="text-[11px] text-white/50">
              {isOwner ? '전체 관리자 · 모든 기능' : '매장 점장'}
            </span>
          </div>
          <div className="mt-1.5">
            <InstallButton variant="sidebar" />
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-[9px] border border-white/[.12] bg-white/[.06]
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
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-page/85
                     pb-2.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]
                     pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-lg
                     shell:gap-4 shell:px-[26px] shell:py-3.5"
        >
          <button
            type="button"
            onClick={() => setSideOpen(true)}
            aria-label="메뉴 열기"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]
                       border border-line bg-white text-lg active:scale-95 shell:hidden"
          >
            ☰
          </button>

          <div className="min-w-0">
            <h1 className="m-0 truncate text-[17px] font-extrabold shell:text-[19px]">
              {navLabel(pathname)}
            </h1>
            <div className="text-[12px] text-muted shell:text-[13px]">
              {formatDateKo(todayKST())}
            </div>
          </div>

          {/* 매장 스위처 — owner만, 매장이 2개 이상일 때만.
              모바일에서는 셀렉트로 접는다. 매장이 늘어나면 버튼이 여러 줄로
              접히면서 sticky 헤더가 화면의 20%를 잡아먹기 때문. */}
          {isOwner && stores.length > 1 && (
            <select
              aria-label="매장 선택"
              value={activeStore.id}
              disabled={pending}
              onChange={(e) => {
                const id = e.target.value
                startTransition(() => {
                  switchStore(id)
                })
              }}
              className="ml-auto max-w-[46vw] shrink-0 truncate rounded-xl border border-line
                         bg-white px-3 py-2 text-[13px] font-bold text-ink outline-none
                         disabled:opacity-60 shell:hidden"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {isOwner && stores.length > 1 && (
            <div className="ml-auto hidden items-center gap-1.5 rounded-xl border border-line bg-white p-1 shell:flex">
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
                      src={logos[s.id]}
                    />
                    <span className="hidden sm:inline">{s.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* manager는 스위처 대신 본인 매장 표시 */}
          {!isOwner && (
            <div className="ml-auto flex shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
              <StoreLogo
                tag={activeStore.tag}
                name={activeStore.name}
                color={activeStore.color}
                badge={activeStore.badge}
                size={18}
                src={logos[activeStore.id]}
              />
              <span className="text-[13px] font-bold text-ink">
                {activeStore.name}
              </span>
            </div>
          )}
        </header>

        <div
          className="w-full max-w-[1180px] pb-[calc(60px+var(--mnav))] pl-[max(1rem,env(safe-area-inset-left))]
                     pr-[max(1rem,env(safe-area-inset-right))] pt-4 shell:px-[26px] shell:pb-[60px] shell:pt-6"
        >
          {children}
        </div>
      </div>

      {/* ── 하단 메뉴 (모바일) ─────────────────────
          자주 쓰는 화면은 엄지로 바로. 나머지는 '전체'로 사이드바를 연다.
          글자 입력 중에는 숨긴다(data-typing). */}
      <nav
        aria-label="주요 메뉴"
        className="mnav fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)]
                   backdrop-blur-lg transition-transform duration-200 shell:hidden"
      >
        <div className="mx-auto flex h-[58px] max-w-[560px] items-stretch">
          {tabItems.map((item) => {
            const active = isNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold
                            transition active:scale-95 ${active ? 'text-brand' : 'text-muted'}`}
              >
                {active && (
                  <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand" aria-hidden />
                )}
                <span className={`text-[19px] leading-none ${active ? '' : 'opacity-70 grayscale'}`}>
                  {item.icon}
                </span>
                {SHORT_LABEL[item.href] ?? item.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setSideOpen(true)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold transition active:scale-95 ${
              tabItems.some((t) => isNavActive(pathname, t.href)) ? 'text-muted' : 'text-brand'
            }`}
          >
            <span className="text-[19px] leading-none">☰</span>
            전체
          </button>
        </div>
      </nav>
    </div>
  )
}

/** 하단 메뉴에 올릴 화면 (앞에서부터, 권한으로 보이는 것만 최대 4개) */
const BOTTOM_TABS = ['/dashboard', '/closing', '/closing-log', '/todos', '/reservations', '/schedule']

/** 하단 메뉴는 폭이 좁아 짧은 이름을 쓴다 */
const SHORT_LABEL: Record<string, string> = {
  '/dashboard': '홈',
  '/closing': '일마감',
  '/closing-log': '마감일지',
  '/todos': '할일',
  '/reservations': '예약',
  '/schedule': '스케줄',
}
