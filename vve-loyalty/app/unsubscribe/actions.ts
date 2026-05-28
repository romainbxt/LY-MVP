'use server'

import {
  getCustomerByUniqueId,
  updateSubscriptionPreference,
  deleteCustomer,
  type SubscriptionPreference,
} from '@/lib/supabase'
import { verifyToken } from '@/lib/hmac'

export type UnsubscribeState =
  | { success: true; preference: SubscriptionPreference }
  | { error: string }
  | null

export async function savePreferenceAction(
  uniqueId: string,
  signature: string,
  prevState: UnsubscribeState,
  formData: FormData
): Promise<UnsubscribeState> {
  if (!verifyToken(uniqueId, signature)) {
    return { error: 'Invalid link.' }
  }

  const raw = formData.get('preference') as string | null
  if (raw !== 'all' && raw !== 'transactional_only' && raw !== 'none') {
    return { error: 'Invalid preference.' }
  }

  const customer = await getCustomerByUniqueId(uniqueId)
  if (!customer) return { error: 'Customer not found.' }

  const ok = await updateSubscriptionPreference(uniqueId, raw)
  if (!ok) return { error: 'Failed to save. Please try again.' }

  return { success: true, preference: raw }
}

export type DeleteAccountState = { success?: boolean; error?: string } | null

export async function deleteAccountAction(
  uniqueId: string,
  signature: string,
  prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  if (!verifyToken(uniqueId, signature)) {
    return { error: 'Invalid link.' }
  }

  const customer = await getCustomerByUniqueId(uniqueId)
  if (!customer) return { error: 'Customer not found.' }

  const ok = await deleteCustomer(uniqueId)
  if (!ok) return { error: 'Failed to delete. Please try again.' }

  return { success: true }
}
