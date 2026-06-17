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
  }
}

export const db = new FinTrackDB()

// Seed default categories if none exist
export async function seedDefaultCategories() {
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd([
      { id: crypto.randomUUID(), name: 'Clients', color: '#00C27C', createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Airdrops', color: '#FF4D8F', createdAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Angle Rounds', color: '#9364FF', createdAt: Date.now() },
    ])
  }
}
