import { AppShell } from '@/components/shell/AppShell'
import { logoMapByStoreId } from '@/lib/logos'
import { getSessionContext } from '@/lib/session'

// 세션·매장 데이터를 매 요청마다 새로 읽는다 (캐시 금지)
export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionContext()

  // 로고 파일 유무는 서버에서만 알 수 있으므로 미리 뽑아서 클라이언트 셸에 넘긴다.
  // 브랜드 기준이라 같은 브랜드의 여러 지점이 로고 하나를 공유한다.
  const logos = await logoMapByStoreId(session.stores)

  return (
    <AppShell session={session} logos={logos}>
      {children}
    </AppShell>
  )
}
