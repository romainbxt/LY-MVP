export type Customer = {
  id: string
  name: string
  email: string
  unique_id: string
  stamp_count: number
  last_visit_at: string | null
}

function supabaseHeaders() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stamps`

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const res = await fetch(`${BASE()}?email=eq.${encodeURIComponent(email)}&limit=1`, {
    headers: supabaseHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  return data[0] ?? null
}

export async function createCustomer(name: string, email: string): Promise<Customer | null> {
  const res = await fetch(BASE(), {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ name, email, stamp_count: 0 }),
  })
  const data = await res.json()
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null)
}

export async function getCustomerByUniqueId(uniqueId: string): Promise<Customer | null> {
  const res = await fetch(`${BASE()}?unique_id=eq.${uniqueId}&limit=1`, {
    headers: supabaseHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  return data[0] ?? null
}

export async function updateStampCount(uniqueId: string, newCount: number): Promise<boolean> {
  const res = await fetch(`${BASE()}?unique_id=eq.${uniqueId}`, {
    method: 'PATCH',
    headers: supabaseHeaders(),
    body: JSON.stringify({ stamp_count: newCount, last_visit_at: new Date().toISOString() }),
  })
  if (res.ok) return true
  // Fallback if last_visit_at column doesn't exist yet
  const res2 = await fetch(`${BASE()}?unique_id=eq.${uniqueId}`, {
    method: 'PATCH',
    headers: supabaseHeaders(),
    body: JSON.stringify({ stamp_count: newCount }),
  })
  return res2.ok
}

export async function deleteCustomer(uniqueId: string): Promise<boolean> {
  const res = await fetch(`${BASE()}?unique_id=eq.${uniqueId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(),
  })
  return res.ok
}

export async function getAllCustomers(): Promise<Customer[]> {
  const res = await fetch(`${BASE()}?order=last_visit_at.desc.nullslast`, {
    headers: supabaseHeaders(),
    cache: 'no-store',
  })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}
