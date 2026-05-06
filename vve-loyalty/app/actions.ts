'use server'

import {
  getCustomerByEmail,
  createCustomer,
  getCustomerByUniqueId,
  updateStampCount,
} from '@/lib/supabase'
import { sendStampCardEmail, sendReengagementEmail } from '@/lib/email'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

const REWARDS: Record<number, string> = {
  3: 'Free Cookie 🍪',
  6: 'Free Matcha 🍵',
  10: 'Free Toast 🍞',
}

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
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!name || !email) return { error: 'Name and email are required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email.' }

  const existing = await getCustomerByEmail(email)
  if (existing) return { error: 'Email already registered — check your inbox for your stamp card!' }

  const customer = await createCustomer(name, email)
  if (!customer) return { error: 'Registration failed. Please try again.' }

  const baseUrl = await getBaseUrl()
  const scanUrl = `${baseUrl}/scan/${customer.unique_id}`

  try {
    await sendStampCardEmail({
      name,
      email,
      stampCount: 0,
      scanUrl,
      logoUrl: `${baseUrl}/vve-logo.png`,
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
  error?: string
} | null

export async function stampCustomer(
  uniqueId: string,
  prevState: StampState,
  formData: FormData
): Promise<StampState> {
  const customer = await getCustomerByUniqueId(uniqueId)
  if (!customer) return { error: 'Customer not found.' }
  if (customer.stamp_count >= 10) return { error: 'Stamp card already complete — should have auto-reset.' }

  const newCount = customer.stamp_count + 1
  const savedCount = newCount >= 10 ? 0 : newCount
  const ok = await updateStampCount(uniqueId, savedCount)
  if (!ok) return { error: 'Failed to add stamp. Try again.' }

  const reward = REWARDS[newCount]
  const baseUrl = await getBaseUrl()
  const scanUrl = `${baseUrl}/scan/${uniqueId}`

  try {
    await sendStampCardEmail({
      name: customer.name,
      email: customer.email,
      stampCount: newCount,
      scanUrl,
      logoUrl: `${baseUrl}/vve-logo.png`,
    })
  } catch (e) {
    console.error('Email send failed:', e)
  }

  return { success: true, name: customer.name, newCount, reward }
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

  const baseUrl = await getBaseUrl()
  const scanUrl = `${baseUrl}/scan/${uniqueId}`

  const daysSince = customer.last_visit_at
    ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / 86_400_000)
    : undefined

  try {
    await sendReengagementEmail({
      name: customer.name,
      email: customer.email,
      stampCount: customer.stamp_count,
      scanUrl,
      logoUrl: `${baseUrl}/vve-logo.png`,
      daysSince,
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
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get('password') as string

  if (password !== process.env.CASHIER_PASSWORD) {
    return { error: 'Incorrect password.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('is_cashier', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/cashier')
}
