import Link from 'next/link'
import { getAllCustomers } from '@/lib/supabase'
import ShopQR from '@/components/ShopQR'
import ReengageButton from '@/components/ReengageButton'

export default async function Dashboard() {
  const customers = await getAllCustomers()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const registerUrl = baseUrl

  const now = Date.now()

  return (
    <main className="min-h-screen bg-stone-900 text-white pb-16">

      {/* Header */}
      <div className="border-b border-stone-800 px-5 py-4 flex items-center gap-3">
        <img src="https://lvcmxhnrxcazejverpir.supabase.co/storage/v1/object/public/public-assets/vve%20cafe%20logo.jpg" alt="VVE" width={38} height={38} style={{ borderRadius: '12px', objectFit: 'cover' }} />
        <div>
          <h1 className="font-bold text-base leading-tight">VVE Back Office</h1>
          <p className="text-stone-500 text-xs">Loyalty Dashboard</p>
        </div>
        <Link
          href="/cashier/scan"
          className="ml-auto bg-green-600 hover:bg-green-500 active:scale-95 transition-all text-white font-bold px-4 py-2 rounded-xl text-sm"
        >
          Open Scanner
        </Link>
      </div>

      {/* Shop QR */}
      <div className="px-5 py-6 border-b border-stone-800">
        <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-4">Shop QR Code</p>
        <ShopQR registerUrl={registerUrl} />
      </div>

      {/* Customer list */}
      <div className="px-5 py-6">
        <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-4">
          Customers — {customers.length} registered
        </p>

        {customers.length === 0 ? (
          <p className="text-stone-500 text-sm">No customers yet. Share the shop QR to get started.</p>
        ) : (
          <div className="space-y-3">
            {customers.map(c => {
              const daysSince = c.last_visit_at
                ? Math.floor((now - new Date(c.last_visit_at).getTime()) / 86_400_000)
                : null
              const isInactive = daysSince !== null && daysSince >= 15

              return (
                <div
                  key={c.id}
                  className={`bg-stone-800 rounded-2xl p-4 ${isInactive ? 'ring-1 ring-amber-500/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-stone-400 text-xs truncate">{c.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-amber-400 font-bold text-sm">{c.stamp_count} / 10</p>
                      {daysSince !== null ? (
                        <p className={`text-xs ${isInactive ? 'text-amber-400' : 'text-stone-500'}`}>
                          {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-600">No visits yet</p>
                      )}
                    </div>
                  </div>

                  {/* Stamp progress bar */}
                  <div className="flex gap-0.5 mt-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full ${i < c.stamp_count ? 'bg-amber-400' : 'bg-stone-700'}`}
                      />
                    ))}
                  </div>

                  {isInactive && (
                    <ReengageButton uniqueId={c.unique_id} name={c.name} daysSince={daysSince!} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
