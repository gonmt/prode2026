'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { session, isLoading } = useAuth()
  const router = useRouter()
  const [code, setCode] = useState('')

  useEffect(() => {
    if (!isLoading && session) {
      router.push('/dashboard')
    }
  }, [session, isLoading, router])

  const handleCodeChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setCode(upper)
    if (upper.length === 6) {
      router.push(`/join/${upper}`)
    }
  }

  if (isLoading) return null

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-sm w-full">
        <div>
          <p className="text-6xl mb-2">⚽</p>
          <h1 className="text-4xl font-bold">Prode</h1>
          <h2 className="text-2xl font-semibold text-yellow-400">Mundial 2026</h2>
        </div>

        <div className="space-y-3">
          <p className="text-green-300 text-sm">
            Ingresá el código de invitación que te compartieron
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="XXXXXX"
            maxLength={6}
            className="w-full px-4 py-4 rounded-xl text-gray-900 text-center text-2xl font-bold tracking-widest uppercase bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            autoFocus
          />
          <p className="text-green-400 text-xs">El código tiene 6 caracteres</p>
        </div>
      </div>
    </main>
  )
}
