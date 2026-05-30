export type Phase = 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'finished'

export interface DbGroup {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface Participant {
  id: string
  group_id: string
  name: string
  device_token: string
  is_admin: boolean
  created_at: string
}

export interface Match {
  id: string
  phase: Phase
  group_name: string | null
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  match_number: number | null
  created_at: string
}

export interface Prediction {
  id: string
  participant_id: string
  match_id: string
  home_score: number
  away_score: number
  points: number | null
  created_at: string
  updated_at: string
}

export interface Session {
  participantId: string
  participantName: string
  groupId: string
  deviceToken: string
  isAdmin: boolean
}
