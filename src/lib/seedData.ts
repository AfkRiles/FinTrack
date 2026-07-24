import { db } from './db'
import type { Category, IncomeEntry } from '../types'

// Version 2: switched to direct USD amounts from the spreadsheet
// Increment this whenever the seed data changes substantially
const DATA_VERSION = '2'

// Each row has a direct USD amount from the spreadsheet.
// d = day, m = month (1-12), y = year
const RAW_DATA: Array<{
  cat: string; src: string; usd: number
  d: number; m: number; y: number; note?: string
}> = [
  // ── PPA ───────────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'PPA', usd: 3061, d: 20, m: 1,  y: 2022, note: '(mint)' },
  { cat: 'Clients', src: 'PPA', usd: 1626, d: 15, m: 2,  y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  551, d: 15, m: 3,  y: 2022 },
  { cat: 'Clients', src: 'PPA', usd: 1245, d: 15, m: 4,  y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  841, d: 16, m: 5,  y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  479, d: 14, m: 6,  y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  672, d: 16, m: 7,  y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  752, d: 16, m: 8,  y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  704, d: 12, m: 9,  y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  647, d: 16, m: 10, y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  651, d: 17, m: 11, y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  660, d: 16, m: 12, y: 2022 },
  { cat: 'Clients', src: 'PPA', usd:  758, d: 16, m: 1,  y: 2023 },
  { cat: 'Clients', src: 'PPA', usd:  972, d: 16, m: 2,  y: 2023 },
  { cat: 'Clients', src: 'PPA', usd: 1006, d: 16, m: 3,  y: 2023 },
  { cat: 'Clients', src: 'PPA', usd: 1260, d: 16, m: 4,  y: 2023 },
  { cat: 'Clients', src: 'PPA', usd: 1096, d: 16, m: 5,  y: 2023 },

  // ── Cosmiqs ───────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Cosmiqs', usd: 972, d: 15, m: 3, y: 2022, note: '(mint)' },

  // ── Smiley Electric ───────────────────────────────────────────────────
  { cat: 'Clients', src: 'Smiley Electric', usd:  916, d: 16, m: 3, y: 2022 },
  { cat: 'Clients', src: 'Smiley Electric', usd: 1063, d: 15, m: 4, y: 2022 },

  // ── Nubbies ───────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Nubbies', usd: 1099, d: 6, m: 5, y: 2022 },

  // ── Wlrd Eco ──────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Wlrd Eco', usd: 630, d: 9, m: 5, y: 2022 },

  // ── Elysium MG ────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Elysium MG', usd: 410, d: 18, m: 5, y: 2022 },

  // ── Crazy Gold ────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Crazy Gold', usd: 107, d: 30, m: 6, y: 2022 },

  // ── Misfits (1 ETH, no USD listed — ~$1,800 Aug 2022) ────────────────
  { cat: 'Clients', src: 'Misfits', usd: 1800, d: 8, m: 8, y: 2022, note: '(1 ETH + 5 NFTs)' },

  // ── DSPC (individual entries Aug–Nov 2022) ────────────────────────────
  { cat: 'Clients', src: 'DSPC', usd:  165, d:  3, m:  8, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  167, d: 10, m:  8, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  152, d: 17, m:  8, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd: 1168, d: 18, m:  8, y: 2022, note: 'collab' },
  { cat: 'Clients', src: 'DSPC', usd:  627, d: 24, m:  8, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  570, d: 29, m:  8, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  620, d: 29, m:  8, y: 2022, note: 'collab' },
  { cat: 'Clients', src: 'DSPC', usd: 1316, d:  7, m:  9, y: 2022, note: 'collab' },
  { cat: 'Clients', src: 'DSPC', usd:  595, d:  7, m:  9, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  635, d: 12, m:  9, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd: 1888, d: 21, m:  9, y: 2022, note: 'collab' },
  { cat: 'Clients', src: 'DSPC', usd:  581, d: 21, m:  9, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  605, d: 28, m:  9, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd: 1202, d: 13, m: 10, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  601, d: 18, m: 10, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  666, d: 26, m: 10, y: 2022, note: 'collab' },
  { cat: 'Clients', src: 'DSPC', usd:  616, d: 28, m: 10, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  600, d:  2, m: 11, y: 2022 },
  { cat: 'Clients', src: 'DSPC', usd:  502, d:  8, m: 11, y: 2022 },

  // ── Meighta ───────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Meighta', usd: 405, d: 18, m: 10, y: 2022 },

  // ── Rift Trip ─────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Rift Trip', usd: 250, d: 25, m: 10, y: 2022 },
  { cat: 'Clients', src: 'Rift Trip', usd: 259, d:  2, m: 11, y: 2022 },
  { cat: 'Clients', src: 'Rift Trip', usd: 500, d: 25, m: 11, y: 2022 },

  // ── Limau ─────────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Limau', usd: 800, d: 25, m: 10, y: 2022 },
  { cat: 'Clients', src: 'Limau', usd: 800, d: 26, m: 11, y: 2022 },

  // ── DEVA NFT ──────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'DEVA NFT', usd: 553, d:  1, m: 11, y: 2022 },
  { cat: 'Clients', src: 'DEVA NFT', usd: 425, d: 18, m: 11, y: 2022 },
  { cat: 'Clients', src: 'DEVA NFT', usd: 638, d:  1, m: 12, y: 2022 },
  { cat: 'Clients', src: 'DEVA NFT', usd: 589, d: 18, m: 12, y: 2022 },
  { cat: 'Clients', src: 'DEVA NFT', usd: 417, d:  1, m:  1, y: 2023 },
  { cat: 'Clients', src: 'DEVA NFT', usd: 238, d: 18, m:  1, y: 2023 },

  // ── Novus Labs ────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Novus Labs', usd: 107, d:  8, m: 11, y: 2022 },
  { cat: 'Clients', src: 'Novus Labs', usd: 319, d:  1, m: 12, y: 2022 },
  { cat: 'Clients', src: 'Novus Labs', usd: 417, d:  1, m:  1, y: 2023 },
  { cat: 'Clients', src: 'Novus Labs', usd: 403, d:  1, m:  2, y: 2023 },
  { cat: 'Clients', src: 'Novus Labs', usd: 416, d:  1, m:  3, y: 2023 },
  { cat: 'Clients', src: 'Novus Labs', usd: 467, d: 30, m:  4, y: 2023 },

  // ── NetLabs ───────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'NetLabs', usd:  507, d: 29, m: 11, y: 2022, note: 'via Deva' },
  { cat: 'Clients', src: 'NetLabs', usd: 1434, d:  8, m: 12, y: 2022, note: 'via Deva' },
  { cat: 'Clients', src: 'NetLabs', usd: 1444, d:  3, m:  2, y: 2023, note: 'via Liqd' },
  { cat: 'Clients', src: 'NetLabs', usd: 1487, d:  3, m:  3, y: 2023, note: 'via Liqd' },
  { cat: 'Clients', src: 'NetLabs', usd: 1500, d: 17, m:  4, y: 2023, note: 'via Liqd' },
  { cat: 'Clients', src: 'NetLabs', usd: 1500, d: 30, m:  4, y: 2023 },
  { cat: 'Clients', src: 'NetLabs', usd: 1500, d:  3, m:  6, y: 2023, note: 'via Liqd' },

  // ── Iceverse ──────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Iceverse', usd: 700, d: 14, m: 3, y: 2023 },
  { cat: 'Clients', src: 'Iceverse', usd: 200, d: 21, m: 3, y: 2023 },
  { cat: 'Clients', src: 'Iceverse', usd: 200, d: 29, m: 3, y: 2023 },

  // ── Eqlipse (1.08 ETH, no USD listed — ~$2,350 Jan 2024) ─────────────
  { cat: 'Clients', src: 'Eqlipse', usd: 2350, d: 10, m: 1, y: 2024, note: '(mint out)' },

  // ── Cyan ──────────────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Cyan', usd: 1200, d: 29, m:  1, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd: 1200, d:  3, m:  3, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd: 1200, d:  1, m:  4, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd: 1200, d:  4, m:  5, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd: 1200, d:  1, m:  6, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd: 1200, d: 29, m:  7, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd:  500, d: 29, m:  9, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd:  500, d: 29, m: 10, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd:  500, d: 28, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd:  500, d: 31, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Cyan', usd:  500, d: 31, m:  1, y: 2025 },
  { cat: 'Clients', src: 'Cyan', usd:  500, d: 28, m:  2, y: 2025 },

  // ── Bullish Sentiment ─────────────────────────────────────────────────
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  250, d:  1, m: 10, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  360, d: 10, m: 10, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  435, d: 29, m: 10, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  460, d:  5, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  465, d:  7, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  550, d: 15, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  708, d: 15, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd: 2000, d: 18, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  613, d: 18, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  600, d: 18, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  500, d: 22, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  500, d: 29, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  800, d:  7, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  450, d:  8, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  300, d:  9, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  450, d: 13, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  300, d: 17, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  450, d: 17, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  150, d: 21, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  450, d: 23, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Bullish Sentiment', usd:  450, d: 28, m: 12, y: 2024 },

  // ── Canna Sapiens ─────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Canna Sapiens', usd:   650, d: 21, m:  2, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 16, m:  3, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 15, m:  4, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 14, m:  5, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 15, m:  6, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 15, m:  7, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 29, m:  8, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d:  5, m:  9, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 18, m: 10, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 20, m: 11, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 16, m: 12, y: 2024 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 16, m:  1, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 15, m:  2, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 15, m:  3, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 15, m:  4, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  1300, d: 15, m:  5, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd: 13871, d: 26, m:  5, y: 2025, note: '(R250,000 — mint %)' },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  2500, d: 18, m:  6, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  2500, d: 20, m:  7, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  2500, d: 20, m:  8, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  2500, d: 20, m:  9, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  2500, d: 20, m: 10, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  2500, d: 20, m: 11, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  2500, d: 20, m: 12, y: 2025 },
  { cat: 'Clients', src: 'Canna Sapiens', usd:  2500, d: 20, m:  1, y: 2026 },

  // ── Stratosphere ──────────────────────────────────────────────────────
  { cat: 'Clients', src: 'Stratosphere', usd: 1066, d: 16, m: 6, y: 2026 },

  // ── Airdrops ──────────────────────────────────────────────────────────
  { cat: 'Airdrops', src: 'Pengu',  usd: 1069, d: 15, m: 12, y: 2024 },
  { cat: 'Airdrops', src: '$ANIME', usd: 2209, d: 15, m:  1, y: 2025 },

  // ── Angle Rounds ──────────────────────────────────────────────────────
  { cat: 'Angle Rounds', src: 'Portal',   usd: 4545, d: 15, m: 2, y: 2024 },
  { cat: 'Angle Rounds', src: 'MegaETH',  usd: 2384, d: 15, m: 4, y: 2026 },
]

