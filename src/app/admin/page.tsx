'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Match, Participant } from '@/types'

const PHASE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos de Final',
  quarter: 'Cuartos de Final',
  semi: 'Semifinales',
  third_place: 'Tercer Puesto',
  final: 'Final',
}

const PHASE_ORDER = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final']

export default function AdminPage() {
  const { session, isLoading } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'fixture' | 'participants'>('fixture')
  const [matches, setMatches] = useState<Match[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [results, setResults] = useState<Record<string, { home: string; away: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !session) { router.push('/'); return }
    if (!isLoading && session && !session.isAdmin) { router.push('/dashboard'); return }
    if (!isLoading && session) loadData()
  }, [isLoading, session])

  async function loadData() {
    const supabase = createClient()
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('matches').select('*').order('match_date'),
      supabase.from('participants').select('*').order('created_at'),
    ])
    setMatches(m ?? [])
    setParticipants(p ?? [])
    setLoadingData(false)
  }

  async function handleImport() {
    setImporting(true)
    setImportMsg('')
    const res = await fetch('/api/admin/import-fixture', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setImportMsg(`✅ ${data.imported} partidos importados`)
      loadData()
    } else {
      setImportMsg(`❌ ${data.error}`)
    }
    setImporting(false)
  }

  async function handleSaveResult(matchId: string) {
    const r = results[matchId]
    if (!r || r.home === '' || r.away === '') return
    setSavingId(matchId)

    const res = await fetch('/api/admin/update-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        homeScore: parseInt(r.home),
        awayScore: parseInt(r.away),
      }),
    })

    if (res.ok) {
      await loadData()
    }
    setSavingId(null)
  }

  const matchesByPhase = PHASE_ORDER.reduce<Record<string, Match[]>>((acc, phase) => {
    const filtered = matches.filter((m) => m.phase === phase)
    if (filtered.length > 0) acc[phase] = filtered
    return acc
  }, {})

  if (isLoading || loadingData) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-green-300">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="p-4 flex items-center justify-between border-b border-green-700">
        <div>
          <h1 className="font-bold text-lg">⚙️ Admin</h1>
          <p className="text-green-400 text-xs">Mundial 2026</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-yellow-400 underline">
          ← Volver
        </button>
      </header>

      <div className="flex border-b border-green-700">
        <button
          onClick={() => setTab('fixture')}
          className={`flex-1 py-3 text-sm font-medium ${tab === 'fixture' ? 'bg-green-700' : ''}`}
        >
          Fixture ({matches.length})
        </button>
        <button
          onClick={() => setTab('participants')}
          className={`flex-1 py-3 text-sm font-medium ${tab === 'participants' ? 'bg-green-700' : ''}`}
        >
          Participantes ({participants.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {tab === 'fixture' && (
          <>
            <div className="space-y-2">
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-xl disabled:opacity-50"
              >
                {importing ? 'Sincronizando...' : matches.length > 0 ? '🔄 Sincronizar Fixture' : '⬇️ Importar Fixture desde API'}
              </button>
              {importMsg && <p className="text-sm text-center">{importMsg}</p>}
              <p className="text-xs text-green-400 text-center">
                Sincronizar actualiza equipos TBD y resultados desde la API
              </p>
            </div>

            {Object.entries(matchesByPhase).map(([phase, phaseMatches]) => (
              <div key={phase}>
                <h2 className="text-yellow-400 font-bold text-sm mb-2 uppercase tracking-wide">
                  {PHASE_LABELS[phase]}
                </h2>
                <div className="space-y-2">
                  {phaseMatches.map((match) => (
                    <div key={match.id} className="bg-green-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate flex-1">{match.home_team}</span>
                        <span className="text-green-400 text-xs px-2">
                          {match.status === 'finished'
                            ? `${match.home_score} - ${match.away_score}`
                            : new Date(match.match_date).toLocaleDateString('es-AR', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })
                          }
                        </span>
                        <span className="font-medium truncate flex-1 text-right">{match.away_team}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          placeholder="0"
                          value={results[match.id]?.home ?? (match.status === 'finished' ? match.home_score ?? '' : '')}
                          onChange={(e) => setResults((r) => ({ ...r, [match.id]: { ...r[match.id], home: e.target.value } }))}
                          className="w-12 px-2 py-1 rounded text-gray-900 text-center text-sm"
                        />
                        <span className="text-green-400">-</span>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          placeholder="0"
                          value={results[match.id]?.away ?? (match.status === 'finished' ? match.away_score ?? '' : '')}
                          onChange={(e) => setResults((r) => ({ ...r, [match.id]: { ...r[match.id], away: e.target.value } }))}
                          className="w-12 px-2 py-1 rounded text-gray-900 text-center text-sm"
                        />
                        <button
                          onClick={() => handleSaveResult(match.id)}
                          disabled={savingId === match.id}
                          className="ml-auto px-3 py-1 bg-yellow-400 text-gray-900 text-xs font-bold rounded-lg disabled:opacity-50"
                        >
                          {savingId === match.id ? '...' : match.status === 'finished' ? 'Actualizar' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'participants' && (
          <div className="space-y-2">
            {participants.length === 0 && (
              <p className="text-green-400 text-center text-sm">Aún no hay participantes.</p>
            )}
            {participants.map((p, i) => (
              <div key={p.id} className="bg-green-800 rounded-xl p-3 flex items-center gap-3">
                <span className="text-green-400 text-sm w-6">{i + 1}</span>
                <span className="font-medium">{p.name}</span>
                {p.is_admin && (
                  <span className="ml-auto text-xs bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full font-bold">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
