import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AJÁ PRODE',
  description: 'Prode del Mundial de Fútbol 2026',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Prode 2026',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geist.className}>
      <body className="min-h-screen bg-green-900 text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
