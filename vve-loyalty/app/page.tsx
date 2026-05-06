import RegisterForm from '@/components/RegisterForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/vve-logo.png"
            alt="VVE Cafe"
            width={110}
            height={110}
            style={{ borderRadius: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', objectFit: 'cover' }}
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 mb-2">VVE Loyalty</h1>
          <p className="text-stone-500 text-sm">
            Earn stamps on every visit. Unlock free rewards.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <RegisterForm />
        </div>

        {/* Rewards preview */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { stamp: '3rd', reward: 'Cookie', emoji: '🍪' },
            { stamp: '6th', reward: 'Matcha', emoji: '🍵' },
            { stamp: '10th', reward: 'Toast', emoji: '🍞' },
          ].map(r => (
            <div key={r.stamp} className="bg-white/70 rounded-2xl p-3 text-center shadow-sm">
              <div className="text-2xl mb-1">{r.emoji}</div>
              <div className="text-xs font-bold text-amber-600">{r.stamp} stamp</div>
              <div className="text-xs text-stone-400">Free {r.reward}</div>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
