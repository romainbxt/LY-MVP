'use server'

import { sendLandingLeadEmail } from '@/lib/email'

const LEAD_RECIPIENT = process.env.LEAD_NOTIFICATION_EMAIL || 'gzelenitsas@gmail.com'

export type LeadFormState = { success?: boolean; error?: string } | null

export async function submitLandingLead(
  prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const cafeName = (formData.get('cafe_name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const phone = (formData.get('phone') as string)?.trim()
  const message = (formData.get('message') as string)?.trim() || undefined
  const honeypot = (formData.get('website') as string)?.trim() // bots will fill this; humans won't see it

  if (honeypot) {
    // Bots get a fake success so they don't retry
    return { success: true }
  }

  if (!cafeName || !email || !phone) {
    return { error: 'Please fill in your café/restaurant name, email, and phone.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }
  if (phone.replace(/\D/g, '').length < 6) {
    return { error: 'Please enter a valid phone number.' }
  }

  try {
    await sendLandingLeadEmail({
      toEmail: LEAD_RECIPIENT,
      cafeName,
      email,
      phone,
      message,
    })
    return { success: true }
  } catch (e) {
    console.error('[Landing Lead] Failed to send email:', e)
    return { error: 'Something went wrong. Please try again or email us directly.' }
  }
}
