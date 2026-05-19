'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createVenue, updateVenue } from '@/lib/supabase'

function parseRewards(raw: string): Array<{ stamp: number; label: string }> | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed) } catch { return null }
  }
  const parsed = trimmed
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [stampPart, ...labelParts] = line.split('=')
      const stamp = parseInt(stampPart.trim(), 10)
      const label = labelParts.join('=').trim()
      return { stamp, label }
    })
    .filter(r => !isNaN(r.stamp) && r.label)
  return parsed.length > 0 ? parsed : null
}

export type AdminLoginState = { error?: string } | null

export async function adminLogin(
  prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const password = formData.get('password') as string

  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Incorrect password.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('is_admin', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/admin')
}

export type CreateVenueState = { error?: string; success?: boolean } | null

export async function createVenueAction(
  prevState: CreateVenueState,
  formData: FormData
): Promise<CreateVenueState> {
  const slug = (formData.get('slug') as string)?.trim().toLowerCase().replace(/\s+/g, '-')
  const name = (formData.get('name') as string)?.trim()
  const logoUrl = (formData.get('logo_url') as string)?.trim() || null
  const brandColor = (formData.get('brand_color') as string)?.trim() || '#D97706'
  const cashierPassword = (formData.get('cashier_password') as string)?.trim()
  const rewardsRaw = (formData.get('rewards') as string)?.trim()

  if (!slug || !name || !cashierPassword) {
    return { error: 'Slug, name, and cashier password are required.' }
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'Slug can only contain lowercase letters, numbers, and hyphens.' }
  }

  const rewards = parseRewards(rewardsRaw ?? '') ?? [
    { stamp: 3, label: 'Free Cookie 🍪' },
    { stamp: 6, label: 'Free Drink ☕' },
    { stamp: 10, label: 'Free Meal 🍽️' },
  ]

  const venue = await createVenue(slug, name, logoUrl, brandColor, cashierPassword, rewards)
  if (!venue) return { error: 'Failed to create venue. Slug may already be taken.' }

  redirect(`/admin`)
}

export type UpdateVenueState = { error?: string; success?: boolean } | null

export async function updateVenueAction(
  venueId: string,
  prevState: UpdateVenueState,
  formData: FormData
): Promise<UpdateVenueState> {
  const name = (formData.get('name') as string)?.trim()
  const logoUrl = (formData.get('logo_url') as string)?.trim() || null
  const brandColor = (formData.get('brand_color') as string)?.trim() || '#D97706'
  const cashierPassword = (formData.get('cashier_password') as string)?.trim() || undefined
  const rewardsRaw = (formData.get('rewards') as string)?.trim()

  const fields: Parameters<typeof updateVenue>[1] = {}
  if (name) fields.name = name
  if (logoUrl !== undefined) fields.logo_url = logoUrl
  if (brandColor) fields.brand_color = brandColor
  if (cashierPassword) fields.cashier_password = cashierPassword

  if (rewardsRaw) {
    const rewards = parseRewards(rewardsRaw)
    if (!rewards) return { error: 'Invalid rewards format. Use "5 = Free Coffee ☕" per line.' }
    fields.rewards = rewards
  }

  const ok = await updateVenue(venueId, fields)
  if (!ok) return { error: 'Failed to update venue.' }

  redirect('/admin')
}
