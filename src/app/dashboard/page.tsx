'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Match, Prediction } from '@/types'

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

type PredictionDraft = { home: string; away: string }

export default function DashboardPage() {
  const { session, isLoading, logout } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'fixture' | 'standings'>('fixture')
  const [filter, setFilter] = useState<'pending' | 'upcoming' | 'finished'>('pending')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [standings, setStandings] = useState<{ name: string; points: number }[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!isLoading && !session) { router.push('/'); return }
    if (!isLoading && session) loadData()
  }, [isLoading, session])

  async function loadData() {
    const supabase = createClient()
    const [{ data: matchData }, { data: predData }, { data: allPreds }, { data: allParticipants }] = await Promise.all([
      supabase.from('matches').select('*').order('match_date'),
      supabase.from('predictions').select('*').eq('participant_id', session!.participantId),
      supabase.from('predictions').select('points, participant_id, participants(name)'),
      supabase.from('participants').select('name').eq('group_id', session!.groupId),
    ])

    setMatches(matchData ?? [])

    const predMap: Record<string, Prediction> = {}
    for (const p of predData ?? []) predMap[p.match_id] = p
    setPredictions(predMap)

    const pointsMap: Record<string, number> = {}
    for (const p of allParticipants ?? []) pointsMap[p.name] = 0
    for (const p of allPreds ?? []) {
      const name = (p.participants as any)?.name
      if (name && p.points != null) {
        pointsMap[name] = (pointsMap[name] ?? 0) + p.points
      }
    }
    const sorted = Object.entries(pointsMap)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points)
    setStandings(sorted)

    setLoadingData(false)
  }

  async function savePrediction(matchId: string) {
    const draft = drafts[matchId]
    const existing = predictions[matchId]

    const homeStr = draft?.home ?? (existing ? String(existing.home_score) : '')
    const awayStr = draft?.away ?? (existing ? String(existing.away_score) : '')

    setSavingId(matchId)
    const supabase = createClient()

    const payload = {
      participant_id: session!.participantId,
      match_id: matchId,
      home_score: homeStr === '' ? 0 : parseInt(homeStr),
      away_score: awayStr === '' ? 0 : parseInt(awayStr),
    }

    let error
    if (existing) {
      ({ error } = await supabase.from('predictions').update(payload).eq('id', existing.id))
    } else {
      ({ error } = await supabase.from('predictions').insert(payload))
    }

    if (error) {
      setSaveError(error.message)
    } else {
      setSaveError(null)
      await loadData()
    }
    setSavingId(null)
  }

  const now = new Date()

  const filteredMatches = matches.filter((m) => {
    const matchDate = new Date(m.match_date)
    const locked = matchDate.getTime() - now.getTime() <= 60 * 60 * 1000 || m.status === 'finished'
    if (filter === 'pending') return !locked && !predictions[m.id]
    if (filter === 'upcoming') return m.status !== 'finished'
    return m.status === 'finished'
  })

  function timeUntilLock(matchDate: Date): string | null {
    const lockTime = matchDate.getTime() - 60 * 60 * 1000
    const diff = lockTime - now.getTime()
    if (diff <= 0) return null
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours >= 24) return null
    if (hours > 0) return `Cierra en ${hours}h ${minutes}m`
    return `Cierra en ${minutes}m`
  }

  const matchesByPhase = PHASE_ORDER.reduce<Record<string, Match[]>>((acc, phase) => {
    const filtered = filteredMatches.filter((m) => m.phase === phase)
    if (filtered.length > 0) acc[phase] = filtered
    return acc
  }, {})

  const pendingCount = matches.filter(
    (m) => m.status === 'scheduled' && new Date(m.match_date) > now && !predictions[m.id]
  ).length

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
          <h1 className="font-bold">⚽ Prode Mundial 2026</h1>
          {pendingCount > 0 && (
            <p className="text-yellow-400 text-xs">{pendingCount} partido{pendingCount !== 1 ? 's' : ''} sin predecir</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-green-300 text-sm">{session!.participantName}</span>
          {session!.isAdmin && (
            <button onClick={() => router.push('/admin')} className="text-xs text-yellow-400 underline">
              Admin
            </button>
          )}
          <button onClick={logout} className="text-xs text-red-400 underline">Salir</button>
        </div>
      </header>

      <div className="flex border-b border-green-700">
        <button
          onClick={() => setTab('fixture')}
          className={`flex-1 py-3 text-sm font-medium ${tab === 'fixture' ? 'bg-green-700' : ''}`}
        >
          Fixture
        </button>
        <button
          onClick={() => setTab('standings')}
          className={`flex-1 py-3 text-sm font-medium ${tab === 'standings' ? 'bg-green-700' : ''}`}
        >
          Tabla
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {tab === 'fixture' && (
          <div className="flex gap-2">
            {([
              { key: 'pending', label: 'Sin predecir' },
              { key: 'upcoming', label: 'Próximos' },
              { key: 'finished', label: 'Terminados' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === key
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-green-800 text-green-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {saveError && (
          <div className="bg-red-900 text-red-200 text-sm rounded-xl p-3">
            Error al guardar: {saveError}
          </div>
        )}

        {tab === 'fixture' && filteredMatches.length === 0 && (
          <p className="text-green-400 text-center text-sm py-8">
            {filter === 'pending' && '🎉 ¡Tenés todas las predicciones al día!'}
            {filter === 'upcoming' && 'No hay partidos próximos.'}
            {filter === 'finished' && 'Aún no hay partidos terminados.'}
          </p>
        )}

        {tab === 'fixture' && Object.entries(matchesByPhase).map(([phase, phaseMatches]) => (
          <div key={phase}>
            <h2 className="text-yellow-400 font-bold text-sm mb-3 uppercase tracking-wide">
              {PHASE_LABELS[phase]}
            </h2>
            <div className="space-y-2">
              {phaseMatches.map((match) => {
                const pred = predictions[match.id]
                const draft = drafts[match.id]
                const matchDate = new Date(match.match_date)
                const isLocked = matchDate.getTime() - now.getTime() <= 60 * 60 * 1000 || match.status === 'finished'
                const homeVal = draft?.home ?? (pred ? String(pred.home_score) : '')
                const awayVal = draft?.away ?? (pred ? String(pred.away_score) : '')

                return (
                  <div key={match.id} className={`rounded-xl p-3 space-y-2 ${match.status === 'finished' ? 'bg-green-950' : 'bg-green-800'}`}>
                    <div className="flex items-center justify-between text-xs text-green-400">
                      <span>{match.group_name ? `Grupo ${match.group_name} · ` : ''}{matchDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} {matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {match.status === 'finished' && (
                        <span className="text-yellow-400 font-bold">
                          {pred ? `${pred.points ?? 0} pts` : '—'}
                        </span>
                      )}
                      {!isLocked && timeUntilLock(matchDate) && (
                        <span className="text-orange-400 font-medium">
                          ⏱ {timeUntilLock(matchDate)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium truncate">{match.home_team}</span>

                      {match.status === 'finished' ? (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-white font-bold">{match.home_score} - {match.away_score}</span>
                          {pred && (
                            <span className="text-green-400 text-xs ml-2">({pred.home_score}-{pred.away_score})</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="99"
                            placeholder="0"
                            value={homeVal}
                            disabled={isLocked}
                            onChange={(e) => setDrafts((d) => ({ ...d, [match.id]: { ...d[match.id], home: e.target.value } }))}
                            className="w-10 px-1 py-1 rounded text-gray-900 text-center text-sm disabled:opacity-40"
                          />
                          <span className="text-green-400">-</span>
                          <input
                            type="number" min="0" max="99"
                            placeholder="0"
                            value={awayVal}
                            disabled={isLocked}
                            onChange={(e) => setDrafts((d) => ({ ...d, [match.id]: { ...d[match.id], away: e.target.value } }))}
                            className="w-10 px-1 py-1 rounded text-gray-900 text-center text-sm disabled:opacity-40"
                          />
                        </div>
                      )}

                      <span className="flex-1 text-sm font-medium truncate text-right">{match.away_team}</span>
                    </div>

                    {!isLocked && (
                      <button
                        onClick={() => savePrediction(match.id)}
                        disabled={savingId === match.id}
                        className="w-full py-1.5 bg-yellow-400 text-gray-900 text-xs font-bold rounded-lg disabled:opacity-40"
                      >
                        {savingId === match.id ? 'Guardando...' : pred ? 'Actualizar predicción' : 'Guardar predicción'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {tab === 'standings' && (
          <div className="space-y-2">
            {standings.length === 0 && (
              <p className="text-green-400 text-center text-sm">Aún no hay participantes.</p>
            )}
            {standings.map((p, i) => (
              <div key={p.name} className={`rounded-xl p-3 flex items-center gap-3 ${p.name === session!.participantName ? 'bg-yellow-400 text-gray-900' : 'bg-green-800'}`}>
                <span className="font-bold w-6 text-center">{i + 1}</span>
                <span className="flex-1 font-medium">{p.name}</span>
                <span className="font-bold">{p.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
