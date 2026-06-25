import { useState, useRef, useCallback } from 'react'

interface Bar {
  label: string
  value: number
  color?: string
  fullLabel?: string // e.g. "April 2025"
}

interface BarChartProps {
  bars: Bar[]
  onBarClick?: (index: number) => void
  activeIndex?: number
  formatValue?: (v: number) => string
  height?: number
}

export function BarChart({ bars, onBarClick, activeIndex, formatValue, height = 180 }: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const max = Math.max(...bars.map(b => b.value), 1)
  const fmtVal = useCallback((v: number) =>
    formatValue ? formatValue(v) : v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v/1_000).toFixed(1)}K` : `${v}`,
    [formatValue]
  )

  const handleMouseEnter = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    setHovered(i)
    if (containerRef.current) {
      const btnRect = e.currentTarget.getBoundingClientRect()
      const cRect = containerRef.current.getBoundingClientRect()
      const left = btnRect.left - cRect.left + btnRect.width / 2
      const top  = btnRect.top  - cRect.top - 8
      setTooltipStyle({ left, top, transform: 'translate(-50%, -100%)' })
    }
  }

  // Gridlines
  const gridLines = [1, 0.75, 0.5, 0.25, 0]

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ paddingLeft: 36 }}>

      {/* Y-axis gridlines */}
      <div className="absolute inset-0" style={{ left: 36, bottom: 24, top: 0, pointerEvents: 'none' }}>
        {gridLines.map((pct, i) => (
          <div
            key={i}
            className="absolute w-full border-t border-[var(--border-subtle)]"
            style={{ top: `${(1 - pct) * 100}%` }}
          />
        ))}
      </div>

      {/* Y-axis labels */}
      <div
        className="absolute left-0 flex flex-col justify-between"
        style={{ top: 0, bottom: 24, width: 34 }}
      >
        {[1, 0.75, 0.5, 0.25, 0].map((pct, i) => (
          <div key={i} className="text-right pr-2 text-[9px] font-medium text-[var(--text-faint)]" style={{ lineHeight: 1 }}>
            {pct > 0 ? fmtVal(max * pct) : '0'}
          </div>
        ))}
      </div>

      {/* Bars */}
      <div className="flex items-end gap-1" style={{ height }}>
        {bars.map((bar, i) => {
          const pct = max > 0 ? bar.value / max : 0
          const isHovered = hovered === i
          const isActive = activeIndex === i
          const barH = Math.max(pct * (height - 24), bar.value > 0 ? 6 : 0)
          const color = bar.color || 'var(--accent)'
          const isEmpty = bar.value === 0

          return (
            <button
              key={i}
              onMouseEnter={e => handleMouseEnter(i, e)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onBarClick?.(i)}
              className="flex-1 flex flex-col items-center justify-end focus:outline-none cursor-pointer group"
              style={{ height: '100%', paddingBottom: 0 }}
            >
              <div
                style={{
                  height: barH,
                  background: isEmpty
                    ? 'var(--border-subtle)'
                    : isHovered || isActive
                    ? color
                    : `${color}88`,
                  borderRadius: '5px 5px 3px 3px',
                  width: '100%',
                  transform: isHovered ? 'scaleY(1.04) translateY(-2px)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                  transition: 'transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: isHovered && !isEmpty ? `0 4px 16px ${color}44` : 'none',
                  animation: bar.value > 0 ? `barGrow 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.03}s both` : 'none',
                }}
              />
              <div
                className="text-[9px] font-semibold mt-1 transition-colors"
                style={{
                  color: isActive || isHovered ? color : 'var(--text-faint)',
                  height: 16,
                  lineHeight: '16px',
                }}
              >
                {bar.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Tooltip */}
      {hovered !== null && bars[hovered].value > 0 && (
        <div className="tooltip absolute z-50 pointer-events-none" style={tooltipStyle}>
          <div className="text-[11px] text-[rgba(255,255,255,0.5)] mb-0.5">
            {bars[hovered].fullLabel || bars[hovered].label}
          </div>
          <div className="text-sm font-bold text-white">
            {fmtVal(bars[hovered].value)}
          </div>
        </div>
      )}
    </div>
  )
}
