import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

function calcPoints(predHome: number, predAway: number, realHome: number, realAway: number): number {
  if (predHome === realHome && predAway === realAway) return 3
  if (Math.sign(predHome - predAway) === Math.sign(realHome - realAway)) return 1
  return 0
}

export async function POST(req: NextRequest) {
  const { matchId, homeScore, awayScore } = await req.json()

  if (matchId == null || homeScore == null || awayScore == null) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { error: matchError } = await supabase
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
    .eq('id', matchId)

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 })
  }

  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, home_score, away_score')
    .eq('match_id', matchId)

  if (predictions && predictions.length > 0) {
    const updates = predictions.map((p) => ({
      id: p.id,
      points: calcPoints(p.home_score, p.away_score, homeScore, awayScore),
    }))

    for (const u of updates) {
      await supabase.from('predictions').update({ points: u.points }).eq('id', u.id)
    }
  }

  return NextResponse.json({ ok: true })
}
