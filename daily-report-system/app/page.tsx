import { redirect } from 'next/navigation'

/** 진입점 — 인증 여부는 middleware가 판단한다 */
export default function Home() {
  redirect('/dashboard')
}
