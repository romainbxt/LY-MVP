'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function ShopQR({ registerUrl }: { registerUrl: string }) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    QRCode.toDataURL(registerUrl, { width: 400, margin: 3, color: { dark: '#1c1917', light: '#ffffff' } }).then(setDataUrl)
  }, [registerUrl])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'vve-shop-qr.png'
    a.click()
  }

  return (
    <div className="flex flex-col sm:flex-row items-start gap-5">
      <div className="bg-white rounded-2xl p-3 shadow-md shrink-0">
        {dataUrl
          ? <img src={dataUrl} alt="Shop QR Code" width={150} height={150} />
          : <div className="w-[150px] h-[150px] bg-stone-100 rounded-xl animate-pulse" />
        }
      </div>
      <div>
        <p className="text-white font-semibold mb-1">Customer registration QR</p>
        <p className="text-stone-400 text-sm mb-1">Print and place on tables or counter.</p>
        <p className="text-stone-500 text-xs mb-5">
          Customers scan this → enter their name + email → receive their personal stamp card by email.
        </p>
        <button
          onClick={handleDownload}
          disabled={!dataUrl}
          className="bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-40"
        >
          Download PNG
        </button>
      </div>
    </div>
  )
}
