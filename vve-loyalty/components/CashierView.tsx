'use client'

import { useActionState } from 'react'
import { stampCustomer } from '@/app/actions'
import type { Customer, Venue } from '@/lib/supabase'

export default function CashierView({
  customer,
  uniqueId,
  venue,
}: {
  customer: Customer
  uniqueId: string
  venue: Venue | null
}) {
  const brand = venue?.brand_color ?? '#D97706'
  const rewards = venue?.rewards ?? [{ stamp: 10, label: 'Reward 🎁' }]
  const totalStamps = rewards[rewards.length - 1]?.stamp ?? 10

  const boundStamp = stampCustomer.bind(null, uniqueId)
  const [state, action, isPending] = useActionState(boundStamp, null)

  if (state?.success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: brand }}>
        <div className="text-center text-white mb-8">
          <div className="text-[96px] leading-none mb-4">✓</div>
          <h1 className="text-5xl font-black mb-3">SUCCESS!</h1>
          <p className="text-2xl font-semibold">+1 Stamp for {state.name}</p>
          <p className="text-xl opacity-75 mt-1">
            {state.newCount} / {state.totalStamps ?? totalStamps} stamps
          </p>
        </div>

        {state.reward && (
          <div className="w-full max-w-xs bg-white text-stone-900 rounded-3xl p-8 text-center">
            <p className="text-4xl font-black mb-2">🎉 REWARD!</p>
            <p className="text-2xl font-bold mb-1">{state.reward}</p>
            <p className="text-lg font-semibold uppercase tracking-wider">Give to customer NOW</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6">
      <div className="text-center text-white mb-10">
        <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">Ready to stamp</p>
        <h1 className="text-4xl font-bold mb-4">{customer.name}</h1>

        <div className="flex items-center justify-center gap-1.5 mb-3 flex-wrap max-w-xs mx-auto">
          {Array.from({ length: totalStamps }).map((_, i) => {
            const stampNum = i + 1
            const isReward = rewards.some(r => r.stamp === stampNum)
            return (
              <div
                key={i}
                className="w-5 h-5 rounded-full transition-colors flex items-center justify-center text-[8px]"
                style={{ background: i < customer.stamp_count ? brand : '#44403c' }}
                title={isReward ? rewards.find(r => r.stamp === stampNum)?.label : undefined}
              >
                {isReward && i >= customer.stamp_count ? '★' : ''}
              </div>
            )
          })}
        </div>
        <p className="text-stone-400 text-base">{customer.stamp_count} / {totalStamps} stamps</p>

        {rewards.length > 0 && (
          <p className="text-stone-500 text-xs mt-2">
            Next reward at {rewards.find(r => r.stamp > customer.stamp_count)?.stamp ?? totalStamps} stamps
          </p>
        )}
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm mb-6 text-center">{state.error}</p>
      )}

      <form action={action} className="w-full max-w-xs">
        <button
          type="submit"
          disabled={isPending || customer.stamp_count >= totalStamps}
          style={{ background: brand }}
          className="w-full active:scale-95 transition-transform text-white text-3xl font-black py-10 rounded-3xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? '…'
            : customer.stamp_count >= totalStamps
            ? 'CARD COMPLETE ✓'
            : '+ ADD STAMP'}
        </button>
      </form>
    </div>
  )
}
