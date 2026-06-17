import { db } from './db'
import type { Category, IncomeEntry } from '../types'

// Historical ZAR/USD rate approximations by year
// Used only for imported historical data
const HIST_RATE: Record<number, number> = {
  2022: 16.4,
  2023: 18.5,
  2024: 18.9,
  2025: 18.3,
  2026: 18.3,
}

const RAW_DATA = [
  { cat: 'Clients', src: 'PPA', zarAmount: 49485.90, m: 1, y: 2022, note: '(mint)' },
  { cat: 'Clients', src: 'PPA', zarAmount: 26286.86, m: 2, y: 2022, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 8907.79, m: 3, y: 2022, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 20127.39, m: 4, y: 2022, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 13596.09, m: 5, y: 2022, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 7743.79, m: 6, y: 2022, note: '' },
  { cat: 'Clients', src: 'Cosmiqs', zarAmount: 42404.94, m: 3, y: 2022, note: '(mint)' },
  { cat: 'Clients', src: 'Smiley Electric', zarAmount: 14728.35, m: 3, y: 2022, note: '' },
  { cat: 'Clients', src: 'Smiley Elec', zarAmount: 17091.96, m: 4, y: 2022, note: '' },
  { cat: 'Clients', src: 'Nubbies', zarAmount: 17670.80, m: 5, y: 2022, note: '' },
  { cat: 'Clients', src: 'Wlrd Eco', zarAmount: 10129.76, m: 5, y: 2022, note: '' },
  { cat: 'Clients', src: 'Elysium MG', zarAmount: 6592.38, m: 5, y: 2022, note: '' },
  { cat: 'Clients', src: 'Crazy Gold', zarAmount: 1720.45, m: 6, y: 2022, note: '' },
  { cat: 'Clients', src: 'DSPC', zarAmount: 56081.87, m: 8, y: 2022, note: '' },
  { cat: 'Clients', src: 'Misfits', zarAmount: 30102.17, m: 8, y: 2022, note: '' },
  { cat: 'Clients', src: 'DSPC', zarAmount: 90856.18, m: 9, y: 2022, note: '' },
  { cat: 'Clients', src: 'DSPC', zarAmount: 49873.90, m: 10, y: 2022, note: '' },
  { cat: 'Clients', src: 'Meighta', zarAmount: 6547.47, m: 10, y: 2022, note: '' },
  { cat: 'Clients', src: 'Rift Trip', zarAmount: 4041.65, m: 10, y: 2022, note: '' },
  { cat: 'Clients', src: 'Limau', zarAmount: 12933.26, m: 10, y: 2022, note: '' },
  { cat: 'Clients', src: 'Deva', zarAmount: 8152.04, m: 11, y: 2022, note: '' },
  { cat: 'Clients', src: 'DSPC', zarAmount: 17815.57, m: 11, y: 2022, note: '' },
  { cat: 'Clients', src: 'Rift Trip', zarAmount: 12270.43, m: 11, y: 2022, note: '' },
  { cat: 'Clients', src: 'Limau', zarAmount: 12933.26, m: 11, y: 2022, note: '' },
  { cat: 'Clients', src: 'Deva', zarAmount: 15810.92, m: 11, y: 2022, note: '' },
  { cat: 'Clients', src: 'Novus', zarAmount: 1720.45, m: 11, y: 2022, note: '' },
  { cat: 'Clients', src: 'Deva', zarAmount: 19836.39, m: 12, y: 2022, note: '' },
  { cat: 'Clients', src: 'Novus', zarAmount: 5129.19, m: 12, y: 2022, note: '' },
  { cat: 'Clients', src: 'deva', zarAmount: 23057.26, m: 12, y: 2022, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 12187.87, m: 1, y: 2023, note: '' },
  { cat: 'Clients', src: 'novus', zarAmount: 6704.93, m: 1, y: 2023, note: '' },
  { cat: 'Clients', src: 'Deva', zarAmount: 10531.73, m: 1, y: 2023, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 15628.77, m: 2, y: 2023, note: '' },
  { cat: 'Clients', src: 'novus', zarAmount: 6479.83, m: 2, y: 2023, note: '' },
  { cat: 'Clients', src: 'liqd', zarAmount: 24118.47, m: 2, y: 2023, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 16175.45, m: 3, y: 2023, note: '' },
  { cat: 'Clients', src: 'novus', zarAmount: 6688.86, m: 3, y: 2023, note: '' },
  { cat: 'Clients', src: 'liqd', zarAmount: 24118.47, m: 3, y: 2023, note: '' },
  { cat: 'Clients', src: 'iceverse', zarAmount: 11316.61, m: 3, y: 2023, note: '' },
  { cat: 'Clients', src: 'iceverse', zarAmount: 6466.63, m: 3, y: 2023, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 20259.51, m: 4, y: 2023, note: '' },
  { cat: 'Clients', src: 'novus', zarAmount: 7508.88, m: 4, y: 2023, note: '' },
  { cat: 'Clients', src: 'liqd', zarAmount: 24118.47, m: 4, y: 2023, note: '' },
  { cat: 'Clients', src: 'PPA', zarAmount: 17622.56, m: 5, y: 2023, note: '' },
  { cat: 'Clients', src: 'liqd', zarAmount: 24118.47, m: 5, y: 2023, note: '' },
  { cat: 'Clients', src: 'liqd', zarAmount: 24118.47, m: 6, y: 2023, note: '' },
  { cat: 'Clients', src: 'eqlipse', zarAmount: 42081.61, m: 1, y: 2024, note: '(mint out)' },
  { cat: 'Clients', src: 'Cyan', zarAmount: 19399.90, m: 1, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 10508.28, m: 2, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 2, y: 2024, note: '' },
  { cat: 'Angle Rounds', src: 'Portal', zarAmount: 85876.88, m: 2, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 3, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 19399.90, m: 3, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 4, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 19399.90, m: 4, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 5, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 19399.90, m: 5, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 6, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 19399.90, m: 6, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 7, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 19399.90, m: 7, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 8083.29, m: 9, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 8, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 8083.29, m: 10, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 10, y: 2024, note: '' },
  { cat: 'Clients', src: 'bullish sentiment', zarAmount: 29344.14, m: 10, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 8083.29, m: 11, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 11, y: 2024, note: '' },
  { cat: 'Clients', src: 'bullish senti', zarAmount: 102841.16, m: 11, y: 2024, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 8083.29, m: 12, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 12, y: 2024, note: '' },
  { cat: 'Clients', src: 'bullish senti', zarAmount: 61100.12, m: 12, y: 2024, note: '' },
  { cat: 'Airdrops', src: 'Pengu', zarAmount: 20208.23, m: 12, y: 2024, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 9, y: 2024, note: '' },
  { cat: 'Airdrops', src: '$ANIME', zarAmount: 40416.45, m: 1, y: 2025, note: '' },
  { cat: 'Clients', src: 'Canna Sapiens', zarAmount: 21016.55, m: 1, y: 2025, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 8083.29, m: 1, y: 2025, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 2, y: 2025, note: '' },
  { cat: 'Clients', src: 'cyan', zarAmount: 8083.29, m: 2, y: 2025, note: '' },
  { cat: 'Clients', src: 'Canna', zarAmount: 21016.55, m: 3, y: 2025, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 4, y: 2025, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 21016.55, m: 5, y: 2025, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 224246.64, m: 5, y: 2025, note: '(half of mint %)' },
  { cat: 'Clients', src: 'Canna', zarAmount: 40416.45, m: 6, y: 2025, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 40416.45, m: 7, y: 2025, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 40416.45, m: 8, y: 2025, note: '' },
  { cat: 'Clients', src: 'Canna', zarAmount: 40416.45, m: 9, y: 2025, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 40416.45, m: 10, y: 2025, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 40416.45, m: 11, y: 2025, note: '' },
  { cat: 'Clients', src: 'Canna', zarAmount: 40416.45, m: 12, y: 2025, note: '' },
  { cat: 'Clients', src: 'Canna Sapiens', zarAmount: 40416.45, m: 1, y: 2026, note: '' },
  { cat: 'Clients', src: 'canna', zarAmount: 40416.45, m: 2, y: 2026, note: '' },
  { cat: 'Angle Rounds', src: 'MegaETH', zarAmount: 43639.36, m: 4, y: 2026, note: '' },
]

