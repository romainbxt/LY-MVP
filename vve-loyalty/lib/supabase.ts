export type Venue = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  brand_color: string
  cashier_password: string
  rewards: Array<{ stamp: number; label: string }>
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

export async function createVenue(
  slug: string,
  name: string,
  logoUrl: string | null,
  brandColor: string,
  cashierPassword: string,
  rewards: Array<{ stamp: number; label: string }>
): Promise<Venue | null> {
  const res = await fetch(`${BASE()}/venues`, {
    method: 'POST',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ slug, name, logo_url: logoUrl, brand_color: brandColor, cashier_password: cashierPassword, rewards }),
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

export async function createCustomer(name: string, email: string, venueId: string): Promise<Customer | null> {
  const res = await fetch(`${BASE()}/stamps`, {
    method: 'POST',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ name, email, stamp_count: 0, venue_id: venueId }),
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
    body: JSON.stringify({ stamp_count: newCount, last_visit_at: new Date().toISOString() }),
  })
  if (res.ok) return true
  const res2 = await fetch(`${BASE()}/stamps?unique_id=eq.${uniqueId}`, {
    method: 'PATCH',
    headers: supabaseAdminHeaders(),
    body: JSON.stringify({ stamp_count: newCount }),
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
