import { cookies } from 'next/headers'
import CashierLoginForm from '@/components/CashierLoginForm'
import Dashboard from '@/components/Dashboard'

export default async function CashierPage() {
  const cookieStore = await cookies()
  const isLoggedIn = cookieStore.get('is_cashier')?.value === 'true'

  if (isLoggedIn) return <Dashboard />

  return (
    <main className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/vve-logo.png" alt="VVE Cafe" width={80} height={80} style={{ borderRadius: '16px', objectFit: 'cover' }} />
          </div>
          <h1 className="text-white text-2xl font-bold mb-1">Staff Login</h1>
          <p className="text-stone-400 text-sm">VVE Cafe Back Office</p>
        </div>
        <div className="bg-stone-800 rounded-3xl p-6 shadow-xl">
          <CashierLoginForm />
        </div>
      </div>
    </main>
  )
}
