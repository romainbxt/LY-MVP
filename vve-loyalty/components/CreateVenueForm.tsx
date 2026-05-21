'use client'

import { useActionState, useState } from 'react'
import { createVenueAction } from '@/app/admin/actions'
import ColorPicker from '@/components/ColorPicker'
import { Loader2 } from 'lucide-react'

export default function CreateVenueForm() {
  const [open, setOpen] = useState(false)
  const [state, action, isPending] = useActionState(createVenueAction, null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

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
        <div className="space-y-2">
          {logoPreview && (
            <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center p-1.5">
              <img src={logoPreview} alt="Preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 cursor-pointer hover:border-amber-400 transition-colors">
            <span className="text-amber-400 text-sm font-semibold shrink-0">Choose Logo</span>
            <span className="text-stone-500 text-sm truncate">{logoPreview ? 'Image selected' : 'Optional — PNG or JPG'}</span>
            <input
              type="file"
              name="logo"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) setLogoPreview(URL.createObjectURL(file))
              }}
            />
          </label>
        </div>
        <div className="flex gap-3">
          <input
            name="brand_color"
            type="text"
            defaultValue="#D97706"
            placeholder="Brand color (#hex)"
            className="flex-1 px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            name="cashier_password"
            type="text"
            required
            placeholder="Cashier password"
            className="flex-1 px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3">
          <ColorPicker
            name="background_color"
            label="Registration page background"
            defaultValue={null}
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
