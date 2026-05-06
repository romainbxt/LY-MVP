'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { deleteCustomerAction } from '@/app/actions'

export default function DeleteButton({ uniqueId, name }: { uniqueId: string; name: string }) {
  const [confirming, setConfirming] = useState(false)
  const boundAction = deleteCustomerAction.bind(null, uniqueId)
  const [state, action, isPending] = useActionState(boundAction, null)

  if (state?.success) return (
    <p className="text-stone-500 text-xs mt-2">Deleted</p>
  )

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-red-400 hover:text-red-300 transition-colors mt-2"
      >
        Delete profile
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-stone-400">Delete {name}?</span>
      <form action={action} className="inline">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-semibold text-red-400 border border-red-400/40 px-2.5 py-1 rounded-lg hover:bg-red-400/10 transition-colors disabled:opacity-50"
        >
          {isPending ? '…' : 'Yes, delete'}
        </button>
      </form>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
