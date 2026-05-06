'use client'

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
  const boundAction = reengageCustomer.bind(null, uniqueId)
  const [state, action, isPending] = useActionState(boundAction, null)

  if (state?.success) {
    return <p className="text-green-400 text-xs font-semibold mt-2">Email sent to {name} ✓</p>
  }

  return (
    <form action={action} className="mt-2">
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-semibold text-amber-400 border border-amber-500/50 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 active:scale-95 transition-all disabled:opacity-50"
      >
        {isPending ? 'Sending…' : `Send "We miss you" (${daysSince}d inactive)`}
      </button>
      {state?.error && <p className="text-red-400 text-xs mt-1">{state.error}</p>}
    </form>
  )
}
