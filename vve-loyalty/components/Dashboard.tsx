import Link from 'next/link'
import { getAllCustomers } from '@/lib/supabase'
import type { Venue } from '@/lib/supabase'
import ShopQR from '@/components/ShopQR'
import ReengageButton from '@/components/ReengageButton'
import DeleteButton from '@/components/DeleteButton'
import { cashierLogout } from '@/app/actions'

export default async function Dashboard({ venue }: { venue: Venue }) {
  const customers = await getAllCustomers(venue.id)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const registerUrl = `${baseUrl}/register/${venue.slug}`

  const now = Date.now()
  const totalStamps = venue.rewards[venue.rewards.length - 1]?.stamp ?? 10

  const logoutAction = cashierLogout.bind(null, venue.slug)

  return (
    <main className="min-h-screen bg-stone-900 text-white pb-16">

      <div className="border-b border-stone-800 px-5 py-4 flex items-center gap-3">
        {venue.logo_url && (
          <img
            src={venue.logo_url}
            alt={venue.name}
            width={38}
            height={38}
            style={{ borderRadius: '10px', objectFit: 'cover', background: '#fff' }}
          />
        )}
        <div className="min-w-0">
          <h1 className="font-bold text-base leading-tight truncate">{venue.name} Back Office</h1>
          <p className="text-stone-500 text-xs">Loyalty Dashboard</p>
        </div>
        <Link
          href={`/cashier/${venue.slug}/scan`}
          className="ml-auto shrink-0 text-white font-bold px-4 py-2 rounded-xl text-sm"
          style={{ background: venue.brand_color }}
        >
          Open Scanner
        </Link>
      </div>

      <div className="px-5 py-6 border-b border-stone-800">
        <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-4">Shop QR Code</p>
        <ShopQR registerUrl={registerUrl} slug={venue.slug} />
      </div>

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
                  className={`bg-stone-800 rounded-2xl p-4 ${isInactive ? 'ring-1 ring-stone-600' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-stone-400 text-xs truncate">{c.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: venue.brand_color }}>
                        {c.stamp_count} / {totalStamps}
                      </p>
                      {daysSince !== null ? (
                        <p className={`text-xs ${isInactive ? 'text-amber-400' : 'text-stone-500'}`}>
                          {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-600">No visits yet</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-0.5 mt-3">
                    {Array.from({ length: totalStamps }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 h-1.5 rounded-full"
                        style={{ background: i < c.stamp_count ? venue.brand_color : '#44403c' }}
                      />
                    ))}
                  </div>

                  <ReengageButton uniqueId={c.unique_id} name={c.name} daysSince={daysSince ?? 0} />
                  <DeleteButton uniqueId={c.unique_id} name={c.name} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-5 mt-4">
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-stone-500 text-xs hover:text-stone-400 transition-colors"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  )
}
