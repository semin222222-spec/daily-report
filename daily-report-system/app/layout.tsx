import './globals.css';
import { AuthProvider } from '@/lib/auth';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: '매장 마감 보고 시스템',
  description: '5개 매장 일일 마감 보고 및 매출 대시보드',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#faf7f2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{
        fontFamily: "'EB Garamond', Georgia, serif",
        backgroundColor: '#faf7f2',
        color: '#1a1612',
        minHeight: '100vh',
        WebkitTapHighlightColor: 'transparent',
        WebkitTextSizeAdjust: '100%',
      }}>
        <AuthProvider>
          <NavBar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}