import { updateSubscriptionPreference, getCustomerByUniqueId } from '@/lib/supabase'
import { verifyToken } from '@/lib/hmac'

async function handle(uniqueId: string, sig: string | null) {
  if (!sig || !verifyToken(uniqueId, sig)) {
    return new Response('Invalid signature', { status: 401 })
  }

  const customer = await getCustomerByUniqueId(uniqueId)
  if (!customer) {
    return new Response('Not found', { status: 404 })
  }

  const ok = await updateSubscriptionPreference(uniqueId, 'transactional_only')
  if (!ok) {
    return new Response('Failed to unsubscribe', { status: 500 })
  }

  return new Response('Unsubscribed from marketing emails', { status: 200 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ unique_id: string }> }
) {
  const { unique_id } = await params
  const { searchParams } = new URL(request.url)
  const sig = searchParams.get('sig')
  return handle(unique_id, sig)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ unique_id: string }> }
) {
  const { unique_id } = await params
  const { searchParams } = new URL(request.url)
  const sig = searchParams.get('sig')
  return handle(unique_id, sig)
}
