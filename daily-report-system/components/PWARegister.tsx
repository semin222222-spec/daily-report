'use client'

import { useEffect } from 'react'

/**
 * 서비스워커를 등록해 "홈 화면에 추가"(PWA 설치)가 뜨게 한다.
 * 화면에는 아무것도 그리지 않는다.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 등록 실패해도 앱은 정상 동작한다 (설치 배너만 안 뜰 뿐)
      })
    }

    // 첫 로드 부담을 줄이려고 load 이후에 등록한다
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register)

    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
