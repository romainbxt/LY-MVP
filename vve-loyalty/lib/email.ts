import nodemailer from 'nodemailer'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildStampCell(
  num: number,
  stampCount: number,
  brandColor: string,
  rewardLabel?: string
): string {
  const filled = num <= stampCount
  const circleBg = filled ? brandColor : '#f0ece4'
  const circleText = filled ? '#ffffff' : '#c0b8a8'
  const labelColor = filled ? brandColor : '#c0b8a8'
  const displayLabel = rewardLabel && filled ? `${rewardLabel} ✓` : (rewardLabel ?? '')

  return `<td style="text-align:center;vertical-align:top;padding:4px;">
    <div style="width:52px;height:52px;border-radius:50%;background:${circleBg};line-height:52px;text-align:center;font-size:${filled ? '18px' : '14px'};font-weight:700;color:${circleText};margin:0 auto 4px;">${filled ? '✓' : String(num)}</div>
    <div style="font-size:9px;color:${labelColor};text-align:center;width:56px;font-weight:600;line-height:1.3;min-height:12px;">${escapeHtml(displayLabel)}</div>
  </td>`
}

function buildStampRows(
  stampCount: number,
  totalStamps: number,
  brandColor: string,
  rewards: Array<{ stamp: number; label: string }>
): string {
  const rewardMap = Object.fromEntries(rewards.map(r => [r.stamp, r.label]))
  const all = Array.from({ length: totalStamps }, (_, i) => i + 1)
  const cols = Math.min(totalStamps, 5)
  const rows: string[] = []

  for (let i = 0; i < all.length; i += cols) {
    const cells = all.slice(i, i + cols)
      .map(n => buildStampCell(n, stampCount, brandColor, rewardMap[n]))
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
  totalStamps,
  rewards,
}: {
  name: string
  stampCount: number
  qrDataUrl: string
  logoUrl: string
  venueName: string
  brandColor: string
  totalStamps: number
  rewards: Array<{ stamp: number; label: string }>
}): string {
  const safeName = escapeHtml(name)
  const safeVenue = escapeHtml(venueName)
  const stampRows = buildStampRows(stampCount, totalStamps, brandColor, rewards)
  const nextReward = rewards.find(r => r.stamp > stampCount)
  const stampsToGo = nextReward ? nextReward.stamp - stampCount : 0
  const progressLine = nextReward
    ? `${stampsToGo} more stamp${stampsToGo !== 1 ? 's' : ''} to <strong>${escapeHtml(nextReward.label)}</strong>`
    : `You've completed your card — claim your reward!`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f0e6">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" border="0">

      ${logoUrl ? `<tr><td align="center" style="padding-bottom:20px;">
        <img src="${logoUrl}" alt="${safeVenue}" width="90" height="90" style="border-radius:12px;display:block;margin:0 auto;object-fit:cover;" />
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

      <tr><td align="center">
        <p style="margin:0;font-size:11px;color:#bbbbbb;">${safeVenue} &bull; Powered by LY Loyalty</p>
      </td></tr>

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
  totalStamps,
  rewards,
  daysSince,
  offer,
}: {
  name: string
  stampCount: number
  qrDataUrl: string
  logoUrl: string
  venueName: string
  brandColor: string
  totalStamps: number
  rewards: Array<{ stamp: number; label: string }>
  daysSince?: number
  offer?: string
}): string {
  const safeName = escapeHtml(name)
  const safeVenue = escapeHtml(venueName)
  const safeOffer = offer ? escapeHtml(offer) : undefined
  const stampRows = buildStampRows(stampCount, totalStamps, brandColor, rewards)
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
<body style="margin:0;padding:0;background:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f0e6">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" border="0">

      ${logoUrl ? `<tr><td align="center" style="padding-bottom:20px;">
        <img src="${logoUrl}" alt="${safeVenue}" width="90" height="90" style="border-radius:12px;display:block;margin:0 auto;object-fit:cover;" />
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

      <tr><td align="center">
        <p style="margin:0;font-size:11px;color:#bbbbbb;">${safeVenue} &bull; Powered by LY Loyalty</p>
      </td></tr>

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
  totalStamps,
  rewards,
}: {
  name: string
  email: string
  stampCount: number
  scanUrl: string
  logoUrl: string
  venueName: string
  brandColor: string
  totalStamps: number
  rewards: Array<{ stamp: number; label: string }>
}) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(scanUrl)}`
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `${venueName} Loyalty <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Your ${venueName} Stamp Card`,
    html: buildEmailHtml({ name, stampCount, qrDataUrl: qrImageUrl, logoUrl, venueName, brandColor, totalStamps, rewards }),
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
  totalStamps,
  rewards,
  daysSince,
  offer,
}: {
  name: string
  email: string
  stampCount: number
  scanUrl: string
  logoUrl: string
  venueName: string
  brandColor: string
  totalStamps: number
  rewards: Array<{ stamp: number; label: string }>
  daysSince?: number
  offer?: string
}) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(scanUrl)}`
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `${venueName} Loyalty <${process.env.GMAIL_USER}>`,
    to: email,
    subject: offer ? `A special offer for you at ${venueName}` : `We miss you at ${venueName}, ${name}!`,
    html: buildReengagementHtml({ name, stampCount, qrDataUrl: qrImageUrl, logoUrl, venueName, brandColor, totalStamps, rewards, daysSince, offer }),
  })
}
