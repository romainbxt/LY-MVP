'use client'

import { useState } from 'react'

export const STAMP_PRESETS = [
  // Coffee & hot drinks
  '☕', '🫖', '🍵', '🧋', '🥛',
  // Bakery & pastry
  '🥐', '🥖', '🥨', '🧇', '🥞', '🧁', '🍰', '🎂', '🍩', '🍪', '🥧',
  // Food & mains
  '🍕', '🍔', '🌮', '🌯', '🥗', '🥙', '🍜', '🍝', '🍛', '🍲', '🥘', '🫕',
  // Protein & savory
  '🥩', '🍣', '🍱', '🥚', '🧀', '🥓', '🍗', '🦐', '🫔',
  // Fruit & fresh
  '🍓', '🍇', '🥑', '🥝', '🍋', '🍊', '🍑', '🫐', '🍒',
  // Desserts & sweet
  '🍦', '🍧', '🍨', '🍡', '🍮', '🍯', '🍫', '🍬', '🍭',
  // Drinks & bar
  '🍺', '🍻', '🍷', '🥂', '🍾', '🧃', '🥤',
  // Rewards & general
  '⭐', '🌟', '🏆', '💫', '🎯', '🎁', '🔥', '❤️', '✨', '🎉',
]

export default function StampIconPicker({
  name,
  defaultValue,
}: {
  name: string
  defaultValue?: string | null
}) {
  const initial = defaultValue && defaultValue.trim() ? defaultValue : '☕'
  const isPreset = STAMP_PRESETS.includes(initial)
  const [selected, setSelected] = useState(isPreset ? initial : '☕')
  const [custom, setCustom] = useState(isPreset ? '' : initial)

  const current = custom.trim() || selected

  return (
    <div>
      <p className="text-xs text-stone-400 mb-2">Stamp icon</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {STAMP_PRESETS.map(icon => (
          <button
            key={icon}
            type="button"
            onClick={() => { setSelected(icon); setCustom('') }}
            className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
            style={{
              background: selected === icon && !custom.trim() ? '#f59e0b' : '#44403c',
              outline: selected === icon && !custom.trim() ? '2px solid #fcd34d' : 'none',
            }}
          >
            {icon}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={custom}
          onChange={e => { setCustom(e.target.value.slice(0, 2)); setSelected('') }}
          placeholder="Custom emoji"
          className="w-32 px-3 py-2 rounded-xl bg-stone-700 border border-stone-600 text-white placeholder:text-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {current && <span className="text-2xl">{current}</span>}
      </div>
      <input type="hidden" name={name} value={current} />
    </div>
  )
}
