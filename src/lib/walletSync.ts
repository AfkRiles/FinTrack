import { db } from './db'
import { fetchPrices } from './prices'

// ─── Your wallets ─────────────────────────────────────────────────────────────
export const WALLET_CONFIGS = [
  { chain: 'bitcoin',   symbol: 'BTC',  tokenId: 'bitcoin',     label: 'Bitcoin',   address: 'bc1qv5pfcql3hkef5afzpjcf6693qhghk7fwgfj38d' },
  { chain: 'ethereum',  symbol: 'ETH',  tokenId: 'ethereum',    label: 'Ethereum',  address: '0xccE01C00E6E80aA826f3F0eCCE0b23848eA5d244' },
  { chain: 'solana',    symbol: 'SOL',  tokenId: 'solana',      label: 'Solana',    address: 'D8BdL8WuWTnnjAVr17pnszEiebRyCnnQN6rLEZLv5ro' },
  { chain: 'xrp',       symbol: 'XRP',  tokenId: 'ripple',      label: 'XRP',       address: 'rH3DavoC4Fb37KF7UW8v2S6xGnieNVShYt' },
  { chain: 'usdc-eth',  symbol: 'USDC', tokenId: 'usd-coin',    label: 'USDC',      address: '0xccE01C00E6E80aA826f3F0eCCE0b23848eA5d244' },
  { chain: 'cardano',   symbol: 'ADA',  tokenId: 'cardano',     label: 'Cardano',   address: 'addr1qydeq3sfycy7kfux9uhl09zwm8txhkl22v4kk2nka9q535fy0ycauujxedwys4yku7ugpu3hpk7shdkru2whnglx330qqwvfdg' },
  { chain: 'avalanche', symbol: 'AVAX', tokenId: 'avalanche-2', label: 'Avalanche', address: '0xccE01C00E6E80aA826f3F0eCCE0b23848eA5d244' },
  { chain: 'sui',       symbol: 'SUI',  tokenId: 'sui',         label: 'Sui',       address: '0x98b193a2b2711f9b6c2761400cbdb0f6633e5e097ba775f6cc688f8c4392c7d0' },
] as const

export type WalletChain = typeof WALLET_CONFIGS[number]['chain']

// ─── Status per wallet ────────────────────────────────────────────────────────
export interface WalletSyncResult {
  chain: WalletChain
  symbol: string
  label: string
  address: string
  balance: number
  priceUSD: number
  valueUSD: number
  status: 'success' | 'error'
  error?: string
  syncedAt: number
}

// ─── RPC helpers ──────────────────────────────────────────────────────────────
const ETH_RPC  = 'https://cloudflare-eth.com'
const AVAX_RPC = 'https://api.avax.network/ext/bc/C/rpc'
const SOL_RPC  = 'https://api.mainnet-beta.solana.com'
const XRP_RPC  = 'https://xrplcluster.com'
const SUI_RPC  = 'https://fullnode.mainnet.sui.io'
const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

async function evmRpc(rpc: string, method: string, params: unknown[]): Promise<string> {
  const r = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message)
  return d.result
}

// ─── Per-chain balance fetchers ───────────────────────────────────────────────
async function fetchBTC(address: string): Promise<number> {
  const r = await fetch(
    `https://blockstream.info/api/address/${address}`,
    { signal: AbortSignal.timeout(8000) }
  )
  const d = await r.json()
  const stats = d.chain_stats
  return (stats.funded_txo_sum - stats.spent_txo_sum) / 1e8
}

async function fetchETH(address: string): Promise<number> {
  const hex = await evmRpc(ETH_RPC, 'eth_getBalance', [address, 'latest'])
  return Number(BigInt(hex)) / 1e18
}

async function fetchUSDC(address: string): Promise<number> {
  // ERC-20 balanceOf(address) — selector 0x70a08231
  const padded = '000000000000000000000000' + address.slice(2).toLowerCase()
  const data = '0x70a08231' + padded
  const hex = await evmRpc(ETH_RPC, 'eth_call', [{ to: USDC_CONTRACT, data }, 'latest'])
  if (!hex || hex === '0x') return 0
  return Number(BigInt(hex)) / 1e6  // USDC has 6 decimals
}

async function fetchSOL(address: string): Promise<number> {
  const r = await fetch(SOL_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
    signal: AbortSignal.timeout(8000),
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message)
  return d.result.value / 1e9  // lamports → SOL
}

