import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getVenueBySlug } from '@/lib/supabase'
import CashierLoginForm from '@/components/CashierLoginForm'
import Dashboard from '@/components/Dashboard'

export default async function CashierPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const venue = await getVenueBySlug(slug)
  if (!venue) notFound()

  const cookieStore = await cookies()
  const isLoggedIn = cookieStore.get(`cashier_${slug}`)?.value === 'true'

  if (isLoggedIn) return <Dashboard venue={venue} />

  return (
    <main className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          {venue.logo_url && (
            <img
              src={venue.logo_url}
              alt={venue.name}
              width={80}
              height={80}
              className="mx-auto mb-4 object-cover"
              style={{ borderRadius: '16px', background: '#fff' }}
            />
          )}
          <h1 className="text-white text-2xl font-bold mb-1">Staff Login</h1>
          <p className="text-stone-400 text-sm">{venue.name} Back Office</p>
        </div>
        <div className="bg-stone-800 rounded-3xl p-6 shadow-xl">
          <CashierLoginForm slug={slug} brandColor={venue.brand_color} />
        </div>
      </div>
    </main>
  )
}
