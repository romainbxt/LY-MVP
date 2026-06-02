import nodemailer from 'nodemailer'
import type { Venue } from './supabase'
import { buildUnsubscribeUrl } from './hmac'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type LegalInfo = {
  venueName: string
  legalName?: string | null
  addressStreet?: string | null
  addressPostcode?: string | null
  addressCity?: string | null
  registerCourt?: string | null
  registerNumber?: string | null
}

export function legalFromVenue(venue: Venue | null, fallbackName: string): LegalInfo {
  return {
    venueName: venue?.name ?? fallbackName,
    legalName: venue?.legal_name,
    addressStreet: venue?.address_street,
    addressPostcode: venue?.address_postcode,
    addressCity: venue?.address_city,
    registerCourt: venue?.register_court,
    registerNumber: venue?.register_number,
  }
}

function buildLegalFooter(legal: LegalInfo, unsubscribeUrl?: string): string {
  const safeVenue = escapeHtml(legal.venueName)
  const lines: string[] = []

  lines.push(`&copy; ${safeVenue}. All rights reserved.`)

  const addressParts: string[] = []
  if (legal.legalName) addressParts.push(escapeHtml(legal.legalName))
  const streetLine = [legal.addressStreet, legal.addressPostcode && legal.addressCity ? `${legal.addressPostcode} ${legal.addressCity}` : (legal.addressPostcode ?? legal.addressCity)]
    .filter(Boolean)
    .join(', ')
  if (streetLine) addressParts.push(escapeHtml(streetLine))
  if (addressParts.length > 0) lines.push(addressParts.join(', '))

  if (legal.registerCourt) lines.push(escapeHtml(legal.registerCourt))
  if (legal.registerNumber) lines.push(escapeHtml(legal.registerNumber))

  const linesHtml = lines
    .map(l => `<p style="margin:0 0 4px;font-size:11px;color:#888888;line-height:1.5;">${l}</p>`)
    .join('')

  const unsubLine = unsubscribeUrl
    ? `<p style="margin:4px 0 0;font-size:11px;color:#888888;line-height:1.5;"><a href="${unsubscribeUrl}" style="color:#888888;text-decoration:underline;">Manage email preferences or unsubscribe</a></p>`
    : ''

  return `<tr><td align="center" style="padding-top:24px;border-top:1px solid #eeeeee;">
    ${linesHtml}
    <p style="margin:12px 0 4px;font-size:11px;color:#aaaaaa;line-height:1.5;">You're receiving this because you joined ${safeVenue}'s loyalty program. Powered by LY Loyalty.</p>
    ${unsubLine}
  </td></tr>`
}

