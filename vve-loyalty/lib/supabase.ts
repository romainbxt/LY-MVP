export type WinBackRule = {
  id: string
  inactiveDays: number
  subject: string
  offer: string
  level: number
}

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
  created_at: string
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
  fields: Partial<Pick<Venue, 'name' | 'logo_url' | 'brand_color' | 'background_color' | 'cashier_password' | 'rewards' | 'stamp_icon' | 'stamp_overrides' | 'reward_on_last_stamp' | 'ask_birthday' | 'win_back_rules'>>
): Promise<boolean> {
  const res = await fetch(`${BASE()}/venues?id=eq.${id}`, {
    method: 'PATCH',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify(fields),
  })
  return res.ok
}

export async function createVenue(
  slug: string,
  name: string,
  logoUrl: string | null,
  brandColor: string,
  backgroundColor: string | null,
  cashierPassword: string,
  rewards: Array<{ stamp: number; label: string }>,
  stampIcon: string,
  stampOverrides: Array<{ stamp: number; icon: string }>,
  rewardOnLastStamp: boolean,
  askBirthday: boolean
): Promise<Venue | null> {
  const res = await fetch(`${BASE()}/venues`, {
    method: 'POST',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ slug, name, logo_url: logoUrl, brand_color: brandColor, background_color: backgroundColor, cashier_password: cashierPassword, rewards, stamp_icon: stampIcon, stamp_overrides: stampOverrides, reward_on_last_stamp: rewardOnLastStamp, ask_birthday: askBirthday }),
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
    `${BASE()}/stamps?venue_id=eq.${venueId}&last_visit_at=lt.${cutoffDate.toISOString()}&winback_level_sent=lt.${winbackLevel}&order=last_visit_at.asc`,
    { headers: supabaseAdminHeaders(), cache: 'no-store' }
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function updateWinBackSent(uniqueId: string, level: number): Promise<boolean> {
  const res = await fetch(`${BASE()}/stamps?unique_id=eq.${uniqueId}`, {
    method: 'PATCH',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ last_winback_sent_at: new Date().toISOString(), winback_level_sent: level }),
  })
  return res.ok
}
