'use client'

import { useActionState } from 'react'
import { registerCustomer } from '@/app/actions'
import { Loader2 } from 'lucide-react'

export default function RegisterForm() {
  const [state, action, isPending] = useActionState(registerCustomer, null)

  if (state?.success) {
    return (
      <div className="text-center py-6">
        <div className="text-6xl mb-4">📬</div>
        <h2 className="text-xl font-bold text-stone-800 mb-2">Welcome, {state.name}!</h2>
        <p className="text-stone-500 text-sm leading-relaxed">
          Your stamp card has been sent to your inbox.
          <br />Open it and save it — show it on every visit.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
          Name
        </label>
        <input
          name="name"
          type="text"
          required
          placeholder="Your first name"
          className="w-full px-4 py-3.5 rounded-2xl border border-stone-200 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base bg-stone-50"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="your@email.com"
          className="w-full px-4 py-3.5 rounded-2xl border border-stone-200 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base bg-stone-50"
        />
      </div>

      {state?.error && (
        <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 px-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating your card…
          </>
        ) : (
          'Get My Stamp Card ☕'
        )}
      </button>
    </form>
  )
}
