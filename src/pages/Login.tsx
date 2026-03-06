import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error: err } = await signIn(email, password)
        if (err) setError(err)
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
            {/* Background gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/3 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative mb-4">
                        <div className="w-20 h-20 bg-dark-300 border border-gold/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-gold/10 rotate-45">
                            <span className="font-bold text-gold text-2xl tracking-tight -rotate-45" style={{ fontFamily: 'Nunito' }}>RC</span>
                        </div>
                        <div className="absolute -inset-1 bg-gold/10 rounded-2xl rotate-45 -z-10 blur-sm" />
                    </div>
                    <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Nunito' }}>RC Digital</h1>
                    <p className="text-gray-500 text-sm mt-1">Gestão de Agência</p>
                </div>

                {/* Card */}
                <div className="bg-dark-300 border border-dark-500 rounded-2xl p-8 shadow-2xl shadow-black/50">
                    <h2 className="text-lg font-semibold text-gray-200 mb-6">Bem-vindo de volta</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="form-label">E-mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="form-input"
                                placeholder="seu@email.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label className="form-label">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="form-input"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gold hover:bg-gold-300 text-dark font-semibold py-3 rounded-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                            ) : null}
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                </div>


            </div>
        </div>
    )
}
