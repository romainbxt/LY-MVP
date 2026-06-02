'use server'

import {
  getVenueBySlug,
  getVenueById,
  getCustomerByEmail,
  createCustomer,
  getCustomerByUniqueId,
  updateStampCount,
  deleteCustomer,
  redeemVoucher,
} from '@/lib/supabase'
import { sendStampCardEmail, sendReengagementEmail, legalFromVenue } from '@/lib/email'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

// ── Register ──────────────────────────────────────────────────────────────────

export type RegisterState = { success?: boolean; name?: string; error?: string } | null

export async function registerCustomer(
  slug: string,
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!name || !email) return { error: 'Name and email are required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email.' }

  const venue = await getVenueBySlug(slug)
  if (!venue) return { error: 'Venue not found.' }

  const existing = await getCustomerByEmail(email, venue.id)
  if (existing) return { error: 'Email already registered — check your inbox for your stamp card!' }

  const birthday = (formData.get('birthday') as string)?.trim() || null
  const customer = await createCustomer(name, email, venue.id, birthday)
  if (!customer) return { error: 'Registration failed. Please try again.' }

  const baseUrl = await getBaseUrl()
  const scanUrl = `${baseUrl}/scan/${customer.unique_id}`

  const totalStamps = venue.rewards[venue.rewards.length - 1]?.stamp ?? 10

  try {
    await sendStampCardEmail({
      name,
      email,
      stampCount: 0,
      scanUrl,
      logoUrl: venue.logo_url ?? `${baseUrl}/vve-logo.png`,
      venueName: venue.name,
      brandColor: venue.brand_color,
      backgroundColor: venue.background_color ?? `${venue.brand_color}18`,
      totalStamps,
      rewards: venue.rewards,
      stampIcon: venue.stamp_icon ?? '☕',
      stampOverrides: venue.stamp_overrides ?? [],
      legal: legalFromVenue(venue, venue.name),
      ownerEmail: venue.owner_email,
      baseUrl,
      uniqueId: customer.unique_id,
    })
  } catch (e) {
    console.error('Email send failed:', e)
  }

  return { success: true, name }
}

// ── Stamp ─────────────────────────────────────────────────────────────────────

export type StampState = {
  success?: boolean
  name?: string
  newCount?: number
  reward?: string
  totalStamps?: number
  error?: string
} | null

export async function stampCustomer(
  uniqueId: string,
  prevState: StampState,
  formData: FormData
): Promise<StampState> {
  const customer = await getCustomerByUniqueId(uniqueId)
  if (!customer) return { error: 'Customer not found.' }

  const venue = customer.venue_id ? await getVenueById(customer.venue_id) : null
  const rewards = venue?.rewards ?? [{ stamp: 10, label: 'Reward 🎁' }]
  const totalStamps = rewards[rewards.length - 1]?.stamp ?? 10

  if (customer.stamp_count >= totalStamps) {
    return { error: 'Stamp card already complete — should have auto-reset.' }
  }

  const newCount = customer.stamp_count + 1
  const rewardOnLastStamp = venue?.reward_on_last_stamp ?? true
  const cardComplete = newCount >= totalStamps
  const savedCount = cardComplete && rewardOnLastStamp ? 0 : newCount
  const ok = await updateStampCount(uniqueId, savedCount)
  if (!ok) return { error: 'Failed to add stamp. Try again.' }

  const reward = rewards.find(r => r.stamp === newCount)?.label
  const baseUrl = await getBaseUrl()
  const scanUrl = `${baseUrl}/scan/${uniqueId}`

  if (!customer.unsubscribed_transactional_at) {
    try {
      await sendStampCardEmail({
        name: customer.name,
        email: customer.email,
        stampCount: newCount,
        scanUrl,
        logoUrl: venue?.logo_url ?? `${baseUrl}/vve-logo.png`,
        venueName: venue?.name ?? 'Loyalty',
        brandColor: venue?.brand_color ?? '#D97706',
        backgroundColor: venue?.background_color ?? `${venue?.brand_color ?? '#D97706'}18`,
        totalStamps,
        rewards,
        stampIcon: venue?.stamp_icon ?? '☕',
        stampOverrides: venue?.stamp_overrides ?? [],
        legal: legalFromVenue(venue, venue?.name ?? 'Loyalty'),
        ownerEmail: venue?.owner_email,
        baseUrl,
        uniqueId,
      })
    } catch (e) {
      console.error('Email send failed:', e)
    }
  }

  return { success: true, name: customer.name, newCount, reward, totalStamps }
}

// ── Delete Customer ───────────────────────────────────────────────────────────

export type DeleteState = { success?: boolean; error?: string } | null

export async function deleteCustomerAction(
  uniqueId: string,
  prevState: DeleteState,
  formData: FormData
): Promise<DeleteState> {
  const customer = await getCustomerByUniqueId(uniqueId)
  const venue = customer?.venue_id ? await getVenueById(customer.venue_id) : null

  const ok = await deleteCustomer(uniqueId)
  if (!ok) return { error: 'Failed to delete.' }

  if (venue) revalidatePath(`/cashier/${venue.slug}`)
  return { success: true }
}

