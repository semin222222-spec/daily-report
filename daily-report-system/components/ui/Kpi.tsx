/** 시안의 .tile — KPI 타일 */
export function KpiTile({
  label,
  value,
  unit,
  foot,
  tone = 'neutral',
}: {
  label: string
  value: string
  unit?: string
  foot?: React.ReactNode
  tone?: 'up' | 'down' | 'neutral'
}) {
  const toneClass =
    tone === 'up' ? 'text-good' : tone === 'down' ? 'text-bad' : 'text-ink-2'

  return (
    <div className="tile">
      <div className="tile-lab">{label}</div>
      <div className="tile-val">
        {value}
        {unit && <small className="text-[15px] font-bold text-ink-2">{unit}</small>}
      </div>
      {foot && (
        <div
          className={`mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold ${toneClass}`}
        >
          {foot}
        </div>
      )}
    </div>
  )
}

/** 진행 바 — 목표 달성률 등 */
export function ProgressBar({
  pct,
  color,
}: {
  pct: number
  color?: string
}) {
  return (
    <div className="bar">
      <span
        style={{
          width: `${Math.max(0, Math.min(pct, 100))}%`,
          background: color,
        }}
      />
    </div>
  )
}
