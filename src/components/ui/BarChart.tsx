interface Bar {
  label: string
  value: number
  color?: string
  isActive?: boolean
}

interface BarChartProps {
  bars: Bar[]
  onBarClick?: (index: number) => void
  activeIndex?: number
  formatValue?: (v: number) => string
  height?: number
}

export function BarChart({ bars, onBarClick, activeIndex, formatValue, height = 160 }: BarChartProps) {
  const max = Math.max(...bars.map((b) => b.value), 1)

  const yLabels = [max, max * 0.5, 0].map((v) =>
    formatValue ? formatValue(v) : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`
  )

  return (
    <div className="w-full">
      <div className="flex gap-0.5 items-end" style={{ height }}>
        {/* Y axis */}
        <div className="flex flex-col justify-between h-full pb-5 pr-1 text-right w-10 flex-shrink-0">
          {yLabels.map((l, i) => (
            <span key={i} className="text-[10px] text-[var(--text-muted)]">{l}</span>
          ))}
        </div>

        {/* Bars */}
        {bars.map((bar, i) => {
          const pct = bar.value / max
          const isActive = activeIndex === i
          return (
            <button
              key={i}
              onClick={() => onBarClick?.(i)}
              className="flex-1 flex flex-col items-center justify-end gap-1 group focus:outline-none"
              style={{ height: '100%' }}
            >
              <div
                className="w-full rounded-t-lg transition-all duration-300"
                style={{
                  height: `${Math.max(pct * (height - 20), bar.value > 0 ? 4 : 0)}px`,
                  background: isActive
                    ? (bar.color || '#00C27C')
                    : bar.value > 0
                    ? `${bar.color || '#00C27C'}90`
                    : 'rgba(128,128,128,0.12)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: bar.value > 0 ? 4 : 0,
                }}
              />
              <span
                className={`text-[9px] font-medium transition-colors ${
                  isActive ? 'text-[#00C27C]' : 'text-[var(--text-muted)]'
                }`}
                style={{ lineHeight: 1.2 }}
              >
                {bar.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
