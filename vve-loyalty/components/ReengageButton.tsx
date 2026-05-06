'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { reengageCustomer } from '@/app/actions'

export default function ReengageButton({
  uniqueId,
  name,
  daysSince,
}: {
  uniqueId: string
  name: string
  daysSince: number
}) {
  const [expanded, setExpanded] = useState(false)
  const boundAction = reengageCustomer.bind(null, uniqueId)
  const [state, action, isPending] = useActionState(boundAction, null)

  if (state?.success) {
    return <p className="text-green-400 text-xs font-semibold mt-2">Email sent to {name} ✓</p>
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mt-2 text-xs font-semibold text-amber-400 border border-amber-500/50 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 active:scale-95 transition-all"
      >
        Send "We miss you" ({daysSince}d inactive)
      </button>
    )
  }

  return (
    <form action={action} className="mt-2 space-y-2">
      <input
        type="text"
        name="offer"
        placeholder="Special offer (optional) — e.g. Free coffee today only"
        className="w-full bg-stone-700 text-white text-xs placeholder-stone-500 border border-stone-600 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-semibold text-amber-400 border border-amber-500/50 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 active:scale-95 transition-all disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send email'}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
        >
          Cancel
        </button>
      </div>
      {state?.error && <p className="text-red-400 text-xs">{state.error}</p>}
    </form>
  )
}
