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

const SITE_URL = 'https://bbiddak.vercel.app'
const TITLE = '삐딱 데일리 리포트'
const DESC = '주식회사 삐딱 매장정산 · 점주센터'

export const metadata: Metadata = {
  // 상대 경로 이미지를 절대 URL로 바꿔주는 기준. 링크 미리보기에 꼭 필요하다.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  applicationName: '(주)삐딱 전용앱',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logos/bbiddak.png',
    shortcut: '/logos/bbiddak.png',
    apple: '/icons/apple-touch-icon.png',
  },
  // 카톡·메신저·SNS 링크 미리보기 카드에 새 로고가 뜨게 한다
  openGraph: {
    type: 'website',
    siteName: '삐딱 전용앱',
    title: TITLE,
    description: DESC,
    url: SITE_URL,
    locale: 'ko_KR',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '삐딱' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    images: ['/og.png'],
  },
  // iOS에서 홈 화면에 추가하면 전체화면 앱처럼 뜨게 한다
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '(주)삐딱 전용앱',
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
      <head>
        {/*
          "설치 가능" 신호(beforeinstallprompt)는 페이지가 뜨자마자 아주 이른 시점에
          단 한 번 발생한다. React 리스너가 붙기 전에 놓치지 않도록, 여기서 먼저
          가로채 window 에 저장해둔다. InstallButton 이 나중에 이 값을 꺼내 쓴다.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__bip = null;
              window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                window.__bip = e;
                window.dispatchEvent(new Event('bip-ready'));
              });
              window.addEventListener('appinstalled', function () {
                window.__bip = null;
                window.dispatchEvent(new Event('bip-installed'));
              });
            `,
          }}
        />
      </head>
      <body className="font-sans">
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
