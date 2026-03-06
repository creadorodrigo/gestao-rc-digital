import React, { useState } from 'react'
import { X, DollarSign, User, MapPin, StickyNote } from 'lucide-react'
import type { Lead, LeadStatus } from '../../types'

interface LeadModalProps {
    lead?: Lead | null
    defaultStatus?: LeadStatus
    onSave: (data: Omit<Lead, 'id' | 'criado_em'>) => void
    onDelete?: (id: string) => void
    onClose: () => void
}

const STATUS_OPTIONS: LeadStatus[] = ['Leads', 'Contato Feito', 'Proposta Enviada', 'Negociação', 'Fechado', 'Perdido']
const ORIGENS = ['Indicação', 'Instagram', 'LinkedIn', 'Google', 'Evento', 'Outro']

export default function LeadModal({ lead, defaultStatus, onSave, onDelete, onClose }: LeadModalProps) {
    const [form, setForm] = useState({
        empresa: lead?.empresa || '',
        contato: lead?.contato || '',
        valor_estimado: lead?.valor_estimado || 0,
        origem: lead?.origem || '',
        notas: lead?.notas || '',
        status: lead?.status || defaultStatus || 'Leads',
    })

    const set = (f: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            setForm(p => ({ ...p, [f]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.empresa.trim()) return
        onSave(form)
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <h3 className="section-title">{lead ? 'Editar Lead' : 'Novo Lead'}</h3>
                    <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div>
                            <label className="form-label">Empresa *</label>
                            <input className="form-input" value={form.empresa} onChange={set('empresa')} placeholder="Nome da empresa" required />
                        </div>
                        <div>
                            <label className="form-label"><User size={10} className="inline mr-1" />Contato</label>
                            <input className="form-input" value={form.contato} onChange={set('contato')} placeholder="Nome — (11) 9xxxx-xxxx" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="form-label"><DollarSign size={10} className="inline mr-1" />Valor Estimado (R$)</label>
                                <input type="number" className="form-input font-mono" value={form.valor_estimado} onChange={set('valor_estimado')} min={0} />
                            </div>
                            <div>
                                <label className="form-label"><MapPin size={10} className="inline mr-1" />Origem</label>
                                <select className="form-select" value={form.origem} onChange={set('origem')}>
                                    <option value="">Selecione</option>
                                    {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Status</label>
                            <select className="form-select" value={form.status} onChange={set('status')}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label"><StickyNote size={10} className="inline mr-1" />Notas</label>
                            <textarea className="form-input resize-none" rows={3} value={form.notas} onChange={set('notas')} placeholder="Observações sobre o lead..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        {lead && onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(lead.id)}
                                className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
                            >
                                Excluir Lead
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">{lead ? 'Salvar' : 'Criar Lead'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
