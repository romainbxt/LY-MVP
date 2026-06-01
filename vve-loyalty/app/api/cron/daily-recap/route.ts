import {
  getAllVenues,
  getNewSignupsBetween,
  getCustomersVisitedBetween,
  getWinBackSentBetween,
  isVenueClosedOnWeekday,
} from '@/lib/supabase'
import { sendOwnerRecap, sendAdminDigest, buildWhatsappBlock } from '@/lib/email'
import {
  berlinDayWindowUtcIso,
  berlinWeekday,
  formatBerlinDateHuman,
  buildVenueDayStats,
} from '@/lib/recap'

const SECRET = process.env.WINBACK_SECRET || 'test_secret'
const CRON_SECRET = process.env.CRON_SECRET
const ADMIN_DIGEST_EMAIL = process.env.ADMIN_DIGEST_EMAIL || 'gzelenitsas@gmail.com'

type OwnerEmailStatus = 'sent' | 'skipped-no-email' | 'skipped-closed' | 'failed'

function isAuthorized(request: Request): boolean {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') === SECRET) return true
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
    const today = berlinDayWindowUtcIso(0)
    const yesterday = berlinDayWindowUtcIso(1)
    const todayWeekday = berlinWeekday(now)
    const yesterdayDate = new Date(now.getTime() - 86_400_000)
    const yesterdayWeekday = berlinWeekday(yesterdayDate)
    const dateHuman = formatBerlinDateHuman(now)
    const sentAtBerlin = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now)

    const digestEntries: Array<{
      stats: ReturnType<typeof buildVenueDayStats>
      whatsappBlock: string
      ownerEmailStatus: OwnerEmailStatus
      ownerEmail: string | null
    }> = []

    for (const venue of venues) {
      const yesterdayWasClosed = isVenueClosedOnWeekday(venue, yesterdayWeekday)
      const isClosedToday = isVenueClosedOnWeekday(venue, todayWeekday)

      const [newSignupsToday, visitedToday, winbackToday, newSignupsYesterday, visitedYesterday, winbackYesterday] = await Promise.all([
        getNewSignupsBetween(venue.id, today.startIso, today.endIso),
        getCustomersVisitedBetween(venue.id, today.startIso, today.endIso),
        getWinBackSentBetween(venue.id, today.startIso, today.endIso),
        getNewSignupsBetween(venue.id, yesterday.startIso, yesterday.endIso),
        getCustomersVisitedBetween(venue.id, yesterday.startIso, yesterday.endIso),
        getWinBackSentBetween(venue.id, yesterday.startIso, yesterday.endIso),
      ])

      const winbackRecipientsToday = winbackToday.map(c => {
        const days = c.last_visit_at
          ? Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / 86_400_000)
          : 0
        return { name: c.name, daysInactive: days }
      })

      const stats = buildVenueDayStats({
        venue,
        todayCounts: {
          newSignups: newSignupsToday.length,
          visited: visitedToday.length,
          winbackSent: winbackToday.length,
        },
        yesterdayCounts: {
          newSignups: newSignupsYesterday.length,
          visited: visitedYesterday.length,
          winbackSent: winbackYesterday.length,
        },
        yesterdayWasClosed,
        newCustomersToday: newSignupsToday,
        customersVisitedToday: visitedToday,
        winbackRecipientsToday,
        todayWeekday,
        yesterdayWeekday,
      })

      const dashboardUrl = `${baseUrl}/cashier/${venue.slug}`
      const whatsappBlock = buildWhatsappBlock(stats, dateHuman, dashboardUrl)

      let ownerEmailStatus: OwnerEmailStatus
      if (isClosedToday) {
        ownerEmailStatus = 'skipped-closed'
      } else if (!venue.owner_email) {
        ownerEmailStatus = 'skipped-no-email'
      } else {
        try {
          await sendOwnerRecap({
            ownerEmail: venue.owner_email,
            stats,
            dateHuman,
            dashboardUrl,
          })
          ownerEmailStatus = 'sent'
        } catch (e) {
          console.error(`[DailyRecap] Failed to send owner email for ${venue.slug}:`, e)
          ownerEmailStatus = 'failed'
        }
      }

      digestEntries.push({ stats, whatsappBlock, ownerEmailStatus, ownerEmail: venue.owner_email })
    }

    try {
      await sendAdminDigest({
        toEmail: ADMIN_DIGEST_EMAIL,
        dateHuman,
        venues: digestEntries,
        sentAtBerlin,
      })
    } catch (e) {
      console.error('[DailyRecap] Failed to send admin digest:', e)
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: dateHuman,
        venuesReported: digestEntries.length,
        ownerEmails: digestEntries.map(d => ({
          venue: d.stats.venue.slug,
          status: d.ownerEmailStatus,
        })),
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[DailyRecap Error]', error)
    return new Response(
      JSON.stringify({
        error: 'Cron execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
