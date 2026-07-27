import Link from 'next/link'
import { cookies } from 'next/headers'
import { OC_COOKIE } from '@/lib/owner-center'
import { lockOwnerCenter } from './actions'
import { BackButton } from './BackButton'
import { PinGate } from './PinGate'

export const dynamic = 'force-dynamic'

/**
 * 점주센터는 로그인에 더해 PIN까지 통과해야 들어온다.
 * 쿠키가 없으면 자식 대신 PIN 입력 화면을 보여준다.
 */
export default function OwnerCenterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const unlocked = cookies().get(OC_COOKIE)?.value === '1'

  if (!unlocked) return <PinGate />

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <BackButton />
        <Link
          href="/owner-center"
          className="text-[13px] font-bold text-brand-deep hover:underline"
        >
          🔐 점주센터
        </Link>
        <form action={lockOwnerCenter} className="ml-auto">
          <button type="submit" className="btn-ghost !px-3 !py-1.5 !text-xs">
            잠그기
          </button>
        </form>
      </div>
      {children}
    </div>
  )
}