// ── Redeem & Reset ────────────────────────────────────────────────────────────

export type RedeemState = { success?: boolean; name?: string; error?: string } | null

export async function redeemAndReset(
  uniqueId: string,
  prevState: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  const customer = await getCustomerByUniqueId(uniqueId)
  if (!customer) return { error: 'Customer not found.' }

  const venue = customer.venue_id ? await getVenueById(customer.venue_id) : null
  const ok = await updateStampCount(uniqueId, 0)
  if (!ok) return { error: 'Failed to reset card.' }

  const baseUrl = await getBaseUrl()
  const scanUrl = `${baseUrl}/scan/${uniqueId}`
  const rewards = venue?.rewards ?? [{ stamp: 10, label: 'Reward 🎁' }]
  const totalStamps = rewards[rewards.length - 1]?.stamp ?? 10

  if (!customer.unsubscribed_transactional_at) {
    try {
      await sendStampCardEmail({
        name: customer.name,
        email: customer.email,
        stampCount: 0,
        scanUrl,
        logoUrl: venue?.logo_url ?? `${baseUrl}/vve-logo.png`,
        venueName: venue?.name ?? 'Loyalty',
        brandColor: venue?.brand_color ?? '#D97706',
        backgroundColor: venue?.background_color ?? `${venue?.brand_color ?? '#D97706'}18`,
        totalStamps,
        rewards,
        legal: legalFromVenue(venue, venue?.name ?? 'Loyalty'),
        ownerEmail: venue?.owner_email,
        baseUrl,
        uniqueId,
      })
    } catch (e) {
      console.error('Email send failed:', e)
    }
  }

  return { success: true, name: customer.name }
}

// ── Re-engagement ─────────────────────────────────────────────────────────────

export type ReengageState = { success?: boolean; error?: string } | null

export async function reengageCustomer(
  uniqueId: string,
  prevState: ReengageState,
  formData: FormData
): Promise<ReengageState> {
  const customer = await getCustomerByUniqueId(uniqueId)
  if (!customer) return { error: 'Customer not found.' }

  if (customer.unsubscribed_marketing_at) {
    return { error: 'Customer has unsubscribed from marketing emails.' }
  }

  const venue = customer.venue_id ? await getVenueById(customer.venue_id) : null

  const baseUrl = await getBaseUrl()
  const scanUrl = `${baseUrl}/scan/${uniqueId}`

  const daysSince = customer.last_visit_at
    ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / 86_400_000)
    : undefined

  const offer = (formData.get('offer') as string)?.trim() || undefined

  const reengageRewards = venue?.rewards ?? [{ stamp: 10, label: 'Reward 🎁' }]
  const reengageTotalStamps = reengageRewards[reengageRewards.length - 1]?.stamp ?? 10

  try {
    await sendReengagementEmail({
      name: customer.name,
      email: customer.email,
      stampCount: customer.stamp_count,
      scanUrl,
      logoUrl: venue?.logo_url ?? `${baseUrl}/vve-logo.png`,
      venueName: venue?.name ?? 'Loyalty',
      brandColor: venue?.brand_color ?? '#D97706',
      backgroundColor: venue?.background_color ?? `${venue?.brand_color ?? '#D97706'}18`,
      totalStamps: reengageTotalStamps,
      rewards: reengageRewards,
      daysSince,
      offer,
      stampIcon: venue?.stamp_icon ?? '☕',
      stampOverrides: venue?.stamp_overrides ?? [],
      legal: legalFromVenue(venue, venue?.name ?? 'Loyalty'),
      ownerEmail: venue?.owner_email,
      baseUrl,
      uniqueId,
    })
    return { success: true }
  } catch (e) {
    console.error('Re-engagement email failed:', e)
    return { error: 'Failed to send email.' }
  }
}

// ── Cashier Login ─────────────────────────────────────────────────────────────

export type LoginState = { error?: string } | null

export async function cashierLogin(
  slug: string,
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get('password') as string

  const venue = await getVenueBySlug(slug)
  if (!venue) return { error: 'Venue not found.' }

  if (password !== venue.cashier_password) {
    return { error: 'Incorrect password.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(`cashier_${slug}`, 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    path: '/',
  })

  redirect(`/cashier/${slug}`)
}

// ── Cashier Logout ────────────────────────────────────────────────────────────

export async function cashierLogout(slug: string): Promise<never> {
  const cookieStore = await cookies()
  cookieStore.delete(`cashier_${slug}`)
  redirect(`/cashier/${slug}`)
}

// ── Redeem voucher ────────────────────────────────────────────────────────────

export type RedeemVoucherState = { success?: boolean; error?: string } | null

export async function redeemVoucherAction(
  voucherId: string,
  prevState: RedeemVoucherState,
  formData: FormData
): Promise<RedeemVoucherState> {
  const ok = await redeemVoucher(voucherId)
  if (!ok) return { error: 'Failed to mark voucher as given. Try again.' }
  revalidatePath('/scan/[unique_id]', 'page')
  return { success: true }
}
