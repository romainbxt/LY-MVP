import { getAllVenues, getCustomersForWinBack, updateWinBackSent } from '@/lib/supabase'
import { sendWinBackEmail, legalFromVenue } from '@/lib/email'

const WINBACK_SECRET = process.env.WINBACK_SECRET || 'test_secret'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== WINBACK_SECRET) {
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

    let totalSent = 0
    const results = []

    for (const venue of venues) {
      if (!venue.win_back_rules || venue.win_back_rules.length === 0) {
        results.push({ venue: venue.slug, rules: 0, sent: 0 })
        continue
      }

      let venueSent = 0
      // Each customer can receive AT MOST one win-back email per cron run, even if
      // they're eligible for multiple rules (e.g. an old customer at level 0 hitting
      // a 14d and 30d threshold simultaneously). The cron walks rules in ascending
      // level order, so the lowest matching rule wins.
      const sentThisRun = new Set<string>()
      const rulesInOrder = [...venue.win_back_rules].sort((a, b) => a.level - b.level)

      for (const rule of rulesInOrder) {
        const customers = await getCustomersForWinBack(venue.id, rule.inactiveDays, rule.level)

        for (const customer of customers) {
          if (!customer.email) continue
          if (sentThisRun.has(customer.unique_id)) continue

          try {
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

            await updateWinBackSent(customer.unique_id, rule.level)
            sentThisRun.add(customer.unique_id)
            venueSent++
            totalSent++

            console.log(`[WinBack] Sent ${rule.subject} to ${customer.email} (${venue.slug})`)
          } catch (error) {
            console.error(`[WinBack Error] Failed to send to ${customer.email}:`, error)
          }
        }
      }

      results.push({ venue: venue.slug, rules: venue.win_back_rules.length, sent: venueSent })
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
