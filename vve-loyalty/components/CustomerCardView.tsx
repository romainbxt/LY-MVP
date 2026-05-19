import QRCode from 'qrcode'
import { headers } from 'next/headers'
import type { Customer, Venue } from '@/lib/supabase'

export default async function CustomerCardView({
  customer,
  uniqueId,
  venue,
}: {
  customer: Customer
  uniqueId: string
  venue: Venue | null
}) {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const scanUrl = `${proto}://${host}/scan/${uniqueId}`
  const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 280, margin: 2 })

  const { stamp_count: stampCount, name } = customer
  const brand = venue?.brand_color ?? '#D97706'
  const bgColor = venue?.background_color ?? `${brand}18`
  const rewards = venue?.rewards ?? [{ stamp: 10, label: 'Reward 🎁' }]
  const totalStamps = rewards[rewards.length - 1]?.stamp ?? 10
  const nextReward = rewards.find(r => r.stamp > stampCount)
  const stampsToGo = (nextReward?.stamp ?? totalStamps) - stampCount
  const cardComplete = stampCount >= totalStamps

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: bgColor }}
    >
      <div className="w-full max-w-sm">

        {venue?.logo_url && (
          <div className="flex justify-center mb-6">
            <img
              src={venue.logo_url}
              alt={venue.name}
              width={80}
              height={80}
              style={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', objectFit: 'contain', background: '#fff', padding: '6px' }}
            />
          </div>
        )}

        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-stone-800">Hi, {name}!</h1>
          <p className="text-stone-500 mt-1">
            You have{' '}
            <span className="font-bold" style={{ color: brand }}>{stampCount}</span>{' '}
            stamp{stampCount !== 1 ? 's' : ''}
          </p>
          {!cardComplete && nextReward && (
            <p className="text-xs text-stone-400 mt-1">
              {stampsToGo} more for {nextReward.label}
            </p>
          )}
          {cardComplete && (
            <p className="text-sm font-semibold mt-1" style={{ color: brand }}>
              🎉 Card complete! Claim your reward.
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-md p-5 mb-4">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest text-center mb-4 font-semibold">
            Your Stamp Card
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(totalStamps, 5)}, 1fr)` }}>
            {Array.from({ length: totalStamps }).map((_, i) => {
              const num = i + 1
              const filled = num <= stampCount
              const rewardHere = rewards.find(r => r.stamp === num)
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
                    style={{
                      background: filled ? brand : '#f1f5f9',
                      color: filled ? '#fff' : '#cbd5e1',
                    }}
                  >
                    {filled ? '✓' : num}
                  </div>
                  {rewardHere && (
                    <span
                      className="text-[8px] text-center leading-tight font-semibold"
                      style={{ color: filled ? brand : '#cbd5e1' }}
                    >
                      {rewardHere.label.split(' ').slice(0, 2).join(' ')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-md p-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Your QR Code" className="w-48 h-48 mx-auto mb-3" />
          <p className="text-stone-400 text-sm font-medium">Show this at the counter</p>
        </div>

        <p className="text-center text-stone-400 text-xs mt-4">
          Bookmark this page — it&apos;s your card.
        </p>
      </div>
    </main>
  )
}
