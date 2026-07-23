import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '주식회사 삐딱 · 매장정산',
  description: '삐딱, 우삼집, 쑥고개 — 세 매장의 매출과 손익을 한 곳에서 관리하는 삐딱 전용 정산 시스템',
  icons: { icon: '/logos/bbiddak.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#191512',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  )
}
