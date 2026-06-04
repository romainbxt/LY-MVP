'use client'

import { useActionState } from 'react'
import { submitLandingLead } from '@/app/lead-actions'

const inputClass =
  'w-full bg-white border border-hairline rounded-lg px-4 py-3 text-ink placeholder:text-muted/60 text-base focus:outline-none focus:border-honey transition-colors'
const labelClass = 'block text-[11px] uppercase tracking-[0.12em] text-muted font-medium mb-2'

export default function LandingForm() {
  const [state, action, isPending] = useActionState(submitLandingLead, null)

  if (state?.success) {
    return (
      <div className="bg-white border border-hairline rounded-2xl p-8 animate-fadeIn">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="shrink-0 w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-base font-semibold"
            aria-hidden
          >
            ✓
          </div>
          <div>
            <p className="font-serif text-2xl text-ink leading-tight">Thanks — we'll be in touch.</p>
            <p className="mt-2 text-muted text-sm leading-relaxed">
              We'll call you within 24 hours to arrange a visit and set everything up at your place.
              In the meantime, feel free to email{' '}
              <a href="mailto:gzelenitsas@gmail.com" className="text-honey hover:text-honey-deep underline underline-offset-2">
                gzelenitsas@gmail.com
              </a>{' '}
              for anything urgent.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="bg-white border border-hairline rounded-2xl p-6 sm:p-8">
      {/* Honeypot — hidden field that bots fill in but humans don't see */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px]"
        aria-hidden
      />

      <div className="space-y-4">
        <div>
          <label htmlFor="cafe_name" className={labelClass}>
            Café or restaurant name
          </label>
          <input
            id="cafe_name"
            name="cafe_name"
            type="text"
            placeholder="e.g. Café Lindenhof"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@cafe.com"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+49 ..."
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="message" className={labelClass}>
            Message <span className="text-muted/60 normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={3}
            placeholder="Anything you'd like us to know?"
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full bg-ink text-cream text-base font-medium tracking-tight py-3.5 rounded-lg hover:bg-honey-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Sending…' : 'Start free trial →'}
      </button>

      <p className="mt-4 text-xs text-muted text-center leading-relaxed">
        Free during pilot phase. No credit card. We call within 24 hours.
      </p>
    </form>
  )
}
