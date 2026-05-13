import RegisterForm from '@/components/RegisterForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 to-sky-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-8">
          <img
            src="https://rznvtehkibnfmukpppiz.supabase.co/storage/v1/object/public/flussbad-logo.png/logo.png.jpg"
            alt="Flussbad Berlin"
            width={110}
            height={110}
            style={{ borderRadius: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', objectFit: 'cover', background: '#fff' }}
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 mb-2">Flussbad Loyalty</h1>
          <p className="text-stone-500 text-sm">
            Collect stamps. Earn your Freund*innen Rabatt.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <RegisterForm />
        </div>

        <div className="bg-white/70 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl mb-1">🌊</div>
          <div className="text-xs font-bold" style={{ color: '#26BDC7' }}>10th stamp</div>
          <div className="text-xs text-stone-400">Freund*innen Rabatt</div>
        </div>

      </div>
    </main>
  )
}
