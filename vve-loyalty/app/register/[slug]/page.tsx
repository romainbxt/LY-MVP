import { notFound } from 'next/navigation'
import { getVenueBySlug } from '@/lib/supabase'
import RegisterForm from '@/components/RegisterForm'

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const venue = await getVenueBySlug(slug)
  if (!venue) notFound()

  const rewards = venue.rewards ?? []
  const totalStamps = rewards[rewards.length - 1]?.stamp ?? 10

  const bgColor = venue.background_color ?? `${venue.brand_color}18`

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: bgColor }}
    >
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          {venue.logo_url && (
            <div style={{ width: 96, height: 96, borderRadius: '20px', background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', margin: '0 auto 16px' }}>
              <img
                src={venue.logo_url}
                alt={venue.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-stone-800">{venue.name}</h1>
          <p className="text-stone-500 text-sm mt-1">Join the loyalty program</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-4">
          <RegisterForm slug={slug} brandColor={venue.brand_color} />
        </div>

        <div className="bg-white/70 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">
            {venue.name}&apos;s Rules
          </p>
          <div className="space-y-2">
            {rewards.map(r => (
              <div key={r.stamp} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{ background: venue.brand_color }}
                >
                  {r.stamp}
                </div>
                <p className="text-sm text-stone-700 font-medium">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
