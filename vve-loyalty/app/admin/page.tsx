import { cookies } from 'next/headers'
import { getAllVenues } from '@/lib/supabase'
import AdminLoginForm from '@/components/AdminLoginForm'
import CreateVenueForm from '@/components/CreateVenueForm'
import EditVenueForm from '@/components/EditVenueForm'
import StampCardPreview from '@/components/StampCardPreview'
import WinBackRulesEditor from '@/components/WinBackRulesEditor'
import Link from 'next/link'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('is_admin')?.value === 'true'

  if (!isAdmin) return <AdminLoginForm />

  const venues = await getAllVenues()

  return (
    <main className="min-h-screen bg-stone-950 text-white p-6 pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h1 className="text-xl font-bold">LY Admin</h1>
            <p className="text-stone-500 text-xs">Venue management</p>
          </div>
        </div>

        <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-3">
          Venues — {venues.length} active
        </p>

        <div className="space-y-3 mb-6">
          {venues.map(v => (
            <div key={v.id} className="bg-stone-900 rounded-2xl p-4 border border-stone-800">
              <div className="flex items-center gap-3 mb-3">
                {v.logo_url && (
                  <img
                    src={v.logo_url}
                    alt={v.name}
                    width={40}
                    height={40}
                    className="rounded-xl object-cover"
                    style={{ background: '#fff' }}
                  />
                )}
                <div>
                  <p className="font-semibold">{v.name}</p>
                  <p className="text-stone-500 text-xs">/{v.slug}</p>
                </div>
                <div
                  className="ml-auto w-4 h-4 rounded-full border-2 border-stone-700"
                  style={{ background: v.brand_color }}
                />
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Link
                  href={`/cashier/${v.slug}`}
                  className="font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
                  style={{ color: v.brand_color, borderColor: v.brand_color + '60' }}
                >
                  Cashier
                </Link>
                <Link
                  href={`/register/${v.slug}`}
                  className="text-stone-400 border border-stone-700 px-3 py-1.5 rounded-lg hover:text-stone-300 transition-colors"
                >
                  Register page
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {v.rewards.map(r => (
                  <span key={r.stamp} className="text-[10px] text-stone-500 bg-stone-800 px-2 py-0.5 rounded-full">
                    {r.stamp}× → {r.label}
                  </span>
                ))}
              </div>

              <StampCardPreview venue={v} />
              <EditVenueForm venue={v} />
              <WinBackRulesEditor
                venueId={v.id}
                initialRules={v.win_back_rules || []}
                brandColor={v.brand_color}
              />
            </div>
          ))}

          {venues.length === 0 && (
            <p className="text-stone-600 text-sm text-center py-8">No venues yet. Add one below.</p>
          )}
        </div>

        <CreateVenueForm />
      </div>
    </main>
  )
}
