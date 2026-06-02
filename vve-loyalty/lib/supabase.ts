export type WinBackRule = {
  id: string
  inactiveDays: number
  subject: string
  offer: string
  level: number
  offerExpiryDays?: number
}

export const WINBACK_MIN_INACTIVE_DAYS = 7
export const WINBACK_MAX_RULES = 3

export type Venue = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  brand_color: string
  background_color: string | null
  cashier_password: string
  rewards: Array<{ stamp: number; label: string }>
  stamp_icon: string | null
  stamp_overrides: Array<{ stamp: number; icon: string }> | null
  reward_on_last_stamp: boolean | null
  ask_birthday: boolean | null
  win_back_rules: WinBackRule[] | null
  legal_name: string | null
  address_street: string | null
  address_postcode: string | null
  address_city: string | null
  register_court: string | null
  register_number: string | null
  owner_email: string | null
  closed_weekdays: number[] | null
  daily_recap_enabled: boolean | null
  created_at: string
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export function isVenueClosedOnWeekday(venue: Pick<Venue, 'closed_weekdays'>, weekday: number): boolean {
  return Array.isArray(venue.closed_weekdays) && venue.closed_weekdays.includes(weekday)
}

export type Customer = {
  id: string
  name: string
  email: string
  unique_id: string
  stamp_count: number
  last_visit_at: string | null
  venue_id: string | null
  birthday: string | null
  last_winback_sent_at: string | null
  winback_level_sent: number
  unsubscribed_marketing_at: string | null
  unsubscribed_transactional_at: string | null
}

export type SubscriptionPreference = 'all' | 'transactional_only' | 'none'

export function preferenceFromCustomer(c: Pick<Customer, 'unsubscribed_marketing_at' | 'unsubscribed_transactional_at'>): SubscriptionPreference {
  if (c.unsubscribed_transactional_at) return 'none'
  if (c.unsubscribed_marketing_at) return 'transactional_only'
  return 'all'
}

function supabaseAdminHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`

export async function uploadLogo(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/logos/${filename}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': file.type || 'image/png',
      },
      body: Buffer.from(await file.arrayBuffer()),
    }
  )
  if (!res.ok) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${filename}`
}

// ── Venue functions ────────────────────────────────────────────────────────────

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const res = await fetch(`${BASE()}/venues?slug=eq.${encodeURIComponent(slug)}&limit=1`, {
    headers: supabaseAdminHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  return data[0] ?? null
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const res = await fetch(`${BASE()}/venues?id=eq.${id}&limit=1`, {
    headers: supabaseAdminHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  return data[0] ?? null
}

export async function getAllVenues(): Promise<Venue[]> {
  const res = await fetch(`${BASE()}/venues?order=created_at.asc`, {
    headers: supabaseAdminHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function updateVenue(
  id: string,
  fields: Partial<Pick<Venue, 'name' | 'logo_url' | 'brand_color' | 'background_color' | 'cashier_password' | 'rewards' | 'stamp_icon' | 'stamp_overrides' | 'reward_on_last_stamp' | 'ask_birthday' | 'win_back_rules' | 'legal_name' | 'address_street' | 'address_postcode' | 'address_city' | 'register_court' | 'register_number' | 'owner_email' | 'closed_weekdays' | 'daily_recap_enabled'>>
): Promise<boolean> {
  const res = await fetch(`${BASE()}/venues?id=eq.${id}`, {
    method: 'PATCH',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify(fields),
  })
  return res.ok
}

export async function createVenue(input: {
  slug: string
  name: string
  logoUrl: string | null
  brandColor: string
  backgroundColor: string | null
  cashierPassword: string
  rewards: Array<{ stamp: number; label: string }>
  stampIcon: string
  stampOverrides: Array<{ stamp: number; icon: string }>
  rewardOnLastStamp: boolean
  askBirthday: boolean
  legalName?: string | null
  addressStreet?: string | null
  addressPostcode?: string | null
  addressCity?: string | null
  registerCourt?: string | null
  registerNumber?: string | null
  ownerEmail?: string | null
  closedWeekdays?: number[]
  dailyRecapEnabled?: boolean
}): Promise<Venue | null> {
  const res = await fetch(`${BASE()}/venues`, {
    method: 'POST',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({
      slug: input.slug,
      name: input.name,
      logo_url: input.logoUrl,
      brand_color: input.brandColor,
      background_color: input.backgroundColor,
      cashier_password: input.cashierPassword,
      rewards: input.rewards,
      stamp_icon: input.stampIcon,
      stamp_overrides: input.stampOverrides,
      reward_on_last_stamp: input.rewardOnLastStamp,
      ask_birthday: input.askBirthday,
      legal_name: input.legalName ?? null,
      address_street: input.addressStreet ?? null,
      address_postcode: input.addressPostcode ?? null,
      address_city: input.addressCity ?? null,
      register_court: input.registerCourt ?? null,
      register_number: input.registerNumber ?? null,
      owner_email: input.ownerEmail ?? null,
      closed_weekdays: input.closedWeekdays ?? [],
      daily_recap_enabled: input.dailyRecapEnabled ?? false,
    }),
  })
  const data = await res.json()
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null)
}

// ── Customer functions (venue-scoped) ─────────────────────────────────────────

export async function getCustomerByEmail(email: string, venueId: string): Promise<Customer | null> {
  const res = await fetch(
    `${BASE()}/stamps?email=eq.${encodeURIComponent(email)}&venue_id=eq.${venueId}&limit=1`,
    { headers: supabaseAdminHeaders(), cache: 'no-store' }
  )
  const data = await res.json()
  return data[0] ?? null
}

export async function createCustomer(name: string, email: string, venueId: string, birthday?: string | null): Promise<Customer | null> {
  const res = await fetch(`${BASE()}/stamps`, {
    method: 'POST',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ name, email, stamp_count: 0, venue_id: venueId, ...(birthday ? { birthday } : {}) }),
  })
  const data = await res.json()
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null)
}

export async function getCustomerByUniqueId(uniqueId: string): Promise<Customer | null> {
  const res = await fetch(`${BASE()}/stamps?unique_id=eq.${uniqueId}&limit=1`, {
    headers: supabaseAdminHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  return data[0] ?? null
}

export async function updateStampCount(uniqueId: string, newCount: number): Promise<boolean> {
  const res = await fetch(`${BASE()}/stamps?unique_id=eq.${uniqueId}`, {
    method: 'PATCH',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ stamp_count: newCount, last_visit_at: new Date().toISOString(), last_winback_sent_at: null, winback_level_sent: 0 }),
  })
  if (res.ok) return true
  const res2 = await fetch(`${BASE()}/stamps?unique_id=eq.${uniqueId}`, {
    method: 'PATCH',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ stamp_count: newCount, last_winback_sent_at: null, winback_level_sent: 0 }),
  })
  return res2.ok
}

