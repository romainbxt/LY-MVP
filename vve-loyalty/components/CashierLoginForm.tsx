'use client'

import { useActionState } from 'react'
import { cashierLogin } from '@/app/actions'
import { Loader2, Lock } from 'lucide-react'

export default function CashierLoginForm() {
  const [state, action, isPending] = useActionState(cashierLogin, null)

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
          Staff Password
        </label>
        <input
          name="password"
          type="password"
          required
          autoFocus
          placeholder="Enter password"
          className="w-full px-4 py-3.5 rounded-2xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base"
        />
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm text-center">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Unlock Scanner
          </>
        )}
      </button>
    </form>
  )
}