export async function seedImportedData() {
  // Only seed if no entries exist yet
  const count = await db.incomeEntries.count()
  if (count > 0) return

  // Ensure categories exist
  const catNames = ['Clients', 'Angle Rounds', 'Airdrops']
  const catColors: Record<string, string> = {
    Clients: '#00C27C',
    'Angle Rounds': '#9364FF',
    Airdrops: '#FF4D8F',
  }

  let cats = await db.categories.toArray()
  for (const name of catNames) {
    if (!cats.find(c => c.name === name)) {
      await db.categories.add({
        id: crypto.randomUUID(),
        name,
        color: catColors[name],
        createdAt: Date.now(),
      } as Category)
    }
  }
  cats = await db.categories.toArray()
  const catMap = new Map(cats.map(c => [c.name, c.id]))

  const entries: IncomeEntry[] = RAW_DATA.map(row => {
    const rate = HIST_RATE[row.y] || 18.5
    const amountUSD = row.zarAmount / rate
    // Use 15th of the month as the date
    const date = new Date(row.y, row.m - 1, 15).getTime()
    const catId = catMap.get(row.cat) || cats[0]?.id || ''
    return {
      id: crypto.randomUUID(),
      categoryId: catId,
      amount: row.zarAmount,
      currency: 'ZAR',
      amountZAR: row.zarAmount,
      amountUSD,
      date,
      sourceName: row.src,
      note: row.note || undefined,
      createdAt: date,
    }
  })

  await db.incomeEntries.bulkAdd(entries)
  console.log(`Seeded ${entries.length} income entries`)
}
