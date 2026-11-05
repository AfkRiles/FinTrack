import type { BankTransaction, SpendingTxType, SpendingTxStatus, FintrackCategory } from '../types'
import { mapCategory, normalizeMerchant } from './categoryMapper'
import { db } from './db'

// ── Fingerprint ──────────────────────────────────────────────────────────────
// Deterministic ID: timestamp + type + normalizedDesc + amount + originalAmount + originalCurrency + card
// Does NOT use status (may change from pending → CLEARED between exports)
function makeFingerprint(row: RawRow): string {
  const parts = [
    row.timestamp.trim(),
    row.type.trim().toLowerCase(),
    row.description.trim().toLowerCase().replace(/\s+/g, ' '),
    row.amount,
    row.originalAmount,
    row.originalCurrency.trim().toUpperCase(),
    row.card.trim(),
  ]
  // Simple deterministic hash
  const str = parts.join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return `etherfi_${Math.abs(hash).toString(36)}_${str.length}`
}

interface RawRow {
  timestamp: string
  type: string
  description: string
  status: string
  amount: string
  currency: string
  card: string
  cardHolder: string
  originalAmount: string
  originalCurrency: string
  cashbackEarned: string
  cashbackCurrency: string
  category: string
  spendingMode: string
}

function parseCSV(text: string): RawRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV appears to be empty or has no data rows.')

  // Parse header
  const headers = parseCSVLine(lines[0])
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, ' '))

  const idx = {
    timestamp: normalizedHeaders.indexOf('timestamp'),
    type: normalizedHeaders.indexOf('type'),
    description: normalizedHeaders.indexOf('description'),
    status: normalizedHeaders.indexOf('status'),
    amount: normalizedHeaders.indexOf('amount'),
    currency: normalizedHeaders.indexOf('currency'),
    card: normalizedHeaders.indexOf('card'),
    cardHolder: normalizedHeaders.indexOf('card holder name'),
    originalAmount: normalizedHeaders.indexOf('original amount'),
    originalCurrency: normalizedHeaders.indexOf('original currency'),
    cashbackEarned: normalizedHeaders.indexOf('cashback earned'),
    cashbackCurrency: normalizedHeaders.indexOf('cashback currency'),
    category: normalizedHeaders.indexOf('category'),
    spendingMode: normalizedHeaders.indexOf('spending mode'),
  }

  if (idx.timestamp === -1 || idx.type === -1 || idx.amount === -1) {
    throw new Error('This doesn\'t look like an Ether.fi statement. Missing required columns (timestamp, type, amount).')
  }

  const rows: RawRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseCSVLine(line)
    const get = (k: keyof typeof idx) => idx[k] >= 0 ? (cols[idx[k]] || '').trim() : ''
    rows.push({
      timestamp: get('timestamp'),
      type: get('type'),
      description: get('description'),
      status: get('status'),
      amount: get('amount'),
      currency: get('currency'),
      card: get('card'),
      cardHolder: get('cardHolder'),
      originalAmount: get('originalAmount'),
      originalCurrency: get('originalCurrency'),
      cashbackEarned: get('cashbackEarned'),
      cashbackCurrency: get('cashbackCurrency'),
      category: get('category'),
      spendingMode: get('spendingMode'),
    })
  }
  return rows
}

// RFC-4180 CSV line parser (handles quoted fields with commas)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

function normalizeType(raw: string): SpendingTxType {
  const t = raw.toLowerCase().trim()
  if (t === 'card_spend') return 'card_spend'
  if (t === 'topup') return 'topup'
  if (t === 'affiliate_reward') return 'affiliate_reward'
  if (t === 'affiliate_payout') return 'affiliate_payout'
  if (t === 'card_refund') return 'card_refund'
  if (t.includes('fee')) return 'fee'
  return 'other'
}

function normalizeStatus(raw: string, type: SpendingTxType): SpendingTxStatus {
  const s = raw.trim().toUpperCase()
  if (s === 'CLEARED') return 'CLEARED'
  if (s === 'DECLINED') return 'DECLINED'
  if (s === 'CANCELLED') return 'CANCELLED'
  if (s === 'PENDING') return 'pending'
  if (s === 'PAID') return 'paid'
  // Blank status: topups and payouts often have no status — use type as signal
  if (!s) {
    if (type === 'topup' || type === 'affiliate_payout') return 'CLEARED'
    if (type === 'affiliate_reward') return 'pending'
    return 'unknown'
  }
  return 'unknown'
}

