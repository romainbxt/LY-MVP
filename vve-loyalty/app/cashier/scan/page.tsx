import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { QrCode } from 'lucide-react'
import Link from 'next/link'

export default async function ScanPage() {
  const cookieStore = await cookies()
  const isLoggedIn = cookieStore.get('is_cashier')?.value === 'true'
  if (!isLoggedIn) redirect('/cashier')

  return (
    <main className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-6">
      <Link href="/cashier" className="text-stone-500 text-sm mb-10 self-start absolute top-5 left-5">
        ← Dashboard
      </Link>
      <div className="text-center">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/40">
          <QrCode className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-white text-3xl font-bold mb-3">Scanner Active</h1>
        <p className="text-stone-400 text-base max-w-xs mx-auto leading-relaxed">
          Open your camera and scan a customer&apos;s personal QR code to add a stamp.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 bg-green-500/20 text-green-400 text-sm font-semibold px-5 py-2.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </div>
      </div>
    </main>
  )
}
