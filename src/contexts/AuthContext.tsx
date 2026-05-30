'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@/types'

const SESSION_KEY = 'prode_session'

interface AuthContextType {
  session: Session | null
  isLoading: boolean
  login: (session: Session) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY)
    if (stored) {
      setSession(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [])

  const login = (session: Session) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setSession(session)
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
