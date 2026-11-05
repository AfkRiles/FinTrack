import type { FintrackCategory } from '../types'

// Maps raw Ether.fi MCC category strings → FinTrack categories
const RAW_CATEGORY_MAP: Record<string, FintrackCategory> = {
  // Food & Dining
  'eating places and restaurants': 'Food & Dining',
  'quick payment service-fast food restaurants': 'Food & Dining',
  'drinking places': 'Food & Dining',
  'bakeries': 'Food & Dining',
  'miscellaneous food stores-convenience stores and specialty markets': 'Food & Dining',
  'freezer & locker meat provisions': 'Food & Dining',
  'dairy products stores': 'Food & Dining',
  'candy, nut, and confectionery stores': 'Food & Dining',
  'caterers': 'Food & Dining',

  // Groceries (sub Food & Dining)
  'grocery stores and supermarkets': 'Food & Dining',
  'package stores--beer, wine, and liquor': 'Food & Dining',

  // Transport
  'service stations (with or without ancillary services)': 'Transport',
  'service stations': 'Transport',
  'parking lots and garages': 'Transport',
  'car washes': 'Transport',
  'automotive parts and supplies stores': 'Transport',
  'motor vehicle supplies and new parts': 'Transport',
  'taxicabs and limousines': 'Transport',
  'passenger railways': 'Transport',
  'bus lines': 'Transport',
  'tolls and bridge fees': 'Transport',

  // Shopping
  "men's and women's clothing stores": 'Shopping',
  'family clothing stores': 'Shopping',
  "women's ready-to-wear stores": 'Shopping',
  "women's accessory and specialty stores": 'Shopping',
  'miscellaneous general merchandise': 'Shopping',
  'miscellaneous home furnishing specialty stores': 'Shopping',
  'hardware stores, equipment utilities regulated': 'Shopping',
  'hardware stores': 'Shopping',
  'gift, card, novelty, and souvenir stores': 'Shopping',
  'florists': 'Shopping',
  'pet shops, pet food, and supplies': 'Shopping',
  'sporting goods stores': 'Shopping',
  'variety stores': 'Shopping',
  'music stores-musical instruments, pianos, and sheet music': 'Shopping',
  'jewelry, watch, clock, and silverware stores': 'Shopping',
  'book stores': 'Shopping',
  'stationery, office, and school supply stores': 'Shopping',
  'toy, game, and hobby shops': 'Shopping',
  'bicycle shops': 'Shopping',
  'opticians, optical goods, and eyeglasses': 'Shopping',
  'furriers and fur shops': 'Shopping',
  'luggage and leather goods stores': 'Shopping',
  'sewing, needlework, fabric, and piece goods stores': 'Shopping',
  'floor covering stores': 'Shopping',
  'drapery, window covering and upholstery stores': 'Shopping',
  'furniture, home furnishings, and equipment stores': 'Shopping',
  'appliance stores': 'Shopping',
  'electronics stores': 'Shopping',

  // Entertainment
  'motion picture theater': 'Entertainment',
  'theatrical producers and ticket agencies': 'Entertainment',
  'amusement parks, carnivals, circuses and fortune tellers': 'Entertainment',
  'bands, orchestras, and miscellaneous entertainers': 'Entertainment',
  'billiard and pool establishments': 'Entertainment',
  'bowling alleys': 'Entertainment',
  'video amusement game supplies': 'Entertainment',

  // Health & Personal Care
  'drug stores and pharmacies': 'Health & Personal Care',
  'beauty and barber shops': 'Health & Personal Care',
  'barber shops': 'Health & Personal Care',
  'hair salons': 'Health & Personal Care',
  'inferno hair studio': 'Health & Personal Care',
  'health practitioners': 'Health & Personal Care',
  'dentists and orthodontists': 'Health & Personal Care',
  'optometrists': 'Health & Personal Care',
  'chiropractors': 'Health & Personal Care',
  'hospitals': 'Health & Personal Care',
  'medical laboratories': 'Health & Personal Care',
  'nursing and personal care': 'Health & Personal Care',

  // Fitness & Sport
  'membership clubs (sports, recreation, athletic), country clubs, and private golf courses': 'Fitness & Sport',
  'commercial sports, professional sports clubs, athletic fields, and sports promoters': 'Fitness & Sport',
  'sporting goods': 'Fitness & Sport',
  'gyms': 'Fitness & Sport',

  // Travel
  'lodging': 'Travel',
  'hotels and motels': 'Travel',
  'trailer parks and campgrounds': 'Travel',
  'travel agencies': 'Travel',
  'airlines': 'Travel',
  'car rental agencies': 'Travel',

  // Subscriptions & Digital
  'computers, computer peripheral equipment, and software': 'Subscriptions & Digital',
  'computer programming, data processing': 'Subscriptions & Digital',
  'information retrieval services': 'Subscriptions & Digital',
  'direct marketing': 'Subscriptions & Digital',

  // Bills & Services
  'government services': 'Bills & Services',
  'professional services': 'Bills & Services',
  'miscellaneous personal services': 'Bills & Services',
  'charitable and social service organizations': 'Bills & Services',
  'membership organizations (not elsewhere classified)': 'Bills & Services',
  'funeral services and crematories': 'Bills & Services',
  'laundry, cleaning, and garment services': 'Bills & Services',
  'photographic studios': 'Bills & Services',
  'advertising services': 'Bills & Services',
  'consulting, management, and public relations services': 'Bills & Services',
  'accounting, auditing, and bookkeeping services': 'Bills & Services',
  'attorneys, legal services': 'Bills & Services',
  'architectural, engineering, and surveying services': 'Bills & Services',
  'insurance sales, underwriting, and premiums': 'Bills & Services',

  // Fees
  'financial institutions': 'Fees',
  'money transfer': 'Fees',
  'wire transfer': 'Fees',
}

