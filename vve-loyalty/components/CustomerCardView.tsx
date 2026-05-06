import QRCode from 'qrcode'
import { headers } from 'next/headers'
import type { Customer } from '@/lib/supabase'
import Image from 'next/image'

const REWARDS: Record<number, string> = {
  3: 'Cookie 🍪',
  6: 'Matcha 🍵',
  10: 'Toast 🍞',
}

export default async function CustomerCardView({
  customer,
  uniqueId,
}: {
  customer: Customer
  uniqueId: string
}) {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const scanUrl = `${proto}://${host}/scan/${uniqueId}`
  const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 280, margin: 2 })

  const { stamp_count: stampCount, name } = customer
  const nextMilestone = [3, 6, 10].find(n => n > stampCount)
  const stampsToGo = nextMilestone ? nextMilestone - stampCount : 0

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-6">
          <Image
            src="/vve-logo.png"
            alt="VVE Cafe"
            width={80}
            height={80}
            className="rounded-2xl shadow-md object-cover"
          />
        </div>

        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-stone-800">Hi, {name}! ☕</h1>
          <p className="text-stone-500 mt-1">
            You have{' '}
            <span className="text-amber-600 font-bold">{stampCount}</span>{' '}
            stamp{stampCount !== 1 ? 's' : ''}
          </p>
          {nextMilestone && (
            <p className="text-xs text-stone-400 mt-1">
              {stampsToGo} more for your {REWARDS[nextMilestone]}
            </p>
          )}
          {stampCount >= 10 && (
            <p className="text-sm font-semibold text-amber-600 mt-1">
              🎉 Card complete! Claim your reward.
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-md p-5 mb-4">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest text-center mb-4 font-semibold">
            Your Stamp Card
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => {
              const num = i + 1
              const filled = num <= stampCount
              const reward = REWARDS[num]
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-colors ${
                      filled ? 'bg-amber-400 text-white shadow-sm' : 'bg-stone-100 text-stone-300'
                    }`}
                  >
                    {filled ? '☕' : num}
                  </div>
                  {reward && (
                    <span
                      className={`text-[8px] text-center leading-tight font-semibold ${
                        filled ? 'text-amber-500' : 'text-stone-300'
                      }`}
                    >
                      {reward}
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
          <p className="text-stone-400 text-sm font-medium">Show this to the barista</p>
        </div>

        <p className="text-center text-stone-400 text-xs mt-4">
          Bookmark this page — it&apos;s your card.
        </p>
      </div>
    </main>
  )
}
