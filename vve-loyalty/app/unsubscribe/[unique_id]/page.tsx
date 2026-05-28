import { notFound } from 'next/navigation'
import { getCustomerByUniqueId, getVenueById, preferenceFromCustomer } from '@/lib/supabase'
import { verifyToken } from '@/lib/hmac'
import UnsubscribeForm from '@/components/UnsubscribeForm'

export const dynamic = 'force-dynamic'

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ unique_id: string }>
  searchParams: Promise<{ sig?: string }>
}) {
  const { unique_id } = await params
  const { sig } = await searchParams

  if (!sig || !verifyToken(unique_id, sig)) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '40px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', background: '#ffffff', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px' }}>Invalid link</h1>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
            This unsubscribe link is invalid or expired. Please use the link from a recent email.
          </p>
        </div>
      </div>
    )
  }

  const customer = await getCustomerByUniqueId(unique_id)
  if (!customer) notFound()

  const venue = customer.venue_id ? await getVenueById(customer.venue_id) : null
  const currentPreference = preferenceFromCustomer(customer)
  const venueName = venue?.name ?? 'Your loyalty card'
  const brandColor = venue?.brand_color ?? '#D97706'
  const logoUrl = venue?.logo_url ?? null

  return (
    <UnsubscribeForm
      uniqueId={unique_id}
      signature={sig}
      currentPreference={currentPreference}
      customerName={customer.name}
      customerEmail={customer.email}
      stampCount={customer.stamp_count}
      totalStamps={venue?.rewards[venue.rewards.length - 1]?.stamp ?? 10}
      venueName={venueName}
      brandColor={brandColor}
      logoUrl={logoUrl}
    />
  )
}
