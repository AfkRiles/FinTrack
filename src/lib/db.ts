import Dexie, { type Table } from 'dexie'
import type {
  Category,
  IncomeEntry,
  CryptoHolding,
  Wallet,
  StockHolding,
  CashHolding,
  NetWorthSnapshot,
} from '../types'

export class FinTrackDB extends Dexie {
  categories!: Table<Category>
  incomeEntries!: Table<IncomeEntry>
  cryptoHoldings!: Table<CryptoHolding>
  wallets!: Table<Wallet>
  stockHoldings!: Table<StockHolding>
  cashHoldings!: Table<CashHolding>
  netWorthSnapshots!: Table<NetWorthSnapshot>

  constructor() {
    super('fintrack')
    this.version(1).stores({
      categories: 'id, name, createdAt',
      incomeEntries: 'id, categoryId, date, sourceName, createdAt',
      cryptoHoldings: 'id, tokenId, symbol, source, walletId',
      wallets: 'id, chain, address',
      stockHoldings: 'id, ticker, exchange',
      cashHoldings: 'id, label',
      netWorthSnapshots: 'id, date',
    })
    // v2: wallets gains optional zpub field for HD wallet scanning
    this.version(2).stores({
      wallets: 'id, chain, address, zpub',
    })
  }
}

export const db = new FinTrackDB()

// Premium color palette
const PREMIUM_CATEGORY_COLORS: Record<string, string> = {
  'Clients':      '#D97706', // amber — was Airdrops, now Clients
  'Airdrops':     '#3B82F6', // blue
  'Angle Rounds': '#4F46E5', // royal indigo
}

// Seed default categories if none exist
export async function seedDefaultCategories() {
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd([
      { id: crypto.randomUUID(), name: 'Clients',      color: PREMIUM_CATEGORY_COLORS['Clients'],      createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Airdrops',     color: PREMIUM_CATEGORY_COLORS['Airdrops'],     createdAt: Date.now() + 1 },
      { id: crypto.randomUUID(), name: 'Angle Rounds', color: PREMIUM_CATEGORY_COLORS['Angle Rounds'], createdAt: Date.now() + 2 },
    ])
  }
}

// Normalize income entry source names so duplicate spellings merge in Stats
export async function normalizeSourceNames() {
  const entries = await db.incomeEntries.toArray()
  const normalize = (name: string): string => {
    const l = name.toLowerCase().trim()
    if (l.includes('canna'))   return 'Canna Sapiens'
    if (l.includes('bullish')) return 'Bullish Sentiment'
    if (l.includes('smiley'))  return 'Smiley Electric'
    return name
  }
  const updates = entries
    .filter(e => normalize(e.sourceName) !== e.sourceName)
    .map(e => db.incomeEntries.update(e.id, { sourceName: normalize(e.sourceName) }))
  await Promise.all(updates)
}

// Migrate existing categories to current colors
export async function migrateCategories() {
  const cats = await db.categories.toArray()
  const updates: Promise<number>[] = []
  for (const cat of cats) {
    const newColor = PREMIUM_CATEGORY_COLORS[cat.name]
    if (newColor && newColor !== cat.color) {
      updates.push(db.categories.update(cat.id, { color: newColor }))
    }
  }
  await Promise.all(updates)
}
