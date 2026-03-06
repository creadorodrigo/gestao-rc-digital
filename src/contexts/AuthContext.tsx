import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { UserRole } from '../types'

interface AuthUser {
    id: string
    email: string
    nome: string
    role: UserRole
}

interface AuthContextType {
    user: AuthUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signOut: () => { },
})

export const useAuth = () => useContext(AuthContext)

// Demo users for mock mode (no Supabase)
const DEMO_USERS: AuthUser[] = [
    { id: 'admin-1', email: 'creado.rodrigo@gmail.com', nome: 'Rodrigo Carvalho', role: 'admin' },
    { id: 'team-1', email: 'ana@rcdigital.com', nome: 'Ana Paula', role: 'team' },
]
const DEMO_PASSWORDS: Record<string, string> = {
    'creado.rodrigo@gmail.com': 'admin123',
    'ana@rcdigital.com': 'team123',
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isSupabaseConfigured) {
            // Check localStorage for persisted demo session
            const stored = localStorage.getItem('rc_demo_user')
            if (stored) setUser(JSON.parse(stored))
            setLoading(false)
            return
        }

        // Real Supabase auth
        supabase!.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                await loadUserProfile(session.user.id, session.user.email || '')
            }
            setLoading(false)
        })

        const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                await loadUserProfile(session.user.id, session.user.email || '')
            } else {
                setUser(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const ADMIN_EMAILS = ['creado.rodrigo@gmail.com']

    const loadUserProfile = async (id: string, email: string) => {
        const { data } = await supabase!.from('usuarios').select('*').eq('id', id).single()
        if (data) {
            setUser({ id: data.id, email: data.email || email, nome: data.nome || email, role: data.role || 'team' })
        } else {
            // Fallback: derive role from known admin emails when no DB row exists
            const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'team'
            setUser({ id, email, nome: email, role })
        }
    }

    const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
        if (!isSupabaseConfigured) {
            // Demo mode
            const demo = DEMO_USERS.find(u => u.email === email)
            if (demo && DEMO_PASSWORDS[email] === password) {
                setUser(demo)
                localStorage.setItem('rc_demo_user', JSON.stringify(demo))
                return { error: null }
            }
            return { error: 'E-mail ou senha inválidos.' }
        }

        const { error } = await supabase!.auth.signInWithPassword({ email, password })
        if (error) return { error: 'E-mail ou senha inválidos.' }
        return { error: null }
    }

    const signOut = () => {
        if (!isSupabaseConfigured) {
            setUser(null)
            localStorage.removeItem('rc_demo_user')
            return
        }
        supabase!.auth.signOut()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}
