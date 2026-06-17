import { useAppStore } from '../store/useAppStore'

const FX_TTL = 5 * 60 * 1000 // 5 minutes

export async function fetchFXRate(): Promise<number> {
  try {
    // Primary: frankfurter.app (no API key needed)
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=ZAR')
    if (res.ok) {
      const data = await res.json()
      const rate = data.rates?.ZAR
      if (rate) return rate
    }
  } catch (_) {}

  try {
    // Fallback: open.er-api.com
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (res.ok) {
      const data = await res.json()
      const rate = data.rates?.ZAR
      if (rate) return rate
    }
  } catch (_) {}

  return 18.5 // Last resort hardcoded fallback
}

export async function ensureFXRate(force = false): Promise<number> {
  const { fxRate, setFXRate } = useAppStore.getState()

  if (!force && fxRate && Date.now() - fxRate.fetchedAt < FX_TTL) {
    return fxRate.usdToZar
  }

  const rate = await fetchFXRate()
  setFXRate({ usdToZar: rate, fetchedAt: Date.now() })
  return rate
}

export function formatCurrency(amountUSD: number, currency: 'USD' | 'ZAR', fxRate: number): string {
  if (currency === 'ZAR') {
    const zar = amountUSD * fxRate
    return formatZAR(zar)
  }
  return formatUSD(amountUSD)
}

export function formatUSD(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatZAR(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `R${(amount / 1_000_000).toFixed(2)}M`
  if (Math.abs(amount) >= 1_000) return `R${(amount / 1_000).toFixed(1)}K`
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}
