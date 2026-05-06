import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getCustomerByUniqueId } from '@/lib/supabase'
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

  const cookieStore = await cookies()
  const isCashier = cookieStore.get('is_cashier')?.value === 'true'

  if (isCashier) {
    return <CashierView customer={customer} uniqueId={unique_id} />
  }

  return <CustomerCardView customer={customer} uniqueId={unique_id} />
}