function buildListUnsubscribeHeaders(baseUrl: string | undefined, uniqueId: string | undefined): Record<string, string> {
  if (!baseUrl || !uniqueId) return {}
  try {
    const url = buildUnsubscribeUrl(baseUrl, uniqueId)
    const sig = url.split('sig=')[1] ?? ''
    const oneClickUrl = `${baseUrl}/api/unsubscribe/${uniqueId}?sig=${sig}`
    return {
      'List-Unsubscribe': `<${oneClickUrl}>, <${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }
  } catch {
    return {}
  }
}

function buildStampCell(
  num: number,
  stampCount: number,
  brandColor: string,
  stampIcon: string,
  overrideMap: Record<number, string>,
  rewardLabel?: string
): string {
  const filled = num <= stampCount
  const icon = overrideMap[num] ?? stampIcon
  const circleBg = filled ? brandColor : '#f0ece4'
  const labelColor = filled ? brandColor : '#c0b8a8'
  const displayLabel = rewardLabel && filled ? `${rewardLabel} ✓` : (rewardLabel ?? '')

  return `<td style="text-align:center;vertical-align:top;padding:4px;">
    <div style="width:52px;height:52px;border-radius:50%;background:${circleBg};line-height:52px;text-align:center;font-size:22px;margin:0 auto 4px;opacity:${filled ? '1' : '0.35'};">${icon}</div>
    <div style="font-size:9px;color:${labelColor};text-align:center;width:56px;font-weight:600;line-height:1.3;min-height:12px;">${escapeHtml(displayLabel)}</div>
  </td>`
}

function buildStampRows(
  stampCount: number,
  totalStamps: number,
  brandColor: string,
  stampIcon: string,
  overrideMap: Record<number, string>,
  rewards: Array<{ stamp: number; label: string }>
): string {
  const rewardMap = Object.fromEntries(rewards.map(r => [r.stamp, r.label]))
  const all = Array.from({ length: totalStamps }, (_, i) => i + 1)
  const cols = Math.min(totalStamps, 5)
  const rows: string[] = []

  for (let i = 0; i < all.length; i += cols) {
    const cells = all.slice(i, i + cols)
      .map(n => buildStampCell(n, stampCount, brandColor, stampIcon, overrideMap, rewardMap[n]))
      .join('')
    rows.push(`<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;"><tr>${cells}</tr></table>`)
  }

  return rows.join('')
}

function buildEmailHtml({
  name,
  stampCount,
  qrDataUrl,
  logoUrl,
  venueName,
  brandColor,
  backgroundColor,
  totalStamps,
  rewards,
  stampIcon = '☕',
  stampOverrides = [],
  legal,
  unsubscribeUrl,
}: {
  name: string
  stampCount: number
  qrDataUrl: string
  logoUrl: string
  venueName: string
  brandColor: string
  backgroundColor: string
  totalStamps: number
  rewards: Array<{ stamp: number; label: string }>
  stampIcon?: string
  stampOverrides?: Array<{ stamp: number; icon: string }>
  legal: LegalInfo
  unsubscribeUrl?: string
}): string {
  const safeName = escapeHtml(name)
  const safeVenue = escapeHtml(venueName)
  const overrideMap = Object.fromEntries(stampOverrides.map(o => [o.stamp, o.icon]))
  const stampRows = buildStampRows(stampCount, totalStamps, brandColor, stampIcon, overrideMap, rewards)
  const nextReward = rewards.find(r => r.stamp > stampCount)
  const stampsToGo = nextReward ? nextReward.stamp - stampCount : 0
  const progressLine = nextReward
    ? `${stampsToGo} more stamp${stampsToGo !== 1 ? 's' : ''} to <strong>${escapeHtml(nextReward.label)}</strong>`
    : `You've completed your card — claim your reward!`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${backgroundColor};font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${backgroundColor}">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" border="0">

      ${logoUrl ? `<tr><td align="center" style="padding-bottom:20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr><td align="center" style="background:#ffffff;border-radius:12px;padding:12px;">
            <img src="${logoUrl}" alt="${safeVenue}" width="80" style="display:block;max-width:80px;height:auto;" />
          </td></tr>
        </table>
      </td></tr>` : ''}

      <tr><td align="center" style="padding-bottom:28px;">
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1a1a1a;">Hi ${safeName}!</h1>
        <p style="margin:0 0 4px;font-size:16px;color:#666666;">
          You have <span style="color:${brandColor};font-weight:700;">${stampCount} stamp${stampCount !== 1 ? 's' : ''}</span> at ${safeVenue}
        </p>
        <p style="margin:0;font-size:14px;color:#999999;">${progressLine}</p>
      </td></tr>

      <tr><td align="center" style="padding-bottom:28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px 16px;">
          <tr><td align="center" style="padding-bottom:16px;">
            <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#aaaaaa;font-weight:600;">Your Stamp Card</p>
          </td></tr>
          <tr><td align="center">${stampRows}</td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding-bottom:32px;">
        <table cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px;">
          <tr><td align="center">
            <img src="${qrDataUrl}" alt="Your QR Code" width="180" height="180" style="display:block;margin:0 auto 12px;" />
            <p style="margin:0;font-size:13px;color:#888888;font-weight:500;">Show this QR code at the counter</p>
          </td></tr>
        </table>
      </td></tr>

      ${buildLegalFooter(legal, unsubscribeUrl)}

    </table>
  </td></tr>
</table>
</body>
</html>`
}

function buildReengagementHtml({
  name,
  stampCount,
  qrDataUrl,
  logoUrl,
  venueName,
  brandColor,
  backgroundColor,
  totalStamps,
  rewards,
  daysSince,
  offer,
  stampIcon = '☕',
  stampOverrides = [],
  legal,
  unsubscribeUrl,
}: {
  name: string
  stampCount: number
  qrDataUrl: string
  logoUrl: string
  venueName: string
  brandColor: string
  backgroundColor: string
  totalStamps: number
  rewards: Array<{ stamp: number; label: string }>
  daysSince?: number
  offer?: string
  stampIcon?: string
  stampOverrides?: Array<{ stamp: number; icon: string }>
  legal: LegalInfo
  unsubscribeUrl?: string
}): string {
  const safeName = escapeHtml(name)
  const safeVenue = escapeHtml(venueName)
  const safeOffer = offer ? escapeHtml(offer) : undefined
  const overrideMap = Object.fromEntries(stampOverrides.map(o => [o.stamp, o.icon]))
  const stampRows = buildStampRows(stampCount, totalStamps, brandColor, stampIcon, overrideMap, rewards)
  const nextReward = rewards.find(r => r.stamp > stampCount)
  const stampsLeft = nextReward ? nextReward.stamp - stampCount : 0
  const missYouLine = daysSince ? `It's been ${daysSince} days since your last visit.` : `We haven't seen you in a while.`
  const rewardLine = nextReward
    ? `Only <strong>${stampsLeft}</strong> more stamp${stampsLeft !== 1 ? 's' : ''} to <strong>${escapeHtml(nextReward.label)}</strong>!`
    : `Your card is complete — come claim your reward!`

  const offerBlock = safeOffer ? `
      <tr><td align="center" style="padding-bottom:28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${brandColor};border-radius:16px;padding:24px 20px;">
          <tr><td align="center">
            <p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.85);font-weight:600;">Special Offer For You</p>
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${safeOffer}</p>
          </td></tr>
        </table>
      </td></tr>` : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${backgroundColor};font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${backgroundColor}">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" border="0">

      ${logoUrl ? `<tr><td align="center" style="padding-bottom:20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr><td align="center" style="background:#ffffff;border-radius:12px;padding:12px;">
            <img src="${logoUrl}" alt="${safeVenue}" width="80" style="display:block;max-width:80px;height:auto;" />
          </td></tr>
        </table>
      </td></tr>` : ''}

      <tr><td align="center" style="padding-bottom:28px;">
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1a1a1a;">We miss you, ${safeName}!</h1>
        <p style="margin:0 0 6px;font-size:16px;color:#666666;">${missYouLine}</p>
        <p style="margin:0;font-size:16px;color:#666666;">${rewardLine}</p>
      </td></tr>

      ${offerBlock}

      <tr><td align="center" style="padding-bottom:28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px 16px;">
          <tr><td align="center" style="padding-bottom:16px;">
            <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#aaaaaa;font-weight:600;">Your Stamp Card</p>
          </td></tr>
          <tr><td align="center">${stampRows}</td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding-bottom:32px;">
        <table cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px;">
          <tr><td align="center">
            <img src="${qrDataUrl}" alt="Your QR Code" width="180" height="180" style="display:block;margin:0 auto 12px;" />
            <p style="margin:0;font-size:13px;color:#888888;font-weight:500;">Show this QR code at the counter</p>
          </td></tr>
        </table>
      </td></tr>

      ${buildLegalFooter(legal, unsubscribeUrl)}

    </table>
  </td></tr>
</table>
</body>
</html>`
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function sendStampCardEmail({
  name,
  email,
  stampCount,
  scanUrl,
  logoUrl,
  venueName,
  brandColor,
  backgroundColor,
  totalStamps,
  rewards,
  stampIcon = '☕',
  stampOverrides = [],
  legal,
  ownerEmail,
  baseUrl,
  uniqueId,
}: {
  name: string
  email: string
  stampCount: number
  scanUrl: string
  logoUrl: string
  venueName: string
  brandColor: string
  backgroundColor: string
  totalStamps: number
  rewards: Array<{ stamp: number; label: string }>
  stampIcon?: string
  stampOverrides?: Array<{ stamp: number; icon: string }>
  legal: LegalInfo
  ownerEmail?: string | null
  baseUrl?: string
  uniqueId?: string
}) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(scanUrl)}`
  const unsubscribeUrl = baseUrl && uniqueId ? buildUnsubscribeUrl(baseUrl, uniqueId) : undefined
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `${venueName} Loyalty <${process.env.GMAIL_USER}>`,
    replyTo: ownerEmail ?? undefined,
    to: email,
    subject: `Your ${venueName} Stamp Card`,
    headers: buildListUnsubscribeHeaders(baseUrl, uniqueId),
    html: buildEmailHtml({ name, stampCount, qrDataUrl: qrImageUrl, logoUrl, venueName, brandColor, backgroundColor, totalStamps, rewards, stampIcon, stampOverrides, legal, unsubscribeUrl }),
  })
}

export async function sendReengagementEmail({
  name,
  email,
  stampCount,
  scanUrl,
  logoUrl,
  venueName,
  brandColor,
  backgroundColor,
  totalStamps,
  rewards,
  daysSince,
  offer,
  stampIcon = '☕',
  stampOverrides = [],
  legal,
  ownerEmail,
  baseUrl,
  uniqueId,
}: {
  name: string
  email: string
  stampCount: number
  scanUrl: string
  logoUrl: string
  venueName: string
  brandColor: string
  backgroundColor: string
  totalStamps: number
  rewards: Array<{ stamp: number; label: string }>
  daysSince?: number
  offer?: string
  stampIcon?: string
  stampOverrides?: Array<{ stamp: number; icon: string }>
  legal: LegalInfo
  ownerEmail?: string | null
  baseUrl?: string
  uniqueId?: string
}) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(scanUrl)}`
  const unsubscribeUrl = baseUrl && uniqueId ? buildUnsubscribeUrl(baseUrl, uniqueId) : undefined
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `${venueName} Loyalty <${process.env.GMAIL_USER}>`,
    replyTo: ownerEmail ?? undefined,
    to: email,
    subject: offer ? `A special offer for you at ${venueName}` : `We miss you at ${venueName}, ${name}!`,
    headers: buildListUnsubscribeHeaders(baseUrl, uniqueId),
    html: buildReengagementHtml({ name, stampCount, qrDataUrl: qrImageUrl, logoUrl, venueName, brandColor, backgroundColor, totalStamps, rewards, daysSince, offer, stampIcon, stampOverrides, legal, unsubscribeUrl }),
  })
}

