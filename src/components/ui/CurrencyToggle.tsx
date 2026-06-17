import { useAppStore } from '../../store/useAppStore'
import type { Currency } from '../../types'
import { formatTime } from '../../lib/fx'

export function CurrencyToggle() {
  const { currency, setCurrency, fxRate } = useAppStore()

  const toggle = (c: Currency) => setCurrency(c)

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center glass-sm rounded-full p-0.5 gap-0.5">
        {(['USD', 'ZAR'] as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
              currency === c
                ? 'bg-[#00C27C] text-white shadow-sm'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {fxRate && (
        <span className="text-[11px] text-[var(--text-muted)]">
          Rate: {(1 / fxRate.usdToZar).toFixed(4)} · {formatTime(fxRate.fetchedAt)}
        </span>
      )}
    </div>
  )
}
