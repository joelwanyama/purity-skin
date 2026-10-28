import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'

export type AuthValue = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<string | null>
}

export const AuthContext = createContext<AuthValue | null>(null)
