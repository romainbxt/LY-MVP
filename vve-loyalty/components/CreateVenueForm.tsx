'use client'

import { useActionState, useState } from 'react'
import { createVenueAction } from '@/app/admin/actions'
import { WEEKDAY_LABELS, BIRTHDAY_DEFAULT_OFFER, BIRTHDAY_DEFAULT_EXPIRY_DAYS, BIRTHDAY_DEFAULT_QUIET_DAYS } from '@/lib/supabase'
import ColorPicker from '@/components/ColorPicker'
import StampIconPicker from '@/components/StampIconPicker'
import { Loader2 } from 'lucide-react'

export default function CreateVenueForm() {
  const [open, setOpen] = useState(false)
  const [state, action, isPending] = useActionState(createVenueAction, null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [rewardOnLastStamp, setRewardOnLastStamp] = useState(true)
  const [askBirthday, setAskBirthday] = useState(false)
  const [dailyRecapEnabled, setDailyRecapEnabled] = useState(false)
  const [birthdayEnabled, setBirthdayEnabled] = useState(false)
  const [closedDays, setClosedDays] = useState<Set<number>>(new Set())
  const toggleClosedDay = (d: number) => {
    setClosedDays(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

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

        <div className="bg-stone-700/50 rounded-xl p-3">
          <StampIconPicker name="stamp_icon" defaultValue="☕" />
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-white font-medium">Reward on final stamp</p>
              <p className="text-[10px] text-stone-400">Card resets automatically when last stamp is given</p>
            </div>
            <div
              onClick={() => setRewardOnLastStamp(!rewardOnLastStamp)}
              className="w-11 h-6 rounded-full relative transition-colors cursor-pointer"
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
              className="w-11 h-6 rounded-full relative transition-colors cursor-pointer"
              style={{ background: askBirthday ? '#f59e0b' : '#57534e' }}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${askBirthday ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <input type="hidden" name="ask_birthday" value={String(askBirthday)} />
          </label>
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">
            Operating Schedule
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map(d => {
              const checked = closedDays.has(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleClosedDay(d)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  style={{
                    background: checked ? '#f59e0b' : '#44403c',
                    color: checked ? '#1c1917' : '#d6d3d1',
                    borderColor: checked ? '#f59e0b' : '#57534e',
                  }}
                >
                  {WEEKDAY_LABELS[d]}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-stone-400">
            On closed days, daily recap and morning win-back emails are skipped. Stamp emails still fire normally.
          </p>
          <input type="hidden" name="closed_weekdays" value={JSON.stringify([...closedDays])} />
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">
            Daily Recap Email
          </p>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex-1 pr-3">
              <p className="text-sm text-white font-medium">Send daily recap to owner at 8pm Berlin</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Only turn on if the owner has explicitly agreed to receive operational emails.</p>
            </div>
            <div
              onClick={() => setDailyRecapEnabled(!dailyRecapEnabled)}
              className="w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0"
              style={{ background: dailyRecapEnabled ? '#f59e0b' : '#57534e' }}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dailyRecapEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <input type="hidden" name="daily_recap_enabled" value={String(dailyRecapEnabled)} />
          </label>
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">
            Birthday Emails
          </p>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex-1 pr-3">
              <p className="text-sm text-white font-medium">Send birthday email at 8am Berlin on customer's birthday</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Only effective for customers who provided a birthday at registration. Off by default.</p>
            </div>
            <div
              onClick={() => setBirthdayEnabled(!birthdayEnabled)}
              className="w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0"
              style={{ background: birthdayEnabled ? '#f59e0b' : '#57534e' }}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${birthdayEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <input type="hidden" name="birthday_email_enabled" value={String(birthdayEnabled)} />
          </label>
          <div className="space-y-2 pt-1">
            <div>
              <label className="block text-[10px] text-stone-400 mb-1">Birthday offer text</label>
              <input
                name="birthday_offer"
                type="text"
                defaultValue={BIRTHDAY_DEFAULT_OFFER}
                placeholder={BIRTHDAY_DEFAULT_OFFER}
                className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-stone-400 mb-1">Offer valid for (days)</label>
                <input
                  name="birthday_offer_expiry_days"
                  type="number"
                  min="1"
                  max="365"
                  defaultValue={BIRTHDAY_DEFAULT_EXPIRY_DAYS}
                  className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-stone-400 mb-1">Birthday quiet days</label>
                <input
                  name="birthday_quiet_days"
                  type="number"
                  min="0"
                  max="30"
                  defaultValue={BIRTHDAY_DEFAULT_QUIET_DAYS}
                  className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <p className="text-[10px] text-stone-400">
              Win-back emails pause for "quiet days" before AND after the birthday. Set quiet days to 0 to disable the pre-birthday pause.
            </p>
          </div>
        </div>

        <div className="bg-stone-700/50 rounded-xl p-3 space-y-3">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">
            Legal & Contact (required for email compliance)
          </p>
          <input
            name="legal_name"
            type="text"
            placeholder="Legal business name (e.g. Flussbad Berlin e.V.)"
            className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            name="address_street"
            type="text"
            placeholder="Street + number (e.g. Wrangelstr. 81)"
            className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-3">
            <input
              name="address_postcode"
              type="text"
              placeholder="Postcode"
              className="w-24 px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              name="address_city"
              type="text"
              placeholder="City"
              className="flex-1 px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <input
            name="register_court"
            type="text"
            placeholder="Register (e.g. Handelsregister Amtsgericht Charlottenburg)"
            className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            name="register_number"
            type="text"
            placeholder="Register number (e.g. HRB 252024 B or VR 31234 B)"
            className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            name="owner_email"
            type="email"
            placeholder="Owner reply email (replies to loyalty emails go here)"
            className="w-full px-4 py-3 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

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
