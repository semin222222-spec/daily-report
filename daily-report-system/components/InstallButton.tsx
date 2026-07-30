'use client'

import { useEffect, useState } from 'react'

/**
 * 홈 화면에 바로 설치하는 버튼.
 * - Android/Chrome: beforeinstallprompt 를 잡아뒀다가 버튼 클릭 시 네이티브 설치창을 띄운다.
 * - iPhone/Safari: beforeinstallprompt 가 없으므로 "공유 → 홈 화면에 추가" 안내를 보여준다.
 * - 이미 설치돼 standalone 으로 실행 중이면 버튼을 숨긴다.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 이미 앱으로 실행 중이면 숨긴다
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari 전용 플래그
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) {
      setInstalled(true)
      return
    }

    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    setIsIOS(ios)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
      setShowGuide(false)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  // 안드로이드인데 아직 설치 이벤트가 안 잡혔고 iOS도 아니면, 버튼을 굳이 감춘다
  if (!deferred && !isIOS) return null

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null)
      return
    }
    // iOS: 네이티브 설치 API가 없어 안내창을 띄운다
    setShowGuide(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="mt-6 inline-flex items-center gap-2 self-start rounded-full
                   border border-white/20 bg-white/10 px-4 py-2.5 text-[13.5px]
                   font-bold text-white backdrop-blur
                   transition hover:border-white/35 hover:bg-white/20"
      >
        <span className="text-[15px]">📲</span>홈 화면에 앱 설치
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-extrabold">홈 화면에 앱 설치</h3>
            <p className="mt-1 text-[13px] text-muted">
              아이폰은 Safari에서 아래 순서로 추가합니다.
            </p>
            <ol className="mt-4 space-y-3 text-[13.5px] leading-relaxed">
              <li className="flex gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[12px] font-bold text-brand">
                  1
                </span>
                <span>
                  아래 가운데 <b>공유 버튼</b>{' '}
                  <span className="align-middle text-[15px]">􀈂</span> (⬆️ 네모에
                  화살표) 을 누릅니다.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[12px] font-bold text-brand">
                  2
                </span>
                <span>
                  목록을 내려 <b>홈 화면에 추가</b> 를 누릅니다.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[12px] font-bold text-brand">
                  3
                </span>
                <span>
                  오른쪽 위 <b>추가</b> 를 누르면 <b>(주)삐딱 전용앱</b> 이
                  홈 화면에 생깁니다.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  )
}