function buildWinBackHtml({
  name,
  subject,
  offer,
  logoUrl,
  venueName,
  brandColor,
  backgroundColor,
  scanUrl,
  legal,
  unsubscribeUrl,
  offerExpiryDays,
}: {
  name: string
  subject: string
  offer: string
  logoUrl: string
  venueName: string
  brandColor: string
  backgroundColor: string
  scanUrl: string
  legal: LegalInfo
  unsubscribeUrl?: string
  offerExpiryDays?: number
}): string {
  const safeName = escapeHtml(name)
  const safeVenue = escapeHtml(venueName)
  const safeOffer = escapeHtml(offer)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(scanUrl)}`

  const expiryLine = (offerExpiryDays && offerExpiryDays > 0)
    ? (() => {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + offerExpiryDays)
        const formatted = expiryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        return `<p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.9);font-weight:500;">Valid until <strong>${escapeHtml(formatted)}</strong></p>`
      })()
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${backgroundColor};font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${backgroundColor}">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" border="0">

      ${logoUrl ? `<tr><td align="center" style="padding-bottom:20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr><td align="center" style="background:#ffffff;border-radius:12px;padding:12px;">
            <img src="${logoUrl}" alt="${safeVenue}" width="80" style="display:block;max-width:80px;height:auto;" />
          </td></tr>
        </table>
      </td></tr>` : ''}

      <tr><td align="center" style="padding-bottom:28px;">
        <h1 style="margin:0 0 12px;font-size:28px;font-weight:700;color:#1a1a1a;">${escapeHtml(subject)}</h1>
        <p style="margin:0;font-size:16px;color:#666666;">Hi ${safeName},</p>
      </td></tr>

      <tr><td align="center" style="padding-bottom:28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${brandColor};border-radius:16px;padding:24px 20px;">
          <tr><td align="center">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${safeOffer}</p>
            ${expiryLine}
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding-bottom:32px;">
        <table cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px;">
          <tr><td align="center">
            <img src="${qrImageUrl}" alt="Your QR Code" width="180" height="180" style="display:block;margin:0 auto 12px;" />
            <p style="margin:0;font-size:13px;color:#888888;font-weight:500;">Show this QR code at ${safeVenue}</p>
          </td></tr>
        </table>
      </td></tr>

      ${buildLegalFooter(legal, unsubscribeUrl)}

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function sendWinBackEmail({
  name,
  email,
  subject,
  offer,
  venueName,
  brandColor,
  backgroundColor,
  logoUrl,
  scanUrl,
  legal,
  ownerEmail,
  baseUrl,
  uniqueId,
  offerExpiryDays,
}: {
  name: string
  email: string
  subject: string
  offer: string
  venueName: string
  brandColor: string
  backgroundColor?: string
  logoUrl: string
  scanUrl: string
  legal: LegalInfo
  ownerEmail?: string | null
  baseUrl?: string
  uniqueId?: string
  offerExpiryDays?: number
}) {
  const transporter = createTransporter()
  const bgColor = backgroundColor || `${brandColor}18`
  const unsubscribeUrl = baseUrl && uniqueId ? buildUnsubscribeUrl(baseUrl, uniqueId) : undefined

  await transporter.sendMail({
    from: `${venueName} Loyalty <${process.env.GMAIL_USER}>`,
    replyTo: ownerEmail ?? undefined,
    to: email,
    subject,
    headers: buildListUnsubscribeHeaders(baseUrl, uniqueId),
    html: buildWinBackHtml({ name, subject, offer, logoUrl, venueName, brandColor, backgroundColor: bgColor, scanUrl, legal, unsubscribeUrl, offerExpiryDays }),
  })
}

