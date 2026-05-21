import type { Venue } from '@/lib/supabase'

export default function StampCardPreview({ venue }: { venue: Venue }) {
  const rewards = venue.rewards ?? []
  const totalStamps = rewards[rewards.length - 1]?.stamp ?? 10
  const stampIcon = venue.stamp_icon ?? '☕'
  const overrideMap = Object.fromEntries((venue.stamp_overrides ?? []).map(o => [o.stamp, o.icon]))
  const brand = venue.brand_color
  const bgColor = venue.background_color ?? `${brand}18`
  const cols = Math.min(totalStamps, 5)

  const stamps = Array.from({ length: totalStamps }, (_, i) => i + 1)
  const rows: number[][] = []
  for (let i = 0; i < stamps.length; i += cols) {
    rows.push(stamps.slice(i, i + cols))
  }

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-stone-700">
      <p className="text-[10px] text-stone-500 uppercase tracking-widest px-3 py-2 bg-stone-800/60">
        Stamp card preview
      </p>

      <div className="p-4" style={{ background: bgColor }}>
        <div className="flex justify-center mb-3">
          {venue.logo_url && (
            <div style={{ width: 56, height: 56, borderRadius: '12px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={venue.logo_url} alt={venue.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[9px] text-stone-400 uppercase tracking-widest text-center mb-3 font-semibold">
            Your Stamp Card
          </p>

          <div className="space-y-1">
            {rows.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-1.5">
                {row.map(num => {
                  const icon = overrideMap[num] ?? stampIcon
                  const reward = rewards.find(r => r.stamp === num)
                  return (
                    <div key={num} className="flex flex-col items-center gap-0.5" style={{ width: 48 }}>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-base"
                        style={{ background: brand, opacity: 1 }}
                      >
                        {icon}
                      </div>
                      <span
                        className="text-[7px] text-center leading-tight font-semibold"
                        style={{ color: brand, minHeight: 10, width: 48 }}
                      >
                        {reward ? reward.label.split(' ').slice(0, 2).join(' ') : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-stone-100 space-y-1">
            {rewards.map(r => (
              <div key={r.stamp} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0"
                  style={{ background: brand }}
                >
                  <span className="text-white text-[8px] font-bold">{r.stamp}</span>
                </div>
                <span className="text-[10px] text-stone-600 font-medium">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[9px] mt-2" style={{ color: `${brand}99` }}>
          {venue.name} · Loyalty Card
        </p>
      </div>
    </div>
  )
}
