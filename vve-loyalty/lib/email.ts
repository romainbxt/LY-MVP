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
}): string {
  const safeName = escapeHtml(name)
  const safeVenue = escapeHtml(venueName)
  const safeOffer = escapeHtml(offer)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(scanUrl)}`

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
    html: buildWinBackHtml({ name, subject, offer, logoUrl, venueName, brandColor, backgroundColor: bgColor, scanUrl, legal, unsubscribeUrl }),
  })
}
