import {
  getAllVenues,
  getCustomersForWinBack,
  updateWinBackSent,
  isVenueClosedOnWeekday,
  createVoucher,
  getRecentVoucherByType,
  BIRTHDAY_DEFAULT_QUIET_DAYS,
} from '@/lib/supabase'
import { sendWinBackEmail, legalFromVenue } from '@/lib/email'
import { berlinWeekday, daysUntilNextBirthday } from '@/lib/recap'

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
      return new Response(JSON.stringify({ error: 'Failed to fetch venues', venues }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const todayWeekday = berlinWeekday(now)
    let totalSent = 0
    const results = []

    for (const venue of venues) {
      if (isVenueClosedOnWeekday(venue, todayWeekday)) {
        results.push({ venue: venue.slug, skipped: 'closed today' })
        continue
      }
      if (!venue.win_back_rules || venue.win_back_rules.length === 0) {
        results.push({ venue: venue.slug, rules: 0, sent: 0 })
        continue
      }

      let venueSent = 0
      let skippedBirthday = 0
      let skippedGap = 0
      const sentThisRun = new Set<string>()
      const rulesInOrder = [...venue.win_back_rules].sort((a, b) => a.level - b.level)
      const quietDays = venue.birthday_quiet_days ?? BIRTHDAY_DEFAULT_QUIET_DAYS

      for (let i = 0; i < rulesInOrder.length; i++) {
        const rule = rulesInOrder[i]
        const previousRule = i > 0 ? rulesInOrder[i - 1] : null
        const requiredGapDays = previousRule ? Math.max(0, rule.inactiveDays - previousRule.inactiveDays) : 0

        const customers = await getCustomersForWinBack(venue.id, rule.inactiveDays, rule.level)

        for (const customer of customers) {
          if (!customer.email) continue
          if (sentThisRun.has(customer.unique_id)) continue

          // CHECK 1: Birthday post-window — any active birthday voucher means skip
          const recentBirthdayVoucher = await getRecentVoucherByType(
            customer.id,
            'birthday',
            new Date(now.getTime() - 14 * 86_400_000).toISOString()
          )
          if (recentBirthdayVoucher && (!recentBirthdayVoucher.redeemed_at || new Date(recentBirthdayVoucher.expires_at) > now)) {
            skippedBirthday++
            continue
          }

          // CHECK 2: Birthday look-ahead (pre-window quiet days)
          if (venue.birthday_email_enabled && customer.birthday && quietDays > 0) {
            const days = daysUntilNextBirthday(customer.birthday, now)
            if (days !== null && days <= quietDays) {
              skippedBirthday++
              continue
            }
          }

          // CHECK 3: Gap spacing — minimum days since last win-back email
          if (requiredGapDays > 0 && customer.last_winback_sent_at) {
            const lastSent = new Date(customer.last_winback_sent_at)
            const daysSinceLast = Math.floor((now.getTime() - lastSent.getTime()) / 86_400_000)
            if (daysSinceLast < requiredGapDays) {
              skippedGap++
              continue
            }
          }

          try {
            // Always create the voucher (cashier sees it even for opted-out customers)
            const offerExpiryDays = rule.offerExpiryDays && rule.offerExpiryDays > 0 ? rule.offerExpiryDays : 14
            const expiresAt = new Date(now.getTime() + offerExpiryDays * 86_400_000)
            await createVoucher({
              customerId: customer.id,
              venueId: venue.id,
              type: 'winback',
              offerText: rule.offer,
              expiresAt: expiresAt.toISOString(),
            })

            // Send the email only if customer hasn't opted out of marketing
            if (!customer.unsubscribed_marketing_at) {
              await sendWinBackEmail({
                name: customer.name,
                email: customer.email,
                subject: rule.subject,
                offer: rule.offer,
                venueName: venue.name,
                brandColor: venue.brand_color,
                logoUrl: venue.logo_url || `${baseUrl}/vve-logo.png`,
                scanUrl: `${baseUrl}/scan/${customer.unique_id}`,
                legal: legalFromVenue(venue, venue.name),
                ownerEmail: venue.owner_email,
                baseUrl,
                uniqueId: customer.unique_id,
                offerExpiryDays: rule.offerExpiryDays,
              })
              venueSent++
              totalSent++
              console.log(`[WinBack] Sent ${rule.subject} to ${customer.email} (${venue.slug})`)
            }

            await updateWinBackSent(customer.unique_id, rule.level)
            sentThisRun.add(customer.unique_id)
          } catch (error) {
            console.error(`[WinBack Error] Failed to send to ${customer.email}:`, error)
          }
        }
      }

      results.push({
        venue: venue.slug,
        rules: venue.win_back_rules.length,
        sent: venueSent,
        skippedBirthday,
        skippedGap,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalVenues: venues.length,
        totalSent,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[WinBack Cron Error]', error)
    return new Response(
      JSON.stringify({
        error: 'Cron execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
