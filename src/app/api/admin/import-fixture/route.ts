import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { Phase } from '@/types'

const STAGE_MAP: Record<string, Phase> = {
  GROUP_STAGE: 'group',
  LAST_32: 'round_of_32',
  ROUND_OF_16: 'round_of_16',
  QUARTER_FINALS: 'quarter',
  SEMI_FINALS: 'semi',
  THIRD_PLACE: 'third_place',
  FINAL: 'final',
}

function teamName(team: any): string {
  return team?.name || team?.shortName || team?.tla || 'TBD'
}

function calcPoints(predHome: number, predAway: number, realHome: number, realAway: number): number {
  if (predHome === realHome && predAway === realAway) return 3
  if (Math.sign(predHome - predAway) === Math.sign(realHome - realAway)) return 1
  return 0
}

export async function POST() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'FOOTBALL_DATA_API_KEY no está configurada en .env.local' },
      { status: 500 }
    )
  }

  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches',
    { headers: { 'X-Auth-Token': apiKey } }
  )

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: `Error de la API: ${res.status} - ${text}` },
      { status: 500 }
    )
  }

  const data = await res.json()
  const matches = data.matches as any[]

  const rows = matches.map((m: any, i: number) => ({
    external_id: m.id,
    phase: STAGE_MAP[m.stage] ?? 'group',
    group_name: m.group ? m.group.replace('GROUP_', '') : null,
    home_team: teamName(m.homeTeam),
    away_team: teamName(m.awayTeam),
    match_date: m.utcDate,
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    status: m.status === 'FINISHED' ? 'finished' : m.status === 'IN_PLAY' ? 'live' : 'scheduled',
    match_number: i + 1,
  }))

  const supabase = createServerClient()
  const { error } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'external_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('id, home_score, away_score')
    .eq('status', 'finished')

  for (const match of finishedMatches ?? []) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('id, home_score, away_score')
      .eq('match_id', match.id)

    for (const pred of preds ?? []) {
      const points = calcPoints(pred.home_score, pred.away_score, match.home_score!, match.away_score!)
      await supabase.from('predictions').update({ points }).eq('id', pred.id)
    }
  }

  return NextResponse.json({ imported: rows.length, pointsRecalculated: finishedMatches?.length ?? 0 })
}