async function fetchXRP(address: string): Promise<number> {
  const r = await fetch(XRP_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'account_info',
      params: [{ account: address, ledger_index: 'current' }],
    }),
    signal: AbortSignal.timeout(8000),
  })
  const d = await r.json()
  if (!d.result?.account_data) return 0
  return parseInt(d.result.account_data.Balance) / 1e6  // drops → XRP
}

async function fetchADA(address: string): Promise<number> {
  const r = await fetch('https://api.koios.rest/api/v1/address_info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ _addresses: [address] }),
    signal: AbortSignal.timeout(10000),
  })
  const d = await r.json()
  if (!d?.[0]?.balance) return 0
  return parseInt(d[0].balance) / 1e6  // lovelace → ADA
}

async function fetchAVAX(address: string): Promise<number> {
  const hex = await evmRpc(AVAX_RPC, 'eth_getBalance', [address, 'latest'])
  return Number(BigInt(hex)) / 1e18
}

async function fetchSUI(address: string): Promise<number> {
  const r = await fetch(SUI_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'suix_getBalance',
      params: [address, '0x2::sui::SUI'],
    }),
    signal: AbortSignal.timeout(8000),
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message)
  if (!d.result?.totalBalance) return 0
  return parseInt(d.result.totalBalance) / 1e9  // MIST → SUI
}

const FETCHERS: Record<WalletChain, (address: string) => Promise<number>> = {
  bitcoin:   fetchBTC,
  ethereum:  fetchETH,
  'usdc-eth': fetchUSDC,
  solana:    fetchSOL,
  xrp:       fetchXRP,
  cardano:   fetchADA,
  avalanche: fetchAVAX,
  sui:       fetchSUI,
}

// ─── Seed wallets into DB (run once) ─────────────────────────────────────────
export async function seedWallets() {
  const count = await db.wallets.count()
  if (count > 0) return
  await db.wallets.bulkAdd(
    WALLET_CONFIGS.map(w => ({
      id: crypto.randomUUID(),
      address: w.address,
      chain: w.chain as string,
      label: w.label,
    }))
  )
}

// ─── Main sync function ───────────────────────────────────────────────────────
export async function syncWallets(
  onProgress?: (chain: WalletChain, result: WalletSyncResult | null) => void
): Promise<WalletSyncResult[]> {
  // Fetch prices first (cached)
  const prices = await fetchPrices()

  const results = await Promise.allSettled(
    WALLET_CONFIGS.map(async (w): Promise<WalletSyncResult> => {
      onProgress?.(w.chain, null) // signal loading

      try {
        const fetcher = FETCHERS[w.chain]
        const balance = await fetcher(w.address)
        const priceUSD = prices[w.tokenId] ?? 0
        const valueUSD = balance * priceUSD
        const result: WalletSyncResult = {
          chain: w.chain,
          symbol: w.symbol,
          label: w.label,
          address: w.address,
          balance,
          priceUSD,
          valueUSD,
          status: 'success',
          syncedAt: Date.now(),
        }
        onProgress?.(w.chain, result)

        // Upsert into cryptoHoldings
        if (balance > 0 || true) { // always upsert so 0 balance clears old value
          const existing = await db.cryptoHoldings
            .where('tokenId').equals(w.tokenId)
            .and(h => h.source === 'wallet')
            .first()

          if (existing) {
            await db.cryptoHoldings.update(existing.id, {
              quantity: balance,
              lastPrice: priceUSD,
              lastPriceUpdated: Date.now(),
            })
          } else if (balance > 0) {
            await db.cryptoHoldings.add({
              id: crypto.randomUUID(),
              symbol: w.symbol,
              name: w.label,
              tokenId: w.tokenId,
              quantity: balance,
              source: 'wallet',
              lastPrice: priceUSD,
              lastPriceUpdated: Date.now(),
            })
          }
        }

        return result
      } catch (err) {
        const result: WalletSyncResult = {
          chain: w.chain,
          symbol: w.symbol,
          label: w.label,
          address: w.address,
          balance: 0,
          priceUSD: prices[w.tokenId] ?? 0,
          valueUSD: 0,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          syncedAt: Date.now(),
        }
        onProgress?.(w.chain, result)
        return result
      }
    })
  )

  return results.map(r => r.status === 'fulfilled' ? r.value : {
    chain: 'bitcoin' as WalletChain,
    symbol: '?', label: '?', address: '?',
    balance: 0, priceUSD: 0, valueUSD: 0,
    status: 'error' as const, syncedAt: Date.now(),
  })
}

// ─── Shorten address for display ─────────────────────────────────────────────
export function shortAddress(address: string): string {
  if (address.length <= 16) return address
  return `${address.slice(0, 8)}…${address.slice(-6)}`
}
