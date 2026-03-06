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
    const [loading, setLoading] = useState<boolean>(() => !getCachedUser())

    const resolveUser = (authUser: AuthUser | null) => {
        setUser(authUser)
        setCachedUser(authUser)
        setLoading(false)
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

        // Safety net: if onAuthStateChange never fires within 6s, force-resolve
        const timeout = setTimeout(() => {
            setLoading(false)
        }, 6000)

        const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (_event, session) => {
            clearTimeout(timeout)
            try {
                if (session?.user) {
                    await loadUserProfile(session.user.id, session.user.email || '')
                } else {
                    // No active session — clear cache and redirect to login
                    resolveUser(null)
                }
            } catch {
                setLoading(false)
            }
        })

        return () => { clearTimeout(timeout); subscription.unsubscribe() }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

        const { error } = await supabase!.auth.signInWithPassword({ email, password })
        if (error) return { error: 'E-mail ou senha inválidos.' }
        return { error: null }
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
