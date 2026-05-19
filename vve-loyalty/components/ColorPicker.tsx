'use client'

import { useState } from 'react'

const PRESETS = [
  { label: 'Warm Cream',   value: '#FDF6EC' },
  { label: 'Soft Blush',   value: '#FDF0F0' },
  { label: 'Sage Green',   value: '#EEF4EE' },
  { label: 'Dusty Blue',   value: '#EEF3F8' },
  { label: 'Lavender',     value: '#F3F0F9' },
  { label: 'Warm Sand',    value: '#F5EFE6' },
  { label: 'Charcoal',     value: '#1C1C1E' },
  { label: 'Deep Navy',    value: '#0D1B2A' },
  { label: 'Forest',       value: '#1A2E1A' },
  { label: 'Espresso',     value: '#1C1008' },
  { label: 'Pure White',   value: '#FFFFFF' },
  { label: 'Off White',    value: '#F9F6F2' },
]

export default function ColorPicker({
  name,
  defaultValue,
  label,
}: {
  name: string
  defaultValue?: string | null
  label: string
}) {
  const [selected, setSelected] = useState(defaultValue ?? '')
  const [custom, setCustom] = useState(
    defaultValue && !PRESETS.find(p => p.value === defaultValue) ? defaultValue : ''
  )

  const current = custom || selected

  return (
    <div>
      <p className="text-xs text-stone-400 mb-2">{label}</p>
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {PRESETS.map(p => (
          <button
            key={p.value}
            type="button"
            title={p.label}
            onClick={() => { setSelected(p.value); setCustom('') }}
            className="w-8 h-8 rounded-lg border-2 transition-all"
            style={{
              background: p.value,
              borderColor: selected === p.value && !custom ? '#f59e0b' : 'transparent',
              outline: selected === p.value && !custom ? '1px solid #f59e0b' : 'none',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={custom || selected || '#FDF6EC'}
          onChange={e => { setCustom(e.target.value); setSelected('') }}
          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
          title="Custom color"
        />
        <span className="text-stone-500 text-xs">Custom</span>
        {current && (
          <span
            className="text-xs px-2 py-0.5 rounded-full text-stone-800 font-mono"
            style={{ background: current }}
          >
            {current}
          </span>
        )}
      </div>
      <input type="hidden" name={name} value={current} />
    </div>
  )
}
