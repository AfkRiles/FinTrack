// CoinGecko free tier — no API key required
// Rate limit: ~10–30 calls/min; we cache for 3 min so this is fine

const COINGECKO = 'https://api.coingecko.com/api/v3'

interface PriceCache {
  prices: Record<string, number>
  fetchedAt: number
}

let cache: PriceCache | null = null
const TTL = 3 * 60 * 1000 // 3 minutes

export const WALLET_TOKEN_IDS = [
  'bitcoin',
  'ethereum',
  'solana',
  'ripple',
  'cardano',
  'avalanche-2',
  'sui',
  'usd-coin',
] as const

export type TokenId = typeof WALLET_TOKEN_IDS[number]

export async function fetchPrices(force = false): Promise<Record<string, number>> {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL) {
    return cache.prices
  }

  try {
    const ids = WALLET_TOKEN_IDS.join(',')
    const resp = await fetch(
      `${COINGECKO}/simple/price?ids=${ids}&vs_currencies=usd`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`)
    const data: Record<string, { usd: number }> = await resp.json()

    const prices: Record<string, number> = {}
    for (const id of WALLET_TOKEN_IDS) {
      prices[id] = data[id]?.usd ?? (id === 'usd-coin' ? 1.0 : 0)
    }

    cache = { prices, fetchedAt: Date.now() }
    return prices
  } catch (err) {
    console.warn('[prices] CoinGecko failed:', err)
    // Return cached or safe defaults
    return cache?.prices ?? {
      bitcoin: 0, ethereum: 0, solana: 0, ripple: 0,
      cardano: 0, 'avalanche-2': 0, sui: 0, 'usd-coin': 1,
    }
  }
}

export function getPriceAge(): number | null {
  return cache ? Date.now() - cache.fetchedAt : null
}
