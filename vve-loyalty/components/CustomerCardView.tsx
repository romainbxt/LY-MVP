import QRCode from 'qrcode'
import { headers } from 'next/headers'
import type { Customer } from '@/lib/supabase'

const REWARDS: Record<number, string> = {
  10: 'Freund*innen Rabatt 🎁',
}

const BRAND = '#26BDC7'
const LOGO = 'https://rznvtehkibnfmukpppiz.supabase.co/storage/v1/object/public/public-assets/flussbad-logo.png'

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
  const stampsToGo = 10 - stampCount

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 to-sky-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-6">
          <img
            src={LOGO}
            alt="Flussbad Berlin"
            width={80}
            height={80}
            style={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', objectFit: 'cover', background: '#fff' }}
          />
        </div>

        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-stone-800">Hi, {name}! 🌊</h1>
          <p className="text-stone-500 mt-1">
            You have{' '}
            <span className="font-bold" style={{ color: BRAND }}>{stampCount}</span>{' '}
            stamp{stampCount !== 1 ? 's' : ''}
          </p>
          {stampCount < 10 && (
            <p className="text-xs text-stone-400 mt-1">
              {stampsToGo} more for your Freund*innen Rabatt
            </p>
          )}
          {stampCount >= 10 && (
            <p className="text-sm font-semibold mt-1" style={{ color: BRAND }}>
              🎉 Card complete! Claim your Freund*innen Rabatt.
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
              const isReward = num === 10
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
                    style={{
                      background: filled ? BRAND : '#f1f5f9',
                      color: filled ? '#fff' : '#cbd5e1',
                    }}
                  >
                    {filled ? '🌊' : num}
                  </div>
                  {isReward && (
                    <span
                      className="text-[8px] text-center leading-tight font-semibold"
                      style={{ color: filled ? BRAND : '#cbd5e1' }}
                    >
                      Rabatt 🎁
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
          <p className="text-stone-400 text-sm font-medium">Show this at the entrance</p>
        </div>

        <p className="text-center text-stone-400 text-xs mt-4">
          Bookmark this page — it&apos;s your card.
        </p>
      </div>
    </main>
  )
}
