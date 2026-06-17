interface Segment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: Segment[]
  total?: string
  subtitle?: string
  size?: number
  thickness?: number
}

export function DonutChart({ segments, total, subtitle, size = 140, thickness = 22 }: DonutChartProps) {
  const cx = size / 2
  const cy = size / 2
  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r

  const totalValue = segments.reduce((s, seg) => s + seg.value, 0)
  if (totalValue === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(128,128,128,0.15)" strokeWidth={thickness} />
      </svg>
    )
  }

  let offset = 0
  const arcs = segments.map((seg) => {
    const pct = seg.value / totalValue
    const dash = pct * circumference
    const arc = { ...seg, dash, gap: circumference - dash, offset, pct }
    offset += dash
    return arc
  })

  const gap = 3 // px gap between segments

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size} height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={thickness - 2}
              strokeDasharray={`${Math.max(0, arc.dash - gap)} ${circumference - arc.dash + gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="round"
            />
          ))}
        </svg>
        {total && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="font-bold text-[var(--text-primary)] leading-none" style={{ fontSize: size < 120 ? 14 : 18 }}>
              {total}
            </span>
            {subtitle && (
              <span className="text-[10px] text-[var(--text-muted)] mt-1">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface DonutWithLegendProps extends DonutChartProps {
  legendItems?: Array<{ label: string; value: string; color: string; pct: string }>
}

export function DonutWithLegend({ segments, total, subtitle, size = 140, thickness = 22, legendItems }: DonutWithLegendProps) {
  return (
    <div className="flex items-center gap-6">
      <DonutChart segments={segments} total={total} subtitle={subtitle} size={size} thickness={thickness} />
      {legendItems && legendItems.length > 0 && (
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.label}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{item.pct}</div>
                </div>
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)] flex-shrink-0">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
