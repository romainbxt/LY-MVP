import type { Customer, Venue } from './supabase'
import { WEEKDAY_NAMES, isVenueClosedOnWeekday } from './supabase'

const BERLIN_TZ = 'Europe/Berlin'

function berlinOffsetForDate(date: Date): number {
  // Returns the Berlin offset in hours for the given moment (+1 winter, +2 summer)
  const probe = new Date(`${date.toISOString().slice(0, 10)}T12:00:00Z`)
  const berlinHour = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: BERLIN_TZ, hour: '2-digit', hour12: false }).format(probe)
  )
  return berlinHour - 12
}

export function berlinDateString(date: Date = new Date()): string {
  // YYYY-MM-DD in Berlin
  return new Intl.DateTimeFormat('sv-SE', { timeZone: BERLIN_TZ }).format(date)
}

export function berlinWeekday(date: Date = new Date()): number {
  // 0..6 where 0 = Sunday, matching JS Date.getDay()
  const weekdayName = new Intl.DateTimeFormat('en-US', { timeZone: BERLIN_TZ, weekday: 'long' }).format(date)
  return WEEKDAY_NAMES.indexOf(weekdayName as (typeof WEEKDAY_NAMES)[number])
}

export function berlinDayStartUtcIso(daysAgo = 0): string {
  // ISO UTC string for the start of (today - daysAgo) in Berlin time
  const now = new Date()
  const shifted = new Date(now.getTime() - daysAgo * 86_400_000)
  const dateStr = berlinDateString(shifted)
  const offset = berlinOffsetForDate(shifted)
  const offsetStr = `${offset >= 0 ? '+' : '-'}${String(Math.abs(offset)).padStart(2, '0')}:00`
  return new Date(`${dateStr}T00:00:00${offsetStr}`).toISOString()
}

export function berlinDayWindowUtcIso(daysAgo = 0): { startIso: string; endIso: string } {
  return {
    startIso: berlinDayStartUtcIso(daysAgo),
    endIso: berlinDayStartUtcIso(daysAgo - 1),
  }
}

export function formatBerlinDateHuman(date: Date = new Date()): string {
  // "Sunday 1 June"
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BERLIN_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

// ── Day classification + lines ───────────────────────────────────────────────

export type DayCounts = {
  newSignups: number
  visited: number
  winbackSent: number
}

export type DayClass = 'strong' | 'solid' | 'quiet' | 'dead'

export function classifyDay(t: DayCounts): DayClass {
  if (t.newSignups >= 3 || t.visited >= 8) return 'strong'
  if (t.newSignups >= 1 && t.visited >= 3) return 'solid'
  if (t.visited > 0 || t.newSignups > 0) return 'quiet'
  return 'dead'
}

export function motivationalLines(klass: DayClass): { email: string; whatsapp: string } {
  switch (klass) {
    case 'strong':
      return {
        email: 'Strong day. Whatever you did today, do more of it tomorrow.',
        whatsapp: '🔥 Strong day — keep it going.',
      }
    case 'solid':
      return {
        email: 'Steady day. Loyalty grows one customer at a time — keep showing up.',
        whatsapp: '👍 Solid day.',
      }
    case 'quiet':
      return {
        email: 'Quiet today. Could you ask your team to mention the loyalty card to every customer tomorrow?',
        whatsapp: '🤔 Quiet day. Ask the team to push the QR more tomorrow?',
      }
    case 'dead':
      return {
        email: 'Nothing happened today. Was the QR code visible at the till? Was anyone reminding customers?',
        whatsapp: '😴 Dead today. Was the QR visible? Anyone offering the card?',
      }
  }
}

export function yesterdayComparisonLines(
  today: DayCounts,
  yesterday: DayCounts | null,
  yesterdayWasClosed: boolean
): { email: string | null; whatsapp: string | null } {
  if (yesterdayWasClosed) {
    return { email: 'Yesterday: closed.', whatsapp: 'Yesterday: closed.' }
  }
  if (!yesterday) {
    return {
      email: 'First day of tracking — comparison will start tomorrow.',
      whatsapp: 'First day of tracking.',
    }
  }
  const todayScore = today.newSignups * 3 + today.visited
  const yesterdayScore = yesterday.newSignups * 3 + yesterday.visited

  if (yesterdayScore === 0 && todayScore === 0) {
    return { email: null, whatsapp: null }
  }
  if (todayScore >= yesterdayScore * 2 && yesterdayScore > 0) {
    return {
      email: "That's a big jump from yesterday — what changed?",
      whatsapp: '📈 Big jump from yesterday — what changed?',
    }
  }
  if (yesterdayScore >= todayScore * 2 && todayScore > 0) {
    return {
      email: 'Yesterday was busier. Worth asking the team what changed today.',
      whatsapp: '📉 Yesterday was busier — what changed?',
    }
  }
  if (yesterdayScore > 0 && todayScore === 0) {
    return {
      email: 'Yesterday was busier. Worth asking the team what changed today.',
      whatsapp: '📉 Yesterday was busier — what changed?',
    }
  }
  return { email: null, whatsapp: null }
}

// ── Per-venue stats bundle ───────────────────────────────────────────────────

export type WinBackRecipient = { name: string; daysInactive: number }

export type VenueDayStats = {
  venue: Venue
  isClosedToday: boolean
  closedWeekdayName: string | null
  today: DayCounts
  yesterday: DayCounts
  yesterdayWasClosed: boolean
  newCustomersToday: Customer[]
  customersVisitedToday: Customer[]
  winbackRecipientsToday: WinBackRecipient[]
}

export function buildVenueDayStats(args: {
  venue: Venue
  todayCounts: DayCounts
  yesterdayCounts: DayCounts
  yesterdayWasClosed: boolean
  newCustomersToday: Customer[]
  customersVisitedToday: Customer[]
  winbackRecipientsToday: WinBackRecipient[]
  todayWeekday: number
  yesterdayWeekday: number
}): VenueDayStats {
  const isClosedToday = isVenueClosedOnWeekday(args.venue, args.todayWeekday)
  return {
    venue: args.venue,
    isClosedToday,
    closedWeekdayName: isClosedToday ? WEEKDAY_NAMES[args.todayWeekday] : null,
    today: args.todayCounts,
    yesterday: args.yesterdayCounts,
    yesterdayWasClosed: args.yesterdayWasClosed,
    newCustomersToday: args.newCustomersToday,
    customersVisitedToday: args.customersVisitedToday,
    winbackRecipientsToday: args.winbackRecipientsToday,
  }
}