// ── Daily recap emails ───────────────────────────────────────────────────────

import type { VenueDayStats } from './recap'
import { classifyDay, motivationalLines, yesterdayComparisonLines, formatBerlinDateHuman } from './recap'

function totalStampsForVenue(venue: Venue): number {
  return venue.rewards[venue.rewards.length - 1]?.stamp ?? 10
}

function buildOwnerRecapHtml(stats: VenueDayStats, dateHuman: string, dashboardUrl: string): string {
  const venue = stats.venue
  const safeVenue = escapeHtml(venue.name)
  const brand = venue.brand_color || '#D97706'
  const bg = venue.background_color || `${brand}10`
  const logoUrl = venue.logo_url
  const totalStamps = totalStampsForVenue(venue)
  const klass = classifyDay(stats.today)
  const motivational = motivationalLines(klass).email
  const comparison = yesterdayComparisonLines(stats.today, stats.yesterday, stats.yesterdayWasClosed).email

  const newCustomersBlock = stats.newCustomersToday.length === 0 ? '' : `
    <tr><td style="padding-top:8px;">
      <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#888888;font-weight:600;">New customers today (${stats.newCustomersToday.length})</p>
      <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.6;">
        ${stats.newCustomersToday.map(c => escapeHtml(c.name.split(' ')[0])).join(' &middot; ')}
      </p>
    </td></tr>
  `

  const visitedBlock = stats.customersVisitedToday.length === 0 ? '' : `
    <tr><td style="padding-top:14px;">
      <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#888888;font-weight:600;">Customers visited today (${stats.customersVisitedToday.length})</p>
      <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.7;">
        ${stats.customersVisitedToday.map(c => `${escapeHtml(c.name.split(' ')[0])} <span style="color:#888;">${c.stamp_count}/${totalStamps}</span>`).join(' &middot; ')}
      </p>
    </td></tr>
  `

  const winbackBlock = stats.winbackRecipientsToday.length === 0 ? '' : `
    <tr><td style="padding-top:14px;">
      <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#888888;font-weight:600;">Win-back emails sent this morning (${stats.winbackRecipientsToday.length})</p>
      ${stats.winbackRecipientsToday.map(r => `
        <p style="margin:0 0 4px;font-size:14px;color:#1a1a1a;">
          ✉️ ${escapeHtml(r.name.split(' ')[0])} <span style="color:#888;">— ${r.daysInactive} days inactive</span>
        </p>
      `).join('')}
    </td></tr>
  `

  const comparisonHtml = comparison
    ? `<tr><td align="center" style="padding-top:8px;"><p style="margin:0;font-size:13px;color:#888888;font-style:italic;">${escapeHtml(comparison)}</p></td></tr>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${bg};font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0" border="0">

      ${logoUrl ? `<tr><td align="center" style="padding-bottom:20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr><td align="center" style="background:#ffffff;border-radius:12px;padding:12px;">
            <img src="${logoUrl}" alt="${safeVenue}" width="64" style="display:block;max-width:64px;height:auto;" />
          </td></tr>
        </table>
      </td></tr>` : ''}

      <tr><td align="center" style="padding-bottom:8px;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888888;font-weight:600;">Your daily loyalty recap</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#1a1a1a;">${escapeHtml(dateHuman)}</h1>
      </td></tr>

      <tr><td style="padding:24px 0 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" width="33%" style="background:#ffffff;border-radius:12px;padding:16px 8px;">
              <p style="margin:0;font-size:28px;font-weight:700;color:${brand};">${stats.today.newSignups}</p>
              <p style="margin:4px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888888;font-weight:600;">New signups</p>
            </td>
            <td width="2%"></td>
            <td align="center" width="33%" style="background:#ffffff;border-radius:12px;padding:16px 8px;">
              <p style="margin:0;font-size:28px;font-weight:700;color:${brand};">${stats.today.visited}</p>
              <p style="margin:4px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888888;font-weight:600;">Customers visited</p>
            </td>
            <td width="2%"></td>
            <td align="center" width="33%" style="background:#ffffff;border-radius:12px;padding:16px 8px;">
              <p style="margin:0;font-size:28px;font-weight:700;color:${brand};">${stats.today.winbackSent}</p>
              <p style="margin:4px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888888;font-weight:600;">Win-back emails</p>
            </td>
          </tr>
        </table>
      </td></tr>

      ${comparisonHtml}

      <tr><td style="padding-top:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;padding:20px;">
          ${newCustomersBlock}
          ${visitedBlock}
          ${winbackBlock}
        </table>
      </td></tr>

      <tr><td align="center" style="padding:24px 0 8px;">
        <p style="margin:0;font-size:14px;color:#444444;line-height:1.5;font-style:italic;">${escapeHtml(motivational)}</p>
      </td></tr>

      <tr><td align="center" style="padding:20px 0 24px;">
        <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:${brand};color:#ffffff;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">View your dashboard →</a>
      </td></tr>

      <tr><td align="center" style="padding-top:24px;border-top:1px solid #eeeeee;">
        <p style="margin:0 0 4px;font-size:11px;color:#aaaaaa;line-height:1.5;">You're seeing this because you set up the ${safeVenue} loyalty program with LY Loyalty.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function buildWhatsappBlock(stats: VenueDayStats, dateHuman: string, dashboardUrl: string): string {
  const venue = stats.venue
  if (stats.isClosedToday) {
    return `🎯 *${venue.name}* — closed today (${stats.closedWeekdayName}s). Recap skipped.`
  }
  const t = stats.today
  const klass = classifyDay(t)
  const motiv = motivationalLines(klass).whatsapp
  const comparison = yesterdayComparisonLines(t, stats.yesterday, stats.yesterdayWasClosed).whatsapp

  const newNames = stats.newCustomersToday.map(c => c.name.split(' ')[0]).join(', ')
  const winbackNames = stats.winbackRecipientsToday
    .map(r => `${r.name.split(' ')[0]} (${r.daysInactive}d)`)
    .join(', ')

  const lines: string[] = []
  lines.push(`🎯 *${venue.name} — ${dateHuman}*`)
  lines.push('')
  lines.push('Today')
  lines.push(`✅ ${t.newSignups} new signup${t.newSignups === 1 ? '' : 's'}`)
  lines.push(`☕ ${t.visited} customer${t.visited === 1 ? '' : 's'} visited`)
  lines.push(`✉️ ${t.winbackSent} win-back email${t.winbackSent === 1 ? '' : 's'} sent`)
  lines.push('')
  if (stats.yesterdayWasClosed) {
    lines.push('Yesterday: closed')
  } else {
    lines.push(`Yesterday: ${stats.yesterday.newSignups} new · ${stats.yesterday.visited} visited · ${stats.yesterday.winbackSent} win-back`)
  }
  if (comparison) lines.push(comparison)
  lines.push('')
  if (newNames) lines.push(`🆕 ${newNames}`)
  if (winbackNames) lines.push(`📣 Win-back sent: ${winbackNames}`)
  if (newNames || winbackNames) lines.push('')
  lines.push(motiv)
  lines.push('')
  lines.push(`🔗 ${dashboardUrl}`)
  return lines.join('\n')
}

export async function sendOwnerRecap(args: {
  ownerEmail: string
  stats: VenueDayStats
  dateHuman: string
  dashboardUrl: string
}) {
  const html = buildOwnerRecapHtml(args.stats, args.dateHuman, args.dashboardUrl)
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `${args.stats.venue.name} Loyalty <${process.env.GMAIL_USER}>`,
    to: args.ownerEmail,
    subject: `Your ${args.stats.venue.name} daily recap — ${args.dateHuman}`,
    html,
  })
}

export async function sendAdminDigest(args: {
  toEmail: string
  dateHuman: string
  venues: Array<{
    stats: VenueDayStats
    whatsappBlock: string
    ownerEmailStatus: 'sent' | 'skipped-no-email' | 'skipped-closed' | 'skipped-opted-out' | 'failed'
    ownerEmail: string | null
  }>
  sentAtBerlin: string
}) {
  const totalReporting = args.venues.length
  const blocks = args.venues.map((v, idx) => {
    const venue = v.stats.venue
    const number = idx + 1
    const status =
      v.ownerEmailStatus === 'sent'
        ? `email: ${v.ownerEmail} — ✓ Sent`
        : v.ownerEmailStatus === 'skipped-no-email'
          ? `email: not set — ⚠ Email skipped`
          : v.ownerEmailStatus === 'skipped-closed'
            ? `email: skipped (closed today)`
            : v.ownerEmailStatus === 'skipped-opted-out'
              ? `email: opted out — ⚠ Owner not enrolled in daily recap`
              : `email: ${v.ownerEmail ?? 'unknown'} — ✗ Failed`
    const header = `═══════════════════════════════════════════════
${number}.  ${venue.name.toUpperCase()}
    ${status}
═══════════════════════════════════════════════`
    return `${header}\n\n${v.whatsappBlock}\n`
  }).join('\n\n')

  const text = `${totalReporting} venue${totalReporting === 1 ? '' : 's'} reported today. Copy each block below into WhatsApp.

${blocks}

═══════════════════════════════════════════════
END OF DIGEST · sent at ${args.sentAtBerlin} Berlin
═══════════════════════════════════════════════
`

  const transporter = createTransporter()
  await transporter.sendMail({
    from: `LY Daily Digest <${process.env.GMAIL_USER}>`,
    to: args.toEmail,
    subject: `LY Daily Digest — ${args.dateHuman} · ${totalReporting} venue${totalReporting === 1 ? '' : 's'}`,
    text,
  })
}
