import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getCustomerByUniqueId, getVenueById, getActiveVouchersForCustomer } from '@/lib/supabase'
import CashierView from '@/components/CashierView'
import CustomerCardView from '@/components/CustomerCardView'

export default async function ScanPage({
  params,
}: {
  params: Promise<{ unique_id: string }>
}) {
  const { unique_id } = await params

  const customer = await getCustomerByUniqueId(unique_id)
  if (!customer) notFound()

  const venue = customer.venue_id ? await getVenueById(customer.venue_id) : null
  const slug = venue?.slug ?? 'unknown'

  const cookieStore = await cookies()
  const isCashier = cookieStore.get(`cashier_${slug}`)?.value === 'true'

  if (isCashier) {
    const activeVouchers = await getActiveVouchersForCustomer(customer.id)
    return <CashierView customer={customer} uniqueId={unique_id} venue={venue} activeVouchers={activeVouchers} />
  }

  return <CustomerCardView customer={customer} uniqueId={unique_id} venue={venue} />
}
