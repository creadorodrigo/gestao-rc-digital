import React, { useState } from 'react'
import { X, Phone, Briefcase } from 'lucide-react'
import type { MembroTime } from '../../types'

interface MemberModalProps {
    member?: MembroTime | null
    onSave: (data: Omit<MembroTime, 'id'>) => void
    onClose: () => void
}

export default function MemberModal({ member, onSave, onClose }: MemberModalProps) {
    const [form, setForm] = useState({
        nome: member?.nome || '',
        funcao: member?.funcao || '',
        telefone: member?.telefone || '',
        foto_url: member?.foto_url || '',
    })

    const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [f]: e.target.value }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.nome.trim()) return
        onSave(form)
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <h3 className="section-title">{member ? 'Editar Membro' : 'Novo Membro'}</h3>
                    <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
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
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">{member ? 'Salvar' : 'Adicionar'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
