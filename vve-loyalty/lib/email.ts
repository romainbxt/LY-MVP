import nodemailer from 'nodemailer'

const REWARDS: Record<number, string> = {
  3: 'Free Cookie 🍪',
  6: 'Free Matcha 🍵',
  10: 'Free Toast 🍞',
}

function buildStampCell(num: number, stampCount: number): string {
  const filled = num <= stampCount
  const reward = REWARDS[num]
  const earned = filled && reward ? ' (Earned!)' : ''
  const circleBg = filled ? '#C9A227' : '#f0ece4'
  const circleText = filled ? '#ffffff' : '#c0b8a8'
  const labelColor = filled ? '#C9A227' : '#c0b8a8'
  const label = reward ? `${reward}${earned}` : ''

  return `<td style="text-align:center;vertical-align:top;padding:4px;">
    <div style="width:52px;height:52px;border-radius:50%;background:${circleBg};line-height:52px;text-align:center;font-size:${filled ? '20px' : '14px'};font-weight:700;color:${circleText};margin:0 auto 4px;">${filled ? '☕' : String(num)}</div>
    <div style="font-size:9px;color:${labelColor};text-align:center;width:56px;font-weight:600;line-height:1.3;min-height:12px;">${label}</div>
  </td>`
}

function buildEmailHtml({
  name,
  stampCount,
  qrDataUrl,
  logoUrl,
}: {
  name: string
  stampCount: number
  qrDataUrl: string
  logoUrl: string
}): string {
  const row1 = [1, 2, 3, 4, 5].map(n => buildStampCell(n, stampCount)).join('')
  const row2 = [6, 7, 8, 9, 10].map(n => buildStampCell(n, stampCount)).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f0e6">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" border="0">

      <tr><td align="center" style="padding-bottom:20px;">
        <img src="https://lvcmxhnrxcazejverpir.supabase.co/storage/v1/object/public/public-assets/vve%20cafe%20logo.jpg" alt="VVE Cafe" width="90" height="90" style="border-radius:12px;display:block;margin:0 auto;" />
      </td></tr>

      <tr><td align="center" style="padding-bottom:28px;">
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1a1a1a;">Hi ${name}! &#9749;</h1>
        <p style="margin:0;font-size:16px;color:#666666;">
          You have <span style="color:#C9A227;font-weight:700;">${stampCount} stamp${stampCount !== 1 ? 's' : ''}</span> — keep coming back!
        </p>
      </td></tr>

      <tr><td align="center" style="padding-bottom:28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px 16px;">
          <tr><td align="center" style="padding-bottom:16px;">
            <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#aaaaaa;font-weight:600;">Your Stamp Card</p>
          </td></tr>
          <tr><td align="center">
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
              <tr>${row1}</tr>
            </table>
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>${row2}</tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding-bottom:32px;">
        <table cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px;">
          <tr><td align="center">
            <img src="${qrDataUrl}" alt="Your QR Code" width="180" height="180" style="display:block;margin:0 auto 12px;" />
            <p style="margin:0;font-size:13px;color:#888888;font-weight:500;">Present this QR code at checkout</p>
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center">
        <p style="margin:0;font-size:11px;color:#bbbbbb;">VVE Cafe Rewards &bull; Powered by LY Loyalty</p>
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
  daysSince,
}: {
  name: string
  stampCount: number
  qrDataUrl: string
  logoUrl: string
  daysSince?: number
}): string {
  const row1 = [1, 2, 3, 4, 5].map(n => buildStampCell(n, stampCount)).join('')
  const row2 = [6, 7, 8, 9, 10].map(n => buildStampCell(n, stampCount)).join('')
  const stampsLeft = 10 - stampCount
  const missYouLine = daysSince ? `It's been ${daysSince} days since your last visit.` : `We haven't seen you in a while.`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f0e6">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0" border="0">

      <tr><td align="center" style="padding-bottom:20px;">
        <img src="https://lvcmxhnrxcazejverpir.supabase.co/storage/v1/object/public/public-assets/vve%20cafe%20logo.jpg" alt="VVE Cafe" width="90" height="90" style="border-radius:12px;display:block;margin:0 auto;" />
      </td></tr>

      <tr><td align="center" style="padding-bottom:28px;">
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1a1a1a;">We miss you, ${name}! &#9749;</h1>
        <p style="margin:0 0 6px;font-size:16px;color:#666666;">${missYouLine}</p>
        <p style="margin:0;font-size:16px;color:#666666;">
          Your stamp card has <span style="color:#C9A227;font-weight:700;">${stampCount} stamp${stampCount !== 1 ? 's' : ''}</span> — only <strong>${stampsLeft}</strong> more to your next reward!
        </p>
      </td></tr>

      <tr><td align="center" style="padding-bottom:28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px 16px;">
          <tr><td align="center" style="padding-bottom:16px;">
            <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#aaaaaa;font-weight:600;">Your Stamp Card</p>
          </td></tr>
          <tr><td align="center">
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
              <tr>${row1}</tr>
            </table>
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>${row2}</tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center" style="padding-bottom:32px;">
        <table cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;padding:24px;">
          <tr><td align="center">
            <img src="${qrDataUrl}" alt="Your QR Code" width="180" height="180" style="display:block;margin:0 auto 12px;" />
            <p style="margin:0;font-size:13px;color:#888888;font-weight:500;">Show this QR at checkout to collect your stamp</p>
          </td></tr>
        </table>
      </td></tr>

      <tr><td align="center">
        <p style="margin:0;font-size:11px;color:#bbbbbb;">VVE Cafe Rewards &bull; Powered by LY Loyalty</p>
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

export async function sendReengagementEmail({
  name,
  email,
  stampCount,
  scanUrl,
  logoUrl,
  daysSince,
}: {
  name: string
  email: string
  stampCount: number
  scanUrl: string
  logoUrl: string
  daysSince?: number
}) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(scanUrl)}`
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `VVE Cafe Rewards <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `We miss you at VVE Cafe, ${name}! ☕`,
    html: buildReengagementHtml({ name, stampCount, qrDataUrl: qrImageUrl, logoUrl, daysSince }),
  })
}

export async function sendStampCardEmail({
  name,
  email,
  stampCount,
  scanUrl,
  logoUrl,
}: {
  name: string
  email: string
  stampCount: number
  scanUrl: string
  logoUrl: string
}) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(scanUrl)}`
  const transporter = createTransporter()
  await transporter.sendMail({
    from: `VVE Cafe Rewards <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your VVE Cafe Stamp Card ☕',
    html: buildEmailHtml({ name, stampCount, qrDataUrl: qrImageUrl, logoUrl }),
  })
}
