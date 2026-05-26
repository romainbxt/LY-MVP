'use client'

import { useActionState, useState } from 'react'
import { updateVenueAction } from '@/app/admin/actions'
import type { Venue } from '@/lib/supabase'
import ColorPicker from '@/components/ColorPicker'
import StampIconPicker from '@/components/StampIconPicker'
import StampOverridePicker from '@/components/StampOverridePicker'
import { Loader2 } from 'lucide-react'

function rewardsToText(rewards: Venue['rewards']): string {
  return rewards.map(r => `${r.stamp} = ${r.label}`).join('\n')
}

export default function EditVenueForm({ venue }: { venue: Venue }) {
  const [open, setOpen] = useState(false)
  const boundAction = updateVenueAction.bind(null, venue.id)
  const [state, action, isPending] = useActionState(boundAction, null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [rewardOnLastStamp, setRewardOnLastStamp] = useState(venue.reward_on_last_stamp ?? true)
  const [askBirthday, setAskBirthday] = useState(venue.ask_birthday ?? false)
  const totalStamps = venue.rewards[venue.rewards.length - 1]?.stamp ?? 10

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
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {(logoPreview ?? venue.logo_url) && (
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-1 shrink-0">
                <img src={logoPreview ?? venue.logo_url!} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <label className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 cursor-pointer hover:border-amber-400 transition-colors">
              <span className="text-amber-400 text-xs font-semibold shrink-0">
                {venue.logo_url ? 'Replace Logo' : 'Upload Logo'}
              </span>
              <span className="text-stone-500 text-xs truncate">
                {logoPreview ? 'New image selected' : 'PNG or JPG'}
              </span>
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
        </div>
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

        <div className="bg-stone-700/50 rounded-xl p-3">
          <StampIconPicker name="stamp_icon" defaultValue={venue.stamp_icon ?? '☕'} />
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3">
          <StampOverridePicker
            name="stamp_overrides"
            totalStamps={totalStamps}
            defaultIcon={venue.stamp_icon ?? '☕'}
            defaultOverrides={venue.stamp_overrides ?? []}
          />
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-white font-medium">Reward on final stamp</p>
              <p className="text-[10px] text-stone-400">Card resets automatically when last stamp is given</p>
            </div>
            <div
              onClick={() => setRewardOnLastStamp(!rewardOnLastStamp)}
              className="w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0"
              style={{ background: rewardOnLastStamp ? '#f59e0b' : '#57534e' }}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rewardOnLastStamp ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <input type="hidden" name="reward_on_last_stamp" value={String(rewardOnLastStamp)} />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-white font-medium">Ask for birthday</p>
              <p className="text-[10px] text-stone-400">Show birthday field on customer registration</p>
            </div>
            <div
              onClick={() => setAskBirthday(!askBirthday)}
              className="w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0"
              style={{ background: askBirthday ? '#f59e0b' : '#57534e' }}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${askBirthday ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <input type="hidden" name="ask_birthday" value={String(askBirthday)} />
          </label>
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">
            Legal & Contact (shown in email footer)
          </p>
          <input
            name="legal_name"
            type="text"
            defaultValue={venue.legal_name ?? ''}
            placeholder="Legal business name (e.g. Flussbad Berlin e.V.)"
            className="w-full px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            name="address_street"
            type="text"
            defaultValue={venue.address_street ?? ''}
            placeholder="Street + number"
            className="w-full px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2">
            <input
              name="address_postcode"
              type="text"
              defaultValue={venue.address_postcode ?? ''}
              placeholder="Postcode"
              className="w-24 px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              name="address_city"
              type="text"
              defaultValue={venue.address_city ?? ''}
              placeholder="City"
              className="flex-1 px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <input
            name="register_court"
            type="text"
            defaultValue={venue.register_court ?? ''}
            placeholder="Register (e.g. Handelsregister Amtsgericht Charlottenburg)"
            className="w-full px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            name="register_number"
            type="text"
            defaultValue={venue.register_number ?? ''}
            placeholder="Register number (e.g. HRB 252024 B or VR 31234 B)"
            className="w-full px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            name="owner_email"
            type="email"
            defaultValue={venue.owner_email ?? ''}
            placeholder="Owner reply email"
            className="w-full px-3 py-2.5 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

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
