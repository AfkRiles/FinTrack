import { useState } from 'react'

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

const MIN_SEGMENT_PCT = 0.025 // 2.5% minimum visible arc

export function DonutChart({ segments, total, subtitle, size = 140, thickness = 22 }: DonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const cx = size / 2, cy = size / 2
  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r

  const totalValue = segments.reduce((s, seg) => s + seg.value, 0)
  if (totalValue === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--border-subtle)" strokeWidth={thickness} />
      </svg>
    )
  }

  // Apply minimum segment size so tiny slices are still visible
  const rawPcts = segments.map(s => s.value / totalValue)
  const adjustedPcts = rawPcts.map(p => Math.max(p, MIN_SEGMENT_PCT))
  const adjustedTotal = adjustedPcts.reduce((a, b) => a + b, 0)
  const normalizedPcts = adjustedPcts.map(p => p / adjustedTotal)

  const GAP = 3 // px gap between segments
  let offset = 0
  const arcs = normalizedPcts.map((pct, i) => {
    const dash = pct * circumference
    const arc = { pct, rawPct: rawPcts[i], dash, offset, color: segments[i].color, label: segments[i].label, value: segments[i].value }
    offset += dash
    return arc
  })

  const hoveredArc = hovered !== null ? arcs[hovered] : null

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
    >
      {arcs.map((arc, i) => {
        const isHov = hovered === i
        const scale = isHov ? 1.06 : 1
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={isHov ? thickness + 3 : thickness - 1}
            strokeDasharray={`${Math.max(0, arc.dash - GAP)} ${circumference - arc.dash + GAP}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `scale(${scale})`,
              transition: 'stroke-width 0.18s ease, transform 0.18s ease',
              cursor: 'pointer',
              filter: isHov ? `drop-shadow(0 0 6px ${arc.color}88)` : 'none',
              opacity: hovered !== null && !isHov ? 0.55 : 1,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        )
      })}

      {/* Center text — rotated back upright */}
      <g transform={`rotate(90, ${cx}, ${cy})`}>
        {hoveredArc ? (
          <>
            <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)"
              style={{ fontSize: size < 130 ? 13 : 16, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
              {hoveredArc.label}
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--accent)"
              style={{ fontSize: size < 130 ? 11 : 13, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
              {(hoveredArc.rawPct * 100).toFixed(1)}%
            </text>
          </>
        ) : (
          <>
            {total && (
              <text x={cx} y={cy - (subtitle ? 7 : 0)} textAnchor="middle" fill="var(--text-primary)"
                style={{ fontSize: size < 130 ? 14 : 18, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif' }}>
                {total}
              </text>
            )}
            {subtitle && (
              <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)"
                style={{ fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                {subtitle}
              </text>
            )}
          </>
        )}
      </g>
    </svg>
  )
}

interface LegendItem {
  label: string
  value: string
  color: string
  pct: string
  rawValue?: number
}

interface DonutWithLegendProps extends DonutChartProps {
  legendItems?: LegendItem[]
}

export function DonutWithLegend({ segments, total, subtitle, size = 140, thickness = 22, legendItems }: DonutWithLegendProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const totalValue = segments.reduce((s, seg) => s + seg.value, 0)
  if (totalValue === 0) {
    return <DonutChart segments={segments} total={total} subtitle={subtitle} size={size} thickness={thickness} />
  }

  const MIN_PCT = MIN_SEGMENT_PCT
  const rawPcts = segments.map(s => s.value / totalValue)
  const adjustedPcts = rawPcts.map(p => Math.max(p, MIN_PCT))
  const adjTotal = adjustedPcts.reduce((a, b) => a + b, 0)
  const normalizedPcts = adjustedPcts.map(p => p / adjTotal)
  const GAP = 3
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  let offset = 0
  const arcs = normalizedPcts.map((pct, i) => {
    const dash = pct * circ
    const arc = { pct, rawPct: rawPcts[i], dash, offset, ...segments[i] }
    offset += dash
    return arc
  })
  const hoveredArc = hovered !== null ? arcs[hovered] : null

  return (
    <div className="flex items-center gap-6">
      {/* SVG */}
      <div className="flex-shrink-0 relative" style={{ width: size, height: size }}>
        <svg
          width={size} height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          {arcs.map((arc, i) => {
            const isHov = hovered === i
            return (
              <circle
                key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth={isHov ? thickness + 3 : thickness - 1}
                strokeDasharray={`${Math.max(0, arc.dash - GAP)} ${circ - arc.dash + GAP}`}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: `scale(${isHov ? 1.05 : 1})`,
                  transition: 'stroke-width 0.18s ease, transform 0.18s ease, opacity 0.18s ease',
                  cursor: 'pointer',
                  filter: isHov ? `drop-shadow(0 0 8px ${arc.color}66)` : 'none',
                  opacity: hovered !== null && !isHov ? 0.5 : 1,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
          <g transform={`rotate(90, ${cx}, ${cy})`}>
            {hoveredArc ? (
              <>
                <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)"
                  style={{ fontSize: size < 130 ? 11 : 14, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
                  {hoveredArc.label}
                </text>
                <text x={cx} y={cy + 9} textAnchor="middle" fill={hoveredArc.color}
                  style={{ fontSize: size < 130 ? 10 : 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                  {(hoveredArc.rawPct * 100).toFixed(1)}%
                </text>
              </>
            ) : (
              <>
                {total && (
                  <text x={cx} y={cy - (subtitle ? 7 : 0)} textAnchor="middle" fill="var(--text-primary)"
                    style={{ fontSize: size < 130 ? 14 : 18, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif' }}>
                    {total}
                  </text>
                )}
                {subtitle && (
                  <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)"
                    style={{ fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                    {subtitle}
                  </text>
                )}
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Legend */}
      {legendItems && (
        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          {legendItems.map((item, i) => {
            const isHov = hovered === i
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-2 cursor-pointer transition-opacity"
                style={{ opacity: hovered !== null && !isHov ? 0.4 : 1 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform"
                    style={{
                      background: item.color,
                      transform: isHov ? 'scale(1.3)' : 'scale(1)',
                      boxShadow: isHov ? `0 0 6px ${item.color}88` : 'none',
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{item.pct}</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] flex-shrink-0 tabular-nums">{item.value}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