async function doSeed(fxRate = 18.3) {
  // Ensure categories exist
  const catNames = ['Clients', 'Angle Rounds', 'Airdrops']
  let cats = await db.categories.toArray()
  for (const name of catNames) {
    if (!cats.find(c => c.name === name)) {
      await db.categories.add({
        id: crypto.randomUUID(),
        name,
        color: name === 'Clients' ? '#D97706' : name === 'Angle Rounds' ? '#4F46E5' : '#3B82F6',
        createdAt: Date.now(),
      } as Category)
    }
  }
  cats = await db.categories.toArray()
  const catMap = new Map(cats.map(c => [c.name, c.id]))

  const entries: IncomeEntry[] = RAW_DATA.map(row => {
    const amountUSD = row.usd
    // Clamp day to valid range for the month
    const daysInMonth = new Date(row.y, row.m, 0).getDate()
    const safeDay = Math.min(row.d, daysInMonth)
    const date = new Date(row.y, row.m - 1, safeDay).getTime()
    const catId = catMap.get(row.cat) || cats[0]?.id || ''
    return {
      id: crypto.randomUUID(),
      categoryId: catId,
      amount: amountUSD,      // stored as USD amount
      currency: 'USD',
      amountZAR: amountUSD * fxRate,
      amountUSD,
      date,
      sourceName: row.src,
      note: row.note,
      createdAt: date,
    }
  })

  await db.incomeEntries.bulkAdd(entries)
  console.log(`[FinTrack] Seeded ${entries.length} income entries (data v${DATA_VERSION})`)
}

export async function seedImportedData() {
  const storedVersion = typeof localStorage !== 'undefined'
    ? localStorage.getItem('fintrack_data_v')
    : null
  const count = await db.incomeEntries.count()

  if (count === 0) {
    // Fresh install — seed directly
    await doSeed()
    localStorage?.setItem('fintrack_data_v', DATA_VERSION)
    return
  }

  if (storedVersion === DATA_VERSION) {
    return // Already at current version, nothing to do
  }

  // Upgrade: clear seeded data and re-seed with correct USD amounts
  console.log(`[FinTrack] Upgrading data from v${storedVersion ?? '1'} → v${DATA_VERSION}`)
  await db.incomeEntries.clear()
  await doSeed()
  localStorage?.setItem('fintrack_data_v', DATA_VERSION)
}
