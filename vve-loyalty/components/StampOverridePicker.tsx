'use client'

import { useState } from 'react'
import { STAMP_PRESETS } from './StampIconPicker'

export default function StampOverridePicker({
  name,
  totalStamps,
  defaultIcon,
  defaultOverrides,
}: {
  name: string
  totalStamps: number
  defaultIcon: string
  defaultOverrides: Array<{ stamp: number; icon: string }>
}) {
  const [overrides, setOverrides] = useState<Record<number, string>>(
    Object.fromEntries(defaultOverrides.map(o => [o.stamp, o.icon]))
  )
  const [activeStamp, setActiveStamp] = useState<number | null>(null)

  const overridesList = Object.entries(overrides).map(([s, icon]) => ({ stamp: parseInt(s), icon }))

  return (
    <div>
      <p className="text-xs text-stone-400 mb-1">Per-stamp icon overrides</p>
      <p className="text-[10px] text-stone-500 mb-2">Click a stamp to assign a custom icon at that position</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {Array.from({ length: totalStamps }, (_, i) => i + 1).map(num => {
          const icon = overrides[num] ?? defaultIcon
          const hasOverride = !!overrides[num]
          return (
            <button
              key={num}
              type="button"
              onClick={() => setActiveStamp(activeStamp === num ? null : num)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-all relative"
              style={{
                background: activeStamp === num ? '#f59e0b' : hasOverride ? '#78350f' : '#44403c',
                outline: activeStamp === num ? '2px solid #fcd34d' : 'none',
              }}
            >
              {icon}
              {hasOverride && activeStamp !== num && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-stone-800" />
              )}
            </button>
          )
        })}
      </div>

      {activeStamp !== null && (
        <div className="bg-stone-700/60 rounded-xl p-3 mb-2 border border-stone-600">
          <p className="text-xs text-stone-300 mb-2 font-semibold">Stamp {activeStamp}:</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {STAMP_PRESETS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => {
                  setOverrides(prev => ({ ...prev, [activeStamp]: icon }))
                  setActiveStamp(null)
                }}
                className="w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all"
                style={{ background: overrides[activeStamp] === icon ? '#f59e0b' : '#57534e' }}
              >
                {icon}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setOverrides(prev => { const n = { ...prev }; delete n[activeStamp]; return n })
              setActiveStamp(null)
            }}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear override for stamp {activeStamp}
          </button>
        </div>
      )}

      <input type="hidden" name={name} value={JSON.stringify(overridesList)} />
    </div>
  )
}
