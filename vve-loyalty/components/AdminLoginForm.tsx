'use client'

import { useActionState } from 'react'
import { adminLogin } from '@/app/admin/actions'
import { Loader2, Lock } from 'lucide-react'

export default function AdminLoginForm() {
  const [state, action, isPending] = useActionState(adminLogin, null)

  return (
    <main className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-stone-400" />
          </div>
          <h1 className="text-white text-2xl font-bold mb-1">Admin</h1>
          <p className="text-stone-500 text-sm">LY Back Office</p>
        </div>
        <div className="bg-stone-900 rounded-3xl p-6 shadow-xl border border-stone-800">
          <form action={action} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                autoFocus
                placeholder="Admin password"
                className="w-full px-4 py-3.5 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base"
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
                'Enter'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
