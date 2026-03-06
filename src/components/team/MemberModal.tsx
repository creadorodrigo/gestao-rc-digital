import React, { useState } from 'react'
import { X, Phone, Briefcase, Mail, Lock, ShieldCheck } from 'lucide-react'
import type { MembroTime } from '../../types'

interface MemberModalProps {
    member?: MembroTime | null
    onSave: (data: Omit<MembroTime, 'id'>) => void
    onSaveNew?: (data: Omit<MembroTime, 'id'> & { email: string; password: string; role: 'admin' | 'team' }) => void
    onClose: () => void
}

export default function MemberModal({ member, onSave, onSaveNew, onClose }: MemberModalProps) {
    const isEditing = !!member

    const [form, setForm] = useState({
        nome: member?.nome || '',
        funcao: member?.funcao || '',
        telefone: member?.telefone || '',
        foto_url: member?.foto_url || '',
    })

    const [authForm, setAuthForm] = useState({
        email: '',
        password: '',
        role: 'team' as 'admin' | 'team',
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [f]: e.target.value }))

    const setAuth = (f: keyof typeof authForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setAuthForm(prev => ({ ...prev, [f]: e.target.value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.nome.trim()) return
        setError('')
        setLoading(true)

        if (!isEditing && onSaveNew) {
            if (!authForm.email.trim() || !authForm.password.trim()) {
                setError('E-mail e senha são obrigatórios para criar um novo usuário.')
                setLoading(false)
                return
            }
            if (authForm.password.length < 6) {
                setError('A senha deve ter pelo menos 6 caracteres.')
                setLoading(false)
                return
            }
            await onSaveNew({ ...form, ...authForm })
        } else {
            onSave(form)
        }

        setLoading(false)
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <h3 className="section-title">{isEditing ? 'Editar Membro' : 'Novo Usuário do Time'}</h3>
                    <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">

                        {/* Perfil */}
                        <div className="space-y-3">
                            <div>
                                <label className="form-label">Nome *</label>
                                <input className="form-input" value={form.nome} onChange={set('nome')} placeholder="Nome completo" required />
                            </div>
                            <div>
                                <label className="form-label"><Briefcase size={10} className="inline mr-1" />Função</label>
                                <input className="form-input" value={form.funcao} onChange={set('funcao')} placeholder="Ex: Gestor de Tráfego" />
                            </div>
                            <div>
                                <label className="form-label"><Phone size={10} className="inline mr-1" />Telefone</label>
                                <input className="form-input" value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" />
                            </div>
                            <div>
                                <label className="form-label">URL da Foto</label>
                                <input className="form-input" value={form.foto_url} onChange={set('foto_url')} placeholder="https://..." />
                            </div>
                        </div>

                        {/* Acesso ao sistema — apenas ao criar */}
                        {!isEditing && (
                            <div className="mt-4 p-4 bg-gold/5 border border-gold/20 rounded-xl space-y-3">
                                <p className="text-xs font-bold text-gold/70 uppercase tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck size={10} /> Acesso ao Sistema
                                </p>
                                <div>
                                    <label className="form-label"><Mail size={10} className="inline mr-1" />E-mail de acesso *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={authForm.email}
                                        onChange={setAuth('email')}
                                        placeholder="email@exemplo.com"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="form-label"><Lock size={10} className="inline mr-1" />Senha provisória *</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={authForm.password}
                                        onChange={setAuth('password')}
                                        placeholder="Mínimo 6 caracteres"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div>
                                    <label className="form-label"><ShieldCheck size={10} className="inline mr-1" />Nível de acesso</label>
                                    <select
                                        className="form-select"
                                        value={authForm.role}
                                        onChange={setAuth('role')}
                                    >
                                        <option value="team">Time — acesso padrão</option>
                                        <option value="admin">Admin — acesso total</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                                    Criando...
                                </span>
                            ) : isEditing ? 'Salvar' : 'Criar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
