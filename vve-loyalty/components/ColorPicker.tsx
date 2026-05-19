'use client'

import { useState } from 'react'

const PRESETS = [
  // Whites & creams
  { label: 'Pure White',    value: '#FFFFFF' },
  { label: 'Warm Cream',    value: '#FDF6EC' },
  { label: 'Off White',     value: '#F5F0E8' },
  // Yellows & oranges
  { label: 'Butter',        value: '#FFF3B0' },
  { label: 'Peach',         value: '#FDDCB5' },
  { label: 'Terracotta',    value: '#E07A5F' },
  { label: 'Amber',         value: '#D97706' },
  // Reds & pinks
  { label: 'Blush',         value: '#F4A7B9' },
  { label: 'Rose',          value: '#D64045' },
  { label: 'Burgundy',      value: '#7B2D3E' },
  // Greens
  { label: 'Mint',          value: '#B7E4C7' },
  { label: 'Sage',          value: '#84A98C' },
  { label: 'Forest',        value: '#2D6A4F' },
  { label: 'Dark Green',    value: '#1B3A2D' },
  // Blues & teals
  { label: 'Sky',           value: '#BDE0FE' },
  { label: 'Teal',          value: '#4ECDC4' },
  { label: 'Ocean',         value: '#1A6B8A' },
  { label: 'Navy',          value: '#0D1B2A' },
  // Purples
  { label: 'Lavender',      value: '#C8B6E2' },
  { label: 'Plum',          value: '#6B3FA0' },
  // Neutrals & darks
  { label: 'Sand',          value: '#C9A87C' },
  { label: 'Stone',         value: '#8D8D8D' },
  { label: 'Charcoal',      value: '#3A3A3A' },
  { label: 'Espresso',      value: '#1C1008' },
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
      <div className="grid grid-cols-8 gap-1.5 mb-2">
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
