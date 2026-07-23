import { parseISODate } from '@/lib/format'

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 최근 N일 매출 추이 — 시안의 lineChart()를 그대로 옮긴 SVG.
 * 순수 함수라 서버 컴포넌트로 렌더된다(클라이언트 JS 0바이트).
 */
export function SalesTrend({
  points,
  color,
}: {
  points: Array<{ date: string; value: number }>
  color: string
}) {
  const w = 560
  const h = 150
  const pad = 8

  const values = points.map((p) => p.value)
  const rawMax = Math.max(...values, 0)
  const rawMin = Math.min(...values, 0)

  // 전부 0이면 (마감 데이터가 아직 없는 매장) 평평한 선이 그려지도록 범위를 임의로 준다
  const max = rawMax > 0 ? rawMax * 1.12 : 1
  const min = rawMax > 0 ? rawMin * 0.85 : 0
  const span = max - min || 1

  const xs = (i: number) =>
    points.length > 1 ? pad + (i * (w - 2 * pad)) / (points.length - 1) : w / 2
  const ys = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad)

  const pts = points.map((p, i) => [xs(i), ys(p.value)] as const)
  const line = pts
    .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ')
  const area = `${line} L ${xs(points.length - 1)} ${h - pad} L ${pad} ${h - pad} Z`

  const gradientId = `trend-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className="h-auto w-full" role="img" aria-label="매출 추이">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p[0].toFixed(1)}
          cy={p[1].toFixed(1)}
          r="3.5"
          fill="#fff"
          stroke={color}
          strokeWidth="2"
        />
      ))}

      {pts.map((p, i) => (
        <text
          key={i}
          x={p[0].toFixed(1)}
          y={h + 16}
          textAnchor="middle"
          fontSize="11"
          fill="#8f897f"
        >
          {DAY_KO[parseISODate(points[i].date).getDay()]}
        </text>
      ))}
    </svg>
  )
}
