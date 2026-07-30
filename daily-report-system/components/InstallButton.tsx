'use client'

import { useEffect, useState } from 'react'

/**
 * 홈 화면에 앱을 설치하는 버튼. 항상 보인다(이미 설치돼 실행 중일 때만 숨김).
 *
 * - 크롬/엣지(안드로이드·PC): layout 의 스크립트가 미리 잡아둔 설치 이벤트로
 *   버튼 클릭 시 네이티브 설치창을 바로 띄운다.
 * - 그 외(아이폰 사파리, PC/안드 파이어폭스 등): 설치 이벤트가 없으므로
 *   기기에 맞는 설치 안내창을 띄운다.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'desktop'

declare global {
  interface Window {
    __bip?: InstallPromptEvent | null
  }
}

export function InstallButton({
  variant = 'hero',
}: {
  /** hero = 로그인 화면(어두운 배경), sidebar = 로그인 후 사이드바(폭 꽉 채움) */
  variant?: 'hero' | 'sidebar'
}) {
  const [ready, setReady] = useState(false) // 네이티브 설치 이벤트 확보 여부
  const [installed, setInstalled] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [guide, setGuide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) {
      setInstalled(true)
      return
    }

    const ua = window.navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios')
    else if (/android/.test(ua)) setPlatform('android')
    else setPlatform('desktop')

    // layout 스크립트가 이미 잡아둔 이벤트가 있으면 바로 반영
    if (window.__bip) setReady(true)

    const onReady = () => setReady(true)
    const onInstalled = () => {
      setInstalled(true)
      setReady(false)
      setGuide(false)
    }
    window.addEventListener('bip-ready', onReady)
    window.addEventListener('bip-installed', onInstalled)
    return () => {
      window.removeEventListener('bip-ready', onReady)
      window.removeEventListener('bip-installed', onInstalled)
    }
  }, [])

  if (installed) return null

  const onClick = async () => {
    const bip = window.__bip
    if (ready && bip) {
      await bip.prompt()
      await bip.userChoice
      window.__bip = null
      setReady(false)
      return
    }
    setGuide(true) // 네이티브 설치를 못 쓰는 브라우저 → 안내창
  }

  const cls =
    variant === 'sidebar'
      ? `mb-1.5 flex w-full items-center justify-center gap-2 rounded-[9px]
         border border-white/[.12] bg-white/[.06] py-2.5 text-[13px]
         font-semibold text-white/80 transition hover:bg-white/[.12] hover:text-white`
      : `mt-6 inline-flex items-center gap-2 self-start rounded-full
         border border-white/20 bg-white/10 px-4 py-2.5 text-[13.5px]
         font-bold text-white backdrop-blur
         transition hover:border-white/35 hover:bg-white/20`

  return (
    <>
      <button type="button" onClick={onClick} className={cls}>
        <span className="text-[15px]">📲</span>홈 화면에 앱 설치
      </button>

      {guide && (
        <InstallGuide platform={platform} onClose={() => setGuide(false)} />
      )}
    </>
  )
}

/** 네이티브 설치창을 못 쓰는 브라우저용 수동 설치 안내 */
function InstallGuide({
  platform,
  onClose,
}: {
  platform: Platform
  onClose: () => void
}) {
  const steps: { n: number; body: React.ReactNode }[] =
    platform === 'ios'
      ? [
          {
            n: 1,
            body: (
              <>
                화면 아래 가운데 <b>공유 버튼</b>{' '}
                <span className="text-[15px]">⬆️</span> (네모에 화살표) 을 누릅니다.
              </>
            ),
          },
          {
            n: 2,
            body: (
              <>
                목록을 내려 <b>홈 화면에 추가</b> 를 누릅니다.
              </>
            ),
          },
          {
            n: 3,
            body: (
              <>
                오른쪽 위 <b>추가</b> 를 누르면 <b>(주)삐딱 전용앱</b> 이 홈 화면에
                생깁니다.
              </>
            ),
          },
        ]
      : platform === 'android'
      ? [
          {
            n: 1,
            body: (
              <>
                오른쪽 위 <b>⋮ 메뉴</b> 를 누릅니다.
              </>
            ),
          },
          {
            n: 2,
            body: (
              <>
                <b>앱 설치</b> 또는 <b>홈 화면에 추가</b> 를 누릅니다.
              </>
            ),
          },
          {
            n: 3,
            body: (
              <>
                <b>설치</b> 를 누르면 <b>(주)삐딱 전용앱</b> 이 홈 화면에 생깁니다.
              </>
            ),
          },
        ]
      : [
          {
            n: 1,
            body: (
              <>
                주소창 오른쪽 끝의 <b>설치 아이콘</b>{' '}
                <span className="text-[15px]">⊕</span> 을 누릅니다. (크롬·엣지)
              </>
            ),
          },
          {
            n: 2,
            body: (
              <>
                <b>설치</b> 를 누르면 <b>(주)삐딱 전용앱</b> 이 앱으로 열립니다.
              </>
            ),
          },
          {
            n: 3,
            body: (
              <>
                설치 아이콘이 안 보이면 <b>파이어폭스</b> 일 수 있어요. 크롬이나
                엣지로 다시 열어주세요.
              </>
            ),
          },
        ]

  const heading =
    platform === 'ios'
      ? '아이폰(Safari) 설치 방법'
      : platform === 'android'
      ? '안드로이드 설치 방법'
      : 'PC 설치 방법'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 text-ink shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-extrabold">{heading}</h3>
        <ol className="mt-4 space-y-3 text-[13.5px] leading-relaxed">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[12px] font-bold text-brand">
                {s.n}
              </span>
              <span>{s.body}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-white"
        >
          확인
        </button>
      </div>
    </div>
  )
}