// Normalize a raw category string for lookup
function normalizeRaw(raw: string): string {
  return raw.toLowerCase()
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[0-9]+ - /, '') // strip MCC codes like "5812 - Eating Places..."
    .trim()
}

export function mapCategory(rawCategory: string, description: string): FintrackCategory {
  if (!rawCategory && !description) return 'Uncategorized'

  const normalized = normalizeRaw(rawCategory || '')

  // Direct lookup
  if (normalized && RAW_CATEGORY_MAP[normalized]) {
    return RAW_CATEGORY_MAP[normalized]
  }

  // Partial match — check if any key is a substring of the normalized value
  for (const [key, cat] of Object.entries(RAW_CATEGORY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return cat
    }
  }

  // Description-based fallbacks
  const desc = description.toLowerCase()
  if (desc.includes('payfast') || desc.includes('admyt') || desc.includes('netflix') || desc.includes('spotify')) return 'Subscriptions & Digital'
  if (desc.includes('shell') || desc.includes('engen') || desc.includes('bp ') || desc.includes('service station')) return 'Transport'
  if (desc.includes('parking') || desc.includes('str parking')) return 'Transport'
  if (desc.includes('clicks') || desc.includes('pharmacy')) return 'Health & Personal Care'
  if (desc.includes('woolworths') || desc.includes('spar') || desc.includes('pick') || desc.includes('checkers')) return 'Food & Dining'
  if (desc.includes('playtomic') || desc.includes('padel') || desc.includes('gym') || desc.includes('sport')) return 'Fitness & Sport'
  if (desc.includes('h&m') || desc.includes('zara') || desc.includes('cotton on')) return 'Shopping'

  return rawCategory ? 'Other' : 'Uncategorized'
}

// Normalize merchant name for rule matching (stable key)
export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/yoco\s*\*/g, '')
    .replace(/istore|ik \*/g, '')
    .replace(/\b(pty|ltd|sa|cc|inc)\b/g, '')
    .replace(/\d{5,}/g, '') // strip long numeric identifiers
    .trim()
    .slice(0, 40)
}
