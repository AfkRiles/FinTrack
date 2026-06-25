import { HDKey } from '@scure/bip32'
import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import { bech32 } from '@scure/base'
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

export const TOKEN_TO_CHAIN: Record<string, WalletChain> = {
  'bitcoin':     'bitcoin',
  'ethereum':    'ethereum',
  'solana':      'solana',
  'ripple':      'xrp',
  'cardano':     'cardano',
  'avalanche-2': 'avalanche',
  'sui':         'sui',
  'usd-coin':    'usdc-eth',
}

export const CHAIN_META: Record<WalletChain, { icon: string; color: string }> = {
  bitcoin:    { icon: '₿',  color: '#F7931A' },
  ethereum:   { icon: 'Ξ',  color: '#627EEA' },
  solana:     { icon: '◎',  color: '#9945FF' },
  xrp:        { icon: '✕',  color: '#00AAE4' },
  'usdc-eth': { icon: '$',  color: '#2775CA' },
  cardano:    { icon: '₳',  color: '#0033AD' },
  avalanche:  { icon: '▲',  color: '#E84142' },
  sui:        { icon: '●',  color: '#6FBCF0' },
}

// ─── BTC: known addresses (receive + change) ──────────────────────────────────
// These are the fallback when no zpub is configured.
// Add new change addresses here whenever you spend BTC and get change.
// Better long-term: set a zpub in Settings → the app discovers all addresses automatically.
const BTC_KNOWN_ADDRESSES = [
  'bc1qv5pfcql3hkef5afzpjcf6693qhghk7fwgfj38d', // primary receive
  'bc1q5c4k29jxdnanvgdh3d2mkd8yukvc9vpm5xy',     // change address
  'bc1qarsvw0emhylswyap3agwc6rrtp6sxk8pnu1',     // change address
]

// ─── BTC: zpub / xpub scanning ───────────────────────────────────────────────
// zpub version bytes (BIP84 native SegWit mainnet)
const ZPUB_VERSIONS = { public: 0x04b24746, private: 0x04b2430c }

function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data))
}

/** Derives the native SegWit (bc1q…) address from a compressed public key */
function pubkeyToP2WPKH(pubkey: Uint8Array): string {
  const pkh = hash160(pubkey)
  const dataWords = bech32.toWords(pkh)           // 8-bit → 5-bit
  const words = new Uint8Array(dataWords.length + 1)
  words[0] = 0                                    // witness version 0
  words.set(dataWords, 1)
  return bech32.encode('bc', words)               // "bc1q…"
}

/** Fetches confirmed balance for a single BTC address */
async function fetchBTCSingle(address: string): Promise<number> {
  const endpoints = [
    `https://mempool.space/api/address/${address}`,
    `https://blockstream.info/api/address/${address}`,
  ]
  let last: Error = new Error('BTC address fetch failed')
  for (const url of endpoints) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      const c = d.chain_stats
      return (c.funded_txo_sum - c.spent_txo_sum) / 1e8
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw last
}

/**
 * Scans one branch of an HD key (receive = 0, change = 1) with BIP44 gap limit.
 * Fetches up to BATCH_SIZE addresses in parallel per round for speed.
 */
