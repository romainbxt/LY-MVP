'use client'

import { useActionState, useState } from 'react'
import { updateVenueAction } from '@/app/admin/actions'
import type { Venue } from '@/lib/supabase'
import ColorPicker from '@/components/ColorPicker'
import { Loader2 } from 'lucide-react'

function rewardsToText(rewards: Venue['rewards']): string {
  return rewards.map(r => `${r.stamp} = ${r.label}`).join('\n')
}

export default function EditVenueForm({ venue }: { venue: Venue }) {
  const [open, setOpen] = useState(false)
  const boundAction = updateVenueAction.bind(null, venue.id)
  const [state, action, isPending] = useActionState(boundAction, null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
      >
        Edit
      </button>
    )
  }

  return (
    <div className="mt-3 bg-stone-800 rounded-xl p-4 border border-stone-700">
      <h3 className="text-white text-sm font-semibold mb-3">Edit {venue.name}</h3>
      <form action={action} className="space-y-2.5">
        <input
          name="name"
          type="text"
          defaultValue={venue.name}
          placeholder="Venue name"
          className="w-full px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          name="logo_url"
          type="url"
          defaultValue={venue.logo_url ?? ''}
          placeholder="Logo URL"
          className="w-full px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="flex gap-2">
          <input
            name="brand_color"
            type="text"
            defaultValue={venue.brand_color}
            placeholder="#hex color"
            className="flex-1 px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            name="cashier_password"
            type="text"
            placeholder="New password (leave blank to keep)"
            className="flex-1 px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="bg-stone-700/50 rounded-xl p-3">
          <ColorPicker
            name="background_color"
            label="Registration page background"
            defaultValue={venue.background_color}
          />
        </div>

        <textarea
          name="rewards"
          rows={venue.rewards.length + 1}
          defaultValue={rewardsToText(venue.rewards)}
          placeholder={'3 = Free Cookie 🍪\n6 = Free Drink ☕\n10 = Free Meal 🍽️'}
          className="w-full px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none font-mono"
        />

        {state?.error && (
          <p className="text-red-400 text-xs">{state.error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2.5 text-stone-400 hover:text-stone-300 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
