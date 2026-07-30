import type { Metadata, Viewport } from 'next'
import { PWARegister } from '@/components/PWARegister'
import './globals.css'

/**
 * 서버 함수를 서울(icn1)에서 실행한다.
 *
 * Supabase가 서울(ICN)에 있는데 Vercel 기본 지역은 미국(워싱턴, iad1)이라,
 * 이걸 안 맞추면 쿼리마다 미국↔서울을 왕복해 한 페이지에 1~2초가 걸린다.
 * 같은 서울로 맞추면 함수↔DB가 ~5ms로 붙어 대부분의 로딩이 사라진다.
 *
 * (Vercel 대시보드 Settings → Functions → Region 도 Seoul로 맞추면 확실하다)
 */
export const preferredRegion = 'icn1'

export const metadata: Metadata = {
  title: '주식회사 삐딱 · 매장정산',
  description: '삐딱, 우삼집, 쑥고개 — 세 매장의 매출과 손익을 한 곳에서 관리하는 삐딱 전용 정산 시스템',
  applicationName: '삐딱 전용앱',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logos/bbiddak.png',
    apple: '/icons/apple-touch-icon.png',
  },
  // iOS에서 홈 화면에 추가하면 전체화면 앱처럼 뜨게 한다
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '삐딱 전용앱',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 앱처럼 쓸 때 확대/축소를 막아 데스크톱 앱 느낌을 준다
  maximumScale: 1,
  userScalable: false,
  themeColor: '#191512',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="font-sans">
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
