import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { getVenueBySlug } from '@/lib/supabase'
import { QrCode } from 'lucide-react'
import Link from 'next/link'

export default async function ScanPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const venue = await getVenueBySlug(slug)
  if (!venue) notFound()

  const cookieStore = await cookies()
  const isLoggedIn = cookieStore.get(`cashier_${slug}`)?.value === 'true'
  if (!isLoggedIn) redirect(`/cashier/${slug}`)

  return (
    <main className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6">
      <Link
        href={`/cashier/${slug}`}
        className="text-stone-500 text-sm mb-10 self-start absolute top-5 left-5"
      >
        ← Dashboard
      </Link>
      <div className="text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ background: venue.brand_color }}
        >
          <QrCode className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-white text-3xl font-bold mb-3">Scanner Active</h1>
        <p className="text-stone-400 text-base max-w-xs mx-auto leading-relaxed">
          Open your camera and scan a customer&apos;s personal QR code to add a stamp.
        </p>
        <div
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full"
          style={{ background: venue.brand_color + '30', color: venue.brand_color }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: venue.brand_color }}
          />
          LIVE
        </div>
      </div>
    </main>
  )
}
