'use client'

import { useActionState } from 'react'
import { redeemVoucherAction } from '@/app/actions'
import type { Voucher } from '@/lib/supabase'

function formatExpiryDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

export default function VoucherBanner({ voucher, customerName }: { voucher: Voucher; customerName: string }) {
  const boundAction = redeemVoucherAction.bind(null, voucher.id)
  const [state, action, isPending] = useActionState(boundAction, null)

  const isBirthday = voucher.type === 'birthday'
  const accent = isBirthday ? '#f59e0b' : '#0ea5e9'
  const icon = isBirthday ? '🎂' : '📣'
  const label = isBirthday ? 'BIRTHDAY GIFT AVAILABLE' : 'WIN-BACK OFFER ACTIVE'
  const givenLabel = isBirthday ? 'Birthday gift given' : 'Win-back offer given'
  const firstName = customerName.split(' ')[0]
  const verb = isBirthday ? `Give ${firstName}` : `Give them`

  if (state?.success) {
    return (
      <div
        className="rounded-2xl px-4 py-3 mb-3"
        style={{ background: `${accent}1A`, border: `1px solid ${accent}` }}
      >
        <p className="text-sm font-semibold" style={{ color: accent }}>
          ✓ {givenLabel}
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ background: `${accent}1A`, border: `2px solid ${accent}` }}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: accent }}>{label}</p>
          <p className="text-white font-semibold text-sm leading-snug">
            {verb}: <span className="font-bold">{voucher.offer_text}</span>
          </p>
          <p className="text-stone-400 text-xs mt-1">
            Valid until {formatExpiryDate(voucher.expires_at)}
          </p>
        </div>
      </div>
      <form action={action} className="mt-3">
        <button
          type="submit"
          disabled={isPending}
          className="w-full active:scale-95 transition-transform text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
          style={{ background: accent }}
        >
          {isPending ? '…' : 'Mark as given'}
        </button>
      </form>
      {state?.error && (
        <p className="text-red-400 text-xs mt-2">{state.error}</p>
      )}
    </div>
  )
}
