'use client'

import { useActionState } from 'react'
import { stampCustomer } from '@/app/actions'
import type { Customer } from '@/lib/supabase'

export default function CashierView({
  customer,
  uniqueId,
}: {
  customer: Customer
  uniqueId: string
}) {
  const boundStamp = stampCustomer.bind(null, uniqueId)
  const [state, action, isPending] = useActionState(boundStamp, null)

  if (state?.success) {
    return (
      <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center p-6">
        <div className="text-center text-white mb-8">
          <div className="text-[96px] leading-none mb-4">✓</div>
          <h1 className="text-5xl font-black mb-3">SUCCESS!</h1>
          <p className="text-2xl font-semibold">+1 Stamp for {state.name}</p>
          <p className="text-xl opacity-75 mt-1">{state.newCount} / 10 stamps</p>
        </div>

        {state.reward && (
          <div className="w-full max-w-xs bg-yellow-400 text-stone-900 rounded-3xl p-8 text-center animate-flash">
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

        <div className="flex items-center justify-center gap-1.5 mb-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full transition-colors ${
                i < customer.stamp_count ? 'bg-amber-400' : 'bg-stone-700'
              }`}
            />
          ))}
        </div>
        <p className="text-stone-400 text-base">{customer.stamp_count} / 10 stamps</p>
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm mb-6 text-center">{state.error}</p>
      )}

      <form action={action} className="w-full max-w-xs">
        <button
          type="submit"
          disabled={isPending || customer.stamp_count >= 10}
          className="w-full bg-amber-500 active:scale-95 transition-transform text-white text-3xl font-black py-10 rounded-3xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? '…'
            : customer.stamp_count >= 10
            ? 'CARD COMPLETE ✓'
            : '+ ADD STAMP'}
        </button>
      </form>
    </div>
  )
}
