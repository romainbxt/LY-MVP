import {
  getAllVenues,
  getCustomersWithBirthday,
  createVoucher,
  getRecentVoucherByType,
  isVenueClosedOnWeekday,
  BIRTHDAY_DEFAULT_OFFER,
  BIRTHDAY_DEFAULT_EXPIRY_DAYS,
} from '@/lib/supabase'
import { sendBirthdayEmail, legalFromVenue } from '@/lib/email'
import { berlinMonthDay, berlinWeekday, formatBerlinDateShort } from '@/lib/recap'

const WINBACK_SECRET = process.env.WINBACK_SECRET || 'test_secret'
const CRON_SECRET = process.env.CRON_SECRET

function isAuthorized(request: Request): boolean {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') === WINBACK_SECRET) return true
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization') ?? ''
    if (auth === `Bearer ${CRON_SECRET}`) return true
  }
  return false
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const venues = await getAllVenues()
    if (!Array.isArray(venues)) {
      return new Response(JSON.stringify({ error: 'Failed to fetch venues' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const todayMmDd = berlinMonthDay(now)
    const todayWeekday = berlinWeekday(now)
    const oneYearAgoIso = new Date(now.getTime() - 350 * 86_400_000).toISOString()

    let totalVouchersCreated = 0
    let totalEmailsSent = 0
    const results: Array<{ venue: string; created: number; sent: number; reason?: string }> = []

    for (const venue of venues) {
      if (!venue.birthday_email_enabled) {
        results.push({ venue: venue.slug, created: 0, sent: 0, reason: 'birthday emails disabled' })
        continue
      }
      if (isVenueClosedOnWeekday(venue, todayWeekday)) {
        results.push({ venue: venue.slug, created: 0, sent: 0, reason: 'closed today' })
        continue
      }

      const customers = await getCustomersWithBirthday(venue.id, todayMmDd)
      let venueCreated = 0
      let venueSent = 0
      const offer = venue.birthday_offer || BIRTHDAY_DEFAULT_OFFER
      const expiryDays = venue.birthday_offer_expiry_days || BIRTHDAY_DEFAULT_EXPIRY_DAYS
      const expiresAt = new Date(now.getTime() + expiryDays * 86_400_000)
      const expiryHuman = formatBerlinDateShort(expiresAt)

      for (const customer of customers) {
        // Skip if we already sent a birthday voucher in the last ~year (prevents duplicates if cron retries)
        const recent = await getRecentVoucherByType(customer.id, 'birthday', oneYearAgoIso)
        if (recent) continue

        // Always create the voucher (cashier sees it even for opted-out customers)
        const voucher = await createVoucher({
          customerId: customer.id,
          venueId: venue.id,
          type: 'birthday',
          offerText: offer,
          expiresAt: expiresAt.toISOString(),
        })
        if (!voucher) continue
        venueCreated++
        totalVouchersCreated++

        // Send the email only if customer hasn't opted out of marketing
        if (customer.email && !customer.unsubscribed_marketing_at) {
          try {
            await sendBirthdayEmail({
              name: customer.name,
              email: customer.email,
              offer,
              expiryDateHuman: expiryHuman,
              venueName: venue.name,
              brandColor: venue.brand_color,
              backgroundColor: venue.background_color ?? `${venue.brand_color}18`,
              logoUrl: venue.logo_url || `${baseUrl}/vve-logo.png`,
              scanUrl: `${baseUrl}/scan/${customer.unique_id}`,
              legal: legalFromVenue(venue, venue.name),
              ownerEmail: venue.owner_email,
              baseUrl,
              uniqueId: customer.unique_id,
            })
            venueSent++
            totalEmailsSent++
            console.log(`[Birthday] Sent to ${customer.email} (${venue.slug})`)
          } catch (e) {
            console.error(`[Birthday Error] Failed to send to ${customer.email}:`, e)
          }
        }
      }

      results.push({ venue: venue.slug, created: venueCreated, sent: venueSent })
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: todayMmDd,
        totalVouchersCreated,
        totalEmailsSent,
        results,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Birthday Cron Error]', error)
    return new Response(
      JSON.stringify({
        error: 'Cron execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