export async function deleteCustomer(uniqueId: string): Promise<boolean> {
  const res = await fetch(`${BASE()}/stamps?unique_id=eq.${uniqueId}`, {
    method: 'DELETE',
    headers: supabaseAdminHeaders(),
  })
  return res.ok
}

export async function getAllCustomers(venueId: string): Promise<Customer[]> {
  const res = await fetch(
    `${BASE()}/stamps?venue_id=eq.${venueId}&order=last_visit_at.desc.nullslast`,
    { headers: supabaseAdminHeaders(), cache: 'no-store' }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// ── Win-Back Engine ──────────────────────────────────────────────────────────

export async function getCustomersForWinBack(venueId: string, inactiveDays: number, winbackLevel: number): Promise<Customer[]> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays)

  const res = await fetch(
    `${BASE()}/stamps?venue_id=eq.${venueId}&last_visit_at=lt.${cutoffDate.toISOString()}&winback_level_sent=lt.${winbackLevel}&unsubscribed_marketing_at=is.null&order=last_visit_at.asc`,
    { headers: supabaseAdminHeaders(), cache: 'no-store' }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// ── Subscription preferences ──────────────────────────────────────────────────

export async function updateSubscriptionPreference(
  uniqueId: string,
  preference: SubscriptionPreference
): Promise<boolean> {
  const now = new Date().toISOString()
  const fields =
    preference === 'all'
      ? { unsubscribed_marketing_at: null, unsubscribed_transactional_at: null }
      : preference === 'transactional_only'
        ? { unsubscribed_marketing_at: now, unsubscribed_transactional_at: null }
        : { unsubscribed_marketing_at: now, unsubscribed_transactional_at: now }

  const res = await fetch(`${BASE()}/stamps?unique_id=eq.${uniqueId}`, {
    method: 'PATCH',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify(fields),
  })
  return res.ok
}

export async function updateWinBackSent(uniqueId: string, level: number): Promise<boolean> {
  const res = await fetch(`${BASE()}/stamps?unique_id=eq.${uniqueId}`, {
    method: 'PATCH',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ last_winback_sent_at: new Date().toISOString(), winback_level_sent: level }),
  })
  return res.ok
}

export async function clampWinBackLevels(venueId: string, maxLevel: number): Promise<boolean> {
  const res = await fetch(
    `${BASE()}/stamps?venue_id=eq.${venueId}&winback_level_sent=gt.${maxLevel}`,
    {
      method: 'PATCH',
      headers: supabaseAdminHeaders(),
      body: JSON.stringify({ winback_level_sent: maxLevel }),
    }
  )
  return res.ok
}

// ── Daily recap aggregation queries ───────────────────────────────────────────

export async function getNewSignupsBetween(venueId: string, startIso: string, endIso: string): Promise<Customer[]> {
  const res = await fetch(
    `${BASE()}/stamps?venue_id=eq.${venueId}&created_at=gte.${startIso}&created_at=lt.${endIso}&order=created_at.asc`,
    { headers: supabaseAdminHeaders(), cache: 'no-store' }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getCustomersVisitedBetween(venueId: string, startIso: string, endIso: string): Promise<Customer[]> {
  const res = await fetch(
    `${BASE()}/stamps?venue_id=eq.${venueId}&last_visit_at=gte.${startIso}&last_visit_at=lt.${endIso}&order=last_visit_at.asc`,
    { headers: supabaseAdminHeaders(), cache: 'no-store' }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getWinBackSentBetween(venueId: string, startIso: string, endIso: string): Promise<Customer[]> {
  const res = await fetch(
    `${BASE()}/stamps?venue_id=eq.${venueId}&last_winback_sent_at=gte.${startIso}&last_winback_sent_at=lt.${endIso}&order=last_winback_sent_at.asc`,
    { headers: supabaseAdminHeaders(), cache: 'no-store' }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
