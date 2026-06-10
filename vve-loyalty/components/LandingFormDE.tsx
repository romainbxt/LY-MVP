'use client'

import { useActionState } from 'react'
import { submitLandingLead } from '@/app/lead-actions'

const inputClass =
  'w-full bg-white border border-hairline rounded-lg px-4 py-3 text-ink placeholder:text-muted/60 text-base focus:outline-none focus:border-honey transition-colors'
const labelClass = 'block text-[11px] uppercase tracking-[0.12em] text-muted font-medium mb-2'

export default function LandingFormDE() {
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
            <p className="font-serif text-2xl text-ink leading-tight">Danke — wir melden uns.</p>
            <p className="mt-2 text-muted text-sm leading-relaxed">
              Wir rufen dich innerhalb von 24 Stunden an, um einen Termin zu vereinbaren und alles bei dir einzurichten.
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
            Name deines Cafés oder Restaurants
          </label>
          <input
            id="cafe_name"
            name="cafe_name"
            type="text"
            placeholder="z. B. Café Lindenhof"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="du@cafe.com"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Telefon
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
            Nachricht <span className="text-muted/60 normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={3}
            placeholder="Gibt es etwas, das wir wissen sollten?"
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
        {isPending ? 'Wird gesendet…' : 'Kostenlos starten →'}
      </button>

      <p className="mt-4 text-xs text-muted text-center leading-relaxed">
        Kostenlos in der Pilotphase. Keine Kreditkarte. Wir rufen innerhalb von 24 Stunden an.
      </p>
    </form>
  )
}
