'use client'

import { useActionState, useState } from 'react'
import { createVenueAction } from '@/app/admin/actions'
import { Loader2 } from 'lucide-react'

export default function CreateVenueForm() {
  const [open, setOpen] = useState(false)
  const [state, action, isPending] = useActionState(createVenueAction, null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-2xl text-sm transition-all"
      >
        + Add New Venue
      </button>
    )
  }

  return (
    <div className="bg-stone-800 rounded-2xl p-5 border border-stone-700">
      <h2 className="text-white font-bold text-base mb-4">New Venue</h2>
      <form action={action} className="space-y-3">
        <input
          name="slug"
          type="text"
          required
          placeholder="slug (e.g. vve, ebe-ano)"
          className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          name="name"
          type="text"
          required
          placeholder="Venue name"
          className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          name="logo_url"
          type="url"
          placeholder="Logo URL (optional)"
          className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              name="brand_color"
              type="text"
              defaultValue="#D97706"
              placeholder="Brand color (#hex)"
              className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <input
            name="cashier_password"
            type="text"
            required
            placeholder="Cashier password"
            className="flex-1 px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <textarea
          name="rewards"
          rows={3}
          placeholder={`Rewards (optional) — one per line:\n3 = Free Cookie 🍪\n6 = Free Drink ☕\n10 = Free Meal 🍽️`}
          className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />

        {state?.error && (
          <p className="text-red-400 text-xs">{state.error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Venue'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-stone-400 hover:text-stone-300 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
