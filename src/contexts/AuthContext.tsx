import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { UserRole } from '../types'

const USER_CACHE_KEY = 'rc_cached_user'
const ADMIN_EMAILS = ['creado.rodrigo@gmail.com']

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

function getCachedUser(): AuthUser | null {
    try {
        const raw = localStorage.getItem(USER_CACHE_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

function setCachedUser(u: AuthUser | null) {
    if (u) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_CACHE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    // Initialise instantly from cache — eliminates blank spinner on refresh
    const [user, setUser] = useState<AuthUser | null>(() => getCachedUser())
    const [loading] = useState(false) // Never block rendering — auth resolves in background

    const resolveUser = (authUser: AuthUser | null) => {
        setUser(authUser)
        setCachedUser(authUser)
    }

    const loadUserProfile = async (id: string, email: string) => {
        try {
            const { data } = await supabase!.from('usuarios').select('*').eq('id', id).single()
            const role: UserRole = (data?.role as UserRole) || (ADMIN_EMAILS.includes(email) ? 'admin' : 'team')
            resolveUser({ id: data?.id || id, email: data?.email || email, nome: data?.nome || email, role })
        } catch {
            const role: UserRole = ADMIN_EMAILS.includes(email) ? 'admin' : 'team'
            resolveUser({ id, email, nome: email, role })
        }
    }

    useEffect(() => {
        if (!isSupabaseConfigured) {
            const stored = localStorage.getItem('rc_demo_user')
            if (stored) {
                try { resolveUser(JSON.parse(stored)) } catch { resolveUser(null) }
            } else {
                resolveUser(null)
            }
            return
        }

        const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
            // IMPORTANT: must NOT be async — Supabase SDK awaits all subscribers before
            // returning from signInWithPassword, so any await here blocks the entire login.
            // Run profile loading as a detached fire-and-forget task instead.
            if (session?.user) {
                loadUserProfile(session.user.id, session.user.email || '')
                    .catch(() => {
                        // Last-resort fallback if loadUserProfile throws
                        const role: UserRole = ADMIN_EMAILS.includes(session.user!.email || '') ? 'admin' : 'team'
                        resolveUser({ id: session.user!.id, email: session.user!.email || '', nome: session.user!.email || '', role })
                    })
            } else {
                resolveUser(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
        if (!isSupabaseConfigured) {
            const demo = DEMO_USERS.find(u => u.email === email)
            if (demo && DEMO_PASSWORDS[email] === password) {
                setUser(demo)
                localStorage.setItem('rc_demo_user', JSON.stringify(demo))
                return { error: null }
            }
            return { error: 'E-mail ou senha inválidos.' }
        }

        try {
            const { error } = await supabase!.auth.signInWithPassword({ email, password })
            if (error) return { error: 'E-mail ou senha inválidos.' }
            return { error: null }
        } catch {
            return { error: 'Erro ao conectar com o servidor. Tente novamente.' }
        }
    }

    const signOut = () => {
        if (!isSupabaseConfigured) {
            resolveUser(null)
            localStorage.removeItem('rc_demo_user')
            return
        }
        supabase!.auth.signOut()
        resolveUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}
