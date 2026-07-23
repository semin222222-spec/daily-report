'use client'

import { useRouter } from 'next/navigation'

/**
 * 월 선택 드롭다운.
 * 화살표로 한 달씩 넘기는 것만으로는 몇 달 전으로 가기 번거로워서
 * 바로 고를 수 있게 둔다.
 */
export function MonthPicker({
  value,
  basePath,
  monthsBack = 24,
}: {
  /** 'YYYY-MM' */
  value: string
  /** 이동할 경로 — `${basePath}?ym=YYYY-MM` 로 붙는다 */
  basePath: string
  monthsBack?: number
}) {
  const router = useRouter()
  const [curYear, curMonth] = value.split('-').map(Number)

  // 선택된 달을 기준으로 과거 monthsBack개월 + 미래 1개월까지 나열한다.
  // (선택된 값이 목록에 없으면 select가 빈칸으로 보이기 때문)
  const options: Array<{ value: string; label: string }> = []
  for (let i = -1; i < monthsBack; i++) {
    const d = new Date(curYear, curMonth - 1 - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    options.push({ value: ym, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` })
  }

  return (
    <select
      value={value}
      aria-label="월 선택"
      onChange={(e) => router.push(`${basePath}?ym=${e.target.value}`)}
      className="rounded-[10px] border border-line bg-white px-3 py-2 text-[13px]
                 font-bold text-ink outline-none transition
                 focus:border-brand focus:ring-[3px] focus:ring-brand/10"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