function getMonthKey(timestamp: string): string {
  // "2026-10-31 23:59:59 UTC" → "2026-10"
  const match = timestamp.match(/^(\d{4}-\d{2})/)
  return match ? match[1] : '1970-01'
}

function toMs(timestamp: string): number {
  // Replace space with T and strip UTC suffix for Date parsing
  return new Date(timestamp.replace(' UTC', 'Z').replace(' ', 'T')).getTime()
}

export interface ParseResult {
  transactions: BankTransaction[]
  monthsDetected: string[]
  totalRows: number
}

export async function parseEtherfiCSV(
  text: string,
  fxRate: number,
): Promise<ParseResult> {
  const rows = parseCSV(text)

  // Load all merchant rules once
  const rules = await db.merchantRules.toArray()
  const ruleMap = new Map<string, FintrackCategory>(rules.map(r => [r.id, r.category]))

  const transactions: BankTransaction[] = []
  const monthsSet = new Set<string>()

  for (const row of rows) {
    const type = normalizeType(row.type)
    const status = normalizeStatus(row.status, type)
    const monthKey = getMonthKey(row.timestamp)
    const id = makeFingerprint(row)

    monthsSet.add(monthKey)

    // ZAR amount: use originalAmount if originalCurrency is ZAR
    const origAmt = row.originalAmount ? parseFloat(row.originalAmount) : null
    const origCur = row.originalCurrency.trim().toUpperCase()
    const usdAmt = parseFloat(row.amount) || 0

    let amountZar: number
    if (origCur === 'ZAR' && origAmt !== null && !isNaN(origAmt)) {
      amountZar = Math.abs(origAmt)
    } else {
      // Convert USD → ZAR using provided rate
      amountZar = Math.abs(usdAmt) * fxRate
    }

    const merchantKey = normalizeMerchant(row.description)
    const fintrackCategory: FintrackCategory = ruleMap.get(merchantKey)
      ?? mapCategory(row.category, row.description)

    transactions.push({
      id,
      source: 'etherfi',
      timestamp: toMs(row.timestamp),
      monthKey,
      type,
      description: row.description.trim(),
      status,
      amountUsd: usdAmt,
      currency: row.currency.trim(),
      originalAmount: origAmt,
      originalCurrency: origCur || null,
      amountZar,
      rawCategory: row.category.trim(),
      fintrackCategory,
      card: row.card.trim(),
      cardHolder: row.cardHolder.trim(),
      cashbackAmount: parseFloat(row.cashbackEarned) || 0,
      cashbackCurrency: row.cashbackCurrency.trim(),
      spendingMode: row.spendingMode.trim(),
      importedAt: Date.now(),
      merchantOverrideApplied: ruleMap.has(merchantKey),
    })
  }

  return {
    transactions,
    monthsDetected: Array.from(monthsSet).sort(),
    totalRows: rows.length,
  }
}

export interface ImportSummary {
  added: number
  updated: number
  skipped: number
  total: number
}

export async function importTransactions(
  transactions: BankTransaction[],
  filename: string,
): Promise<ImportSummary> {
  let added = 0, updated = 0, skipped = 0

  const monthsAffected = new Set<string>()

  for (const tx of transactions) {
    monthsAffected.add(tx.monthKey)
    const existing = await db.bankTransactions.get(tx.id)
    if (!existing) {
      await db.bankTransactions.add(tx)
      added++
    } else {
      // Update mutable fields: status, fintrackCategory (if not user-overridden), cashback
      const needsUpdate = (
        existing.status !== tx.status ||
        existing.cashbackAmount !== tx.cashbackAmount ||
        (!existing.merchantOverrideApplied && existing.fintrackCategory !== tx.fintrackCategory)
      )
      if (needsUpdate) {
        await db.bankTransactions.update(tx.id, {
          status: tx.status,
          cashbackAmount: tx.cashbackAmount,
          ...(!existing.merchantOverrideApplied ? { fintrackCategory: tx.fintrackCategory } : {}),
        })
        updated++
      } else {
        skipped++
      }
    }
  }

  // Record the import
  await db.importRecords.add({
    id: crypto.randomUUID(),
    filename,
    importedAt: Date.now(),
    txCount: transactions.length,
    addedCount: added,
    updatedCount: updated,
    skippedCount: skipped,
    monthsAffected: Array.from(monthsAffected).sort(),
  })

  return { added, updated, skipped, total: transactions.length }
}
