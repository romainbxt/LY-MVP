'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createVenue, updateVenue, uploadLogo, clampWinBackLevels, WINBACK_MIN_INACTIVE_DAYS, WINBACK_MAX_RULES, BIRTHDAY_DEFAULT_OFFER, BIRTHDAY_DEFAULT_EXPIRY_DAYS, BIRTHDAY_DEFAULT_QUIET_DAYS } from '@/lib/supabase'
import type { WinBackRule } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

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
  const brandColor = (formData.get('brand_color') as string)?.trim() || '#D97706'
  const backgroundColor = (formData.get('background_color') as string)?.trim() || null
  const cashierPassword = (formData.get('cashier_password') as string)?.trim()
  const rewardsRaw = (formData.get('rewards') as string)?.trim()

  if (!slug || !name || !cashierPassword) {
    return { error: 'Slug, name, and cashier password are required.' }
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'Slug can only contain lowercase letters, numbers, and hyphens.' }
  }

  const logoFile = formData.get('logo') as File | null
  let logoUrl: string | null = null
  if (logoFile && logoFile.size > 0) {
    logoUrl = await uploadLogo(logoFile)
    if (!logoUrl) return { error: 'Failed to upload logo. Try again.' }
  }

  const stampIcon = (formData.get('stamp_icon') as string)?.trim() || '☕'
  const rewardOnLastStamp = formData.get('reward_on_last_stamp') !== 'false'
  const askBirthday = formData.get('ask_birthday') === 'true'

  const legalName = (formData.get('legal_name') as string)?.trim() || null
  const addressStreet = (formData.get('address_street') as string)?.trim() || null
  const addressPostcode = (formData.get('address_postcode') as string)?.trim() || null
  const addressCity = (formData.get('address_city') as string)?.trim() || null
  const registerCourt = (formData.get('register_court') as string)?.trim() || null
  const registerNumber = (formData.get('register_number') as string)?.trim() || null
  const ownerEmail = (formData.get('owner_email') as string)?.trim().toLowerCase() || null

  const closedWeekdaysRaw = (formData.get('closed_weekdays') as string)?.trim() || '[]'
  let closedWeekdays: number[] = []
  try {
    const parsed = JSON.parse(closedWeekdaysRaw)
    if (Array.isArray(parsed)) {
      closedWeekdays = parsed.filter((n): n is number => typeof n === 'number' && n >= 0 && n <= 6)
    }
  } catch { /* ignore */ }

  const dailyRecapEnabled = formData.get('daily_recap_enabled') === 'true'
  const birthdayEmailEnabled = formData.get('birthday_email_enabled') === 'true'
  const birthdayOffer = (formData.get('birthday_offer') as string)?.trim() || BIRTHDAY_DEFAULT_OFFER
  const birthdayOfferExpiryDays = parseInt((formData.get('birthday_offer_expiry_days') as string) || `${BIRTHDAY_DEFAULT_EXPIRY_DAYS}`, 10) || BIRTHDAY_DEFAULT_EXPIRY_DAYS
  const birthdayQuietDays = parseInt((formData.get('birthday_quiet_days') as string) || `${BIRTHDAY_DEFAULT_QUIET_DAYS}`, 10)

  const rewards = parseRewards(rewardsRaw ?? '') ?? [
    { stamp: 3, label: 'Free Cookie 🍪' },
    { stamp: 6, label: 'Free Drink ☕' },
    { stamp: 10, label: 'Free Meal 🍽️' },
  ]

  const venue = await createVenue({
    slug,
    name,
    logoUrl,
    brandColor,
    backgroundColor,
    cashierPassword,
    rewards,
    stampIcon,
    stampOverrides: [],
    rewardOnLastStamp,
    askBirthday,
    legalName,
    addressStreet,
    addressPostcode,
    addressCity,
    registerCourt,
    registerNumber,
    ownerEmail,
    closedWeekdays,
    dailyRecapEnabled,
    birthdayEmailEnabled,
    birthdayOffer,
    birthdayOfferExpiryDays,
    birthdayQuietDays: isNaN(birthdayQuietDays) ? BIRTHDAY_DEFAULT_QUIET_DAYS : birthdayQuietDays,
  })
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
  const brandColor = (formData.get('brand_color') as string)?.trim() || '#D97706'
  const backgroundColor = (formData.get('background_color') as string)?.trim() || null
  const cashierPassword = (formData.get('cashier_password') as string)?.trim() || undefined
  const rewardsRaw = (formData.get('rewards') as string)?.trim()

  const logoFile = formData.get('logo') as File | null
  let logoUrl: string | null | undefined = undefined
  if (logoFile && logoFile.size > 0) {
    const uploaded = await uploadLogo(logoFile)
    if (!uploaded) return { error: 'Failed to upload logo. Try again.' }
    logoUrl = uploaded
  }

  const stampIcon = (formData.get('stamp_icon') as string)?.trim() || undefined
  const stampOverridesRaw = (formData.get('stamp_overrides') as string)?.trim()
  const rewardOnLastStampRaw = formData.get('reward_on_last_stamp') as string | null
  const askBirthdayRaw = formData.get('ask_birthday') as string | null

  const legalNameRaw = formData.get('legal_name') as string | null
  const addressStreetRaw = formData.get('address_street') as string | null
  const addressPostcodeRaw = formData.get('address_postcode') as string | null
  const addressCityRaw = formData.get('address_city') as string | null
  const registerCourtRaw = formData.get('register_court') as string | null
  const registerNumberRaw = formData.get('register_number') as string | null
  const ownerEmailRaw = formData.get('owner_email') as string | null
  const closedWeekdaysRaw = formData.get('closed_weekdays') as string | null
  const dailyRecapEnabledRaw = formData.get('daily_recap_enabled') as string | null
  const birthdayEnabledRaw = formData.get('birthday_email_enabled') as string | null
  const birthdayOfferRaw = formData.get('birthday_offer') as string | null
  const birthdayExpiryDaysRaw = formData.get('birthday_offer_expiry_days') as string | null
  const birthdayQuietDaysRaw = formData.get('birthday_quiet_days') as string | null

  const fields: Parameters<typeof updateVenue>[1] = {}
  if (name) fields.name = name
  if (logoUrl !== undefined) fields.logo_url = logoUrl
  fields.background_color = backgroundColor
  if (brandColor) fields.brand_color = brandColor
  if (cashierPassword) fields.cashier_password = cashierPassword
  if (stampIcon) fields.stamp_icon = stampIcon
  if (stampOverridesRaw) {
    try { fields.stamp_overrides = JSON.parse(stampOverridesRaw) } catch { /* ignore */ }
  }
  if (rewardOnLastStampRaw !== null) fields.reward_on_last_stamp = rewardOnLastStampRaw !== 'false'
  if (askBirthdayRaw !== null) fields.ask_birthday = askBirthdayRaw === 'true'

  if (legalNameRaw !== null) fields.legal_name = legalNameRaw.trim() || null
  if (addressStreetRaw !== null) fields.address_street = addressStreetRaw.trim() || null
  if (addressPostcodeRaw !== null) fields.address_postcode = addressPostcodeRaw.trim() || null
  if (addressCityRaw !== null) fields.address_city = addressCityRaw.trim() || null
  if (registerCourtRaw !== null) fields.register_court = registerCourtRaw.trim() || null
  if (registerNumberRaw !== null) fields.register_number = registerNumberRaw.trim() || null
  if (ownerEmailRaw !== null) fields.owner_email = ownerEmailRaw.trim().toLowerCase() || null

  if (closedWeekdaysRaw !== null) {
    try {
      const parsed = JSON.parse(closedWeekdaysRaw)
      if (Array.isArray(parsed)) {
        fields.closed_weekdays = parsed.filter((n): n is number => typeof n === 'number' && n >= 0 && n <= 6)
      }
    } catch { /* ignore */ }
  }

  if (dailyRecapEnabledRaw !== null) {
    fields.daily_recap_enabled = dailyRecapEnabledRaw === 'true'
  }

  if (birthdayEnabledRaw !== null) {
    fields.birthday_email_enabled = birthdayEnabledRaw === 'true'
  }
  if (birthdayOfferRaw !== null) {
    fields.birthday_offer = birthdayOfferRaw.trim() || BIRTHDAY_DEFAULT_OFFER
  }
  if (birthdayExpiryDaysRaw !== null) {
    const n = parseInt(birthdayExpiryDaysRaw, 10)
    fields.birthday_offer_expiry_days = isNaN(n) || n < 1 ? BIRTHDAY_DEFAULT_EXPIRY_DAYS : n
  }
  if (birthdayQuietDaysRaw !== null) {
    const n = parseInt(birthdayQuietDaysRaw, 10)
    fields.birthday_quiet_days = isNaN(n) || n < 0 ? BIRTHDAY_DEFAULT_QUIET_DAYS : n
  }

  if (rewardsRaw) {
    const rewards = parseRewards(rewardsRaw)
    if (!rewards) return { error: 'Invalid rewards format. Use "5 = Free Coffee ☕" per line.' }
    fields.rewards = rewards
  }

  const ok = await updateVenue(venueId, fields)
  if (!ok) return { error: 'Failed to update venue.' }

  redirect('/admin')
}

export async function updateWinBackRules(
  venueId: string,
  rules: WinBackRule[]
): Promise<boolean> {
  if (rules.length > WINBACK_MAX_RULES) return false
  if (rules.some(r => r.inactiveDays < WINBACK_MIN_INACTIVE_DAYS)) return false
  if (rules.some(r => (r.offerExpiryDays ?? 0) < 0)) return false

  // Defensive renumber on the server too, so the on-disk levels are always sequential
  const sanitized = [...rules]
    .sort((a, b) => a.inactiveDays - b.inactiveDays)
    .map((r, i) => ({ ...r, level: i + 1 }))

  const ok = await updateVenue(venueId, { win_back_rules: sanitized })
  if (!ok) return false

  // Clamp any customer whose winback_level_sent now exceeds the new max level.
  // Without this, a customer at level 3 could be stranded if the owner deleted rule 3.
  const maxLevel = sanitized.length
  await clampWinBackLevels(venueId, maxLevel)

  revalidatePath('/admin')
  return true
}
