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

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: `${venue.brand_color}12` }}
    >
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          {venue.logo_url && (
            <img
              src={venue.logo_url}
              alt={venue.name}
              width={90}
              height={90}
              className="mx-auto mb-4 object-cover"
              style={{ borderRadius: '20px', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', background: '#fff' }}
            />
          )}
          <h1 className="text-2xl font-bold text-stone-800">{venue.name}</h1>
          <p className="text-stone-500 text-sm mt-1">Join the loyalty program</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-4">
          <RegisterForm slug={slug} brandColor={venue.brand_color} />
        </div>

        <div className="bg-white/70 rounded-2xl p-4 text-center shadow-sm">
          <div className="flex justify-center gap-1.5 mb-2">
            {rewards.map(r => (
              <span
                key={r.stamp}
                className="text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{ background: venue.brand_color + '20', color: venue.brand_color }}
              >
                {r.stamp}× {r.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-stone-400">Collect {totalStamps} stamps to earn rewards</p>
        </div>
      </div>
    </main>
  )
}
