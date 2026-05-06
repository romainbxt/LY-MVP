import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VVE Cafe Loyalty',
  description: 'Your digital stamp card for VVE Cafe',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 antialiased">{children}</body>
    </html>
  )
}
