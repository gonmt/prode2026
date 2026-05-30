'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const { login, session, isLoading } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groupNotFound, setGroupNotFound] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    if (!isLoading && session) {
      router.push('/dashboard')
      return
    }
    verifyCode()
  }, [isLoading, session])

  async function verifyCode() {
    const supabase = createClient()
    const { data } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', code.toUpperCase())
      .single()

    if (!data) {
      setGroupNotFound(true)
    } else {
      setGroupId(data.id)
      setGroupName(data.name)
    }
    setIsVerifying(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !groupId) return

    setIsSubmitting(true)
    setError('')

    const deviceToken = crypto.randomUUID()
    const supabase = createClient()

    const { data: participant, error: err } = await supabase
      .from('participants')
      .insert({
        group_id: groupId,
        name: name.trim(),
        device_token: deviceToken,
        is_admin: false,
      })
      .select()
      .single()

    if (err || !participant) {
      setError('Error al unirse. Intentá de nuevo.')
      setIsSubmitting(false)
      return
    }

    login({
      participantId: participant.id,
      participantName: participant.name,
      groupId: participant.group_id,
      deviceToken,
      isAdmin: participant.is_admin,
    })

    router.push('/dashboard')
  }

  if (isLoading || isVerifying) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-green-300 text-lg">Verificando código...</p>
      </main>
    )
  }

  if (groupNotFound) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-5xl">❌</p>
        <p className="text-xl font-bold">Código inválido</p>
        <p className="text-green-300">
          El código <strong>{code}</strong> no existe.
        </p>
        <button
          onClick={() => router.push('/')}
          className="text-yellow-400 underline"
        >
          Volver al inicio
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="text-5xl mb-2">⚽</p>
          <h1 className="text-3xl font-bold">Prode Mundial 2026</h1>
          <p className="text-yellow-400 text-lg mt-1">{groupName}</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm text-green-300 mb-2">
              ¿Con qué nombre querés aparecer en la tabla?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-4 py-3 rounded-xl text-gray-900 text-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              maxLength={30}
              required
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-4 bg-yellow-400 text-gray-900 font-bold rounded-xl text-lg disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isSubmitting ? 'Uniéndose...' : 'Unirse al grupo'}
          </button>
        </form>
      </div>
    </main>
  )
}