async function scanZpubBranch(branch: HDKey, gapLimit = 20): Promise<number> {
  const BATCH = 10
  let total = 0
  let gap = 0
  let idx = 0

  while (gap < gapLimit) {
    // Derive a batch of addresses
    const addrs: string[] = []
    for (let j = 0; j < BATCH; j++) {
      const child = branch.deriveChild(idx + j)
      addrs.push(pubkeyToP2WPKH(child.publicKey!))
    }

    // Fetch all in parallel
    const results = await Promise.all(
      addrs.map(addr =>
        fetch(`https://mempool.space/api/address/${addr}`, { signal: AbortSignal.timeout(10000) })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    )

    for (const d of results) {
      const txs = d?.chain_stats?.tx_count ?? 0
      if (txs === 0) {
        gap++
        if (gap >= gapLimit) break
      } else {
        gap = 0
        total += (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8
      }
    }

    idx += BATCH
  }

  return total
}

/**
 * Full zpub scan — derives all receive (m/…/0/n) and change (m/…/1/n) addresses
 * up to the BIP44 gap limit, fetches balances in parallel batches.
 * Both branches scan concurrently so total time ≈ max(receive_time, change_time).
 */
async function fetchBTCFromZpub(zpub: string): Promise<number> {
  const root = HDKey.fromExtendedKey(zpub, ZPUB_VERSIONS)
  const [receive, change] = await Promise.all([
    scanZpubBranch(root.deriveChild(0)), // external / receive
    scanZpubBranch(root.deriveChild(1)), // internal / change
  ])
  return receive + change
}

// ─── BTC main fetcher ─────────────────────────────────────────────────────────
async function fetchBTC(_primaryAddress: string): Promise<number> {
  // Check if user has configured a zpub in Settings
  const btcWallet = await db.wallets.where('chain').equals('bitcoin').first()
  if (btcWallet?.zpub) {
    return fetchBTCFromZpub(btcWallet.zpub)
  }
  // Fall back to fetching all known addresses in parallel
  const balances = await Promise.all(BTC_KNOWN_ADDRESSES.map(fetchBTCSingle))
  return balances.reduce((s, b) => s + b, 0)
}

// ─── RPC helpers ──────────────────────────────────────────────────────────────
const ETH_RPCS = [
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://cloudflare-eth.com',
  'https://ethereum-rpc.publicnode.com',
]
const AVAX_RPCS = [
  'https://avalanche-c-chain-rpc.publicnode.com',
  'https://rpc.ankr.com/avalanche',
  'https://api.avax.network/ext/bc/C/rpc',
]
const SOL_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-rpc.publicnode.com',
]
const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

async function evmRpc(rpc: string, method: string, params: unknown[]): Promise<string> {
  const r = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const d = await r.json()
  if (d.error) throw new Error(d.error.message ?? JSON.stringify(d.error))
  return d.result
}

async function evmFallback(rpcs: string[], method: string, params: unknown[]): Promise<string> {
  let last: Error = new Error('No RPC available')
  for (const rpc of rpcs) {
    try { return await evmRpc(rpc, method, params) } catch (e) {
      last = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw last
}

async function fetchETH(address: string): Promise<number> {
  const hex = await evmFallback(ETH_RPCS, 'eth_getBalance', [address, 'latest'])
  return Number(BigInt(hex)) / 1e18
}

async function fetchUSDC(address: string): Promise<number> {
  const padded = '000000000000000000000000' + address.replace('0x', '').toLowerCase()
  const data   = '0x70a08231' + padded
  const hex    = await evmFallback(ETH_RPCS, 'eth_call', [{ to: USDC_CONTRACT, data }, 'latest'])
  if (!hex || hex === '0x') return 0
  const raw = hex.replace('0x', '')
  if (!raw || raw === '0'.repeat(raw.length)) return 0
  return Number(BigInt('0x' + raw)) / 1e6
}

async function fetchSOL(address: string): Promise<number> {
  let last: Error = new Error('No SOL RPC')
  for (const rpc of SOL_RPCS) {
    try {
      const r = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
        signal: AbortSignal.timeout(10000),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      if (d.error) throw new Error(d.error.message ?? JSON.stringify(d.error))
      return (d.result?.value ?? 0) / 1e9
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw last
}

async function fetchXRP(address: string): Promise<number> {
  const r = await fetch('https://xrplcluster.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'account_info',
      params: [{ account: address, ledger_index: 'validated' }],
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok) throw new Error(`XRP HTTP ${r.status}`)
  const d = await r.json()
  if (d.result?.error) throw new Error(d.result.error_message ?? d.result.error)
  const bal = d.result?.account_data?.Balance
  if (!bal) return 0
  return parseInt(bal) / 1e6
}

async function fetchADA(address: string): Promise<number> {
  const r = await fetch('https://api.koios.rest/api/v1/address_info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ _addresses: [address] }),
    signal: AbortSignal.timeout(12000),
  })
  if (!r.ok) throw new Error(`Koios HTTP ${r.status}`)
  const d = await r.json()
  if (!Array.isArray(d) || d.length === 0) return 0
  const bal = d[0]?.balance
  if (!bal) return 0
  return parseInt(bal) / 1e6
}

async function fetchAVAX(address: string): Promise<number> {
  const hex = await evmFallback(AVAX_RPCS, 'eth_getBalance', [address, 'latest'])
  return Number(BigInt(hex)) / 1e18
}

async function fetchSUI(address: string): Promise<number> {
  const r = await fetch('https://fullnode.mainnet.sui.io', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'suix_getBalance',
      params: [address, '0x2::sui::SUI'],
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok) throw new Error(`SUI HTTP ${r.status}`)
  const d = await r.json()
  if (d.error) throw new Error(d.error.message ?? JSON.stringify(d.error))
  const bal = d.result?.totalBalance
  if (!bal || bal === '0') return 0
  return parseInt(bal) / 1e9
}

const FETCHERS: Record<WalletChain, (addr: string) => Promise<number>> = {
  bitcoin:    fetchBTC,
  ethereum:   fetchETH,
  'usdc-eth': fetchUSDC,
  solana:     fetchSOL,
  xrp:        fetchXRP,
  cardano:    fetchADA,
  avalanche:  fetchAVAX,
  sui:        fetchSUI,
}

// ─── Seed wallets into DB (run once on boot) ──────────────────────────────────
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

/** Save or clear the BTC zpub. Pass null to revert to manual addresses. */
export async function saveBTCZpub(zpub: string | null) {
  const btcWallet = await db.wallets.where('chain').equals('bitcoin').first()
  if (btcWallet) {
    await db.wallets.update(btcWallet.id, { zpub: zpub ?? undefined } as object)
  }
}

/** Get the currently saved BTC zpub (null if not set) */
export async function getBTCZpub(): Promise<string | null> {
  const btcWallet = await db.wallets.where('chain').equals('bitcoin').first()
  return (btcWallet as { zpub?: string })?.zpub ?? null
}

// ─── Main sync ────────────────────────────────────────────────────────────────
export async function syncWallets(
  onProgress?: (chain: WalletChain, result: WalletSyncResult | null) => void
): Promise<WalletSyncResult[]> {
  const prices = await fetchPrices()

  const settled = await Promise.allSettled(
    WALLET_CONFIGS.map(async (w): Promise<WalletSyncResult> => {
      onProgress?.(w.chain, null)
      try {
        const balance  = await FETCHERS[w.chain](w.address)
        const priceUSD = prices[w.tokenId] ?? 0
        const result: WalletSyncResult = {
          chain: w.chain, symbol: w.symbol, label: w.label,
          address: w.address, balance, priceUSD,
          valueUSD: balance * priceUSD,
          status: 'success', syncedAt: Date.now(),
        }
        onProgress?.(w.chain, result)

        const existing = await db.cryptoHoldings
          .where('tokenId').equals(w.tokenId)
          .and(h => h.source === 'wallet')
          .first()

        if (existing) {
          await db.cryptoHoldings.update(existing.id, {
            quantity: balance,
            lastPrice: priceUSD,
            lastPriceUpdated: Date.now(),
            walletId: w.address,
          })
        } else {
          await db.cryptoHoldings.add({
            id: crypto.randomUUID(),
            symbol: w.symbol, name: w.label,
            tokenId: w.tokenId, quantity: balance,
            source: 'wallet', walletId: w.address,
            lastPrice: priceUSD, lastPriceUpdated: Date.now(),
          })
        }
        return result
      } catch (err) {
        const result: WalletSyncResult = {
          chain: w.chain, symbol: w.symbol, label: w.label,
          address: w.address, balance: 0,
          priceUSD: prices[w.tokenId] ?? 0, valueUSD: 0,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          syncedAt: Date.now(),
        }
        onProgress?.(w.chain, result)
        return result
      }
    })
  )

  return settled.map(r =>
    r.status === 'fulfilled' ? r.value : ({
      chain: 'bitcoin' as WalletChain, symbol: '?', label: '?', address: '?',
      balance: 0, priceUSD: 0, valueUSD: 0, status: 'error' as const, syncedAt: Date.now(),
    })
  )
}

export function shortAddress(address: string): string {
  if (address.length <= 16) return address
  return `${address.slice(0, 8)}…${address.slice(-6)}`
}
