import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Lead, LeadStatus } from '../types'
import { mockLeads } from '../lib/mockData'
import LeadModal from '../components/crm/LeadModal'

const PIPELINE: { status: LeadStatus; color: string; dot: string }[] = [
    { status: 'Leads', color: 'bg-gray-400', dot: 'text-gray-400' },
    { status: 'Contato Feito', color: 'bg-blue-400', dot: 'text-blue-400' },
    { status: 'Proposta Enviada', color: 'bg-indigo-400', dot: 'text-indigo-400' },
    { status: 'Negociação', color: 'bg-yellow-400', dot: 'text-yellow-400' },
    { status: 'Fechado', color: 'bg-green-400', dot: 'text-green-400' },
    { status: 'Perdido', color: 'bg-red-400', dot: 'text-red-400' },
]

function genId() { return Math.random().toString(36).slice(2) }

function brl(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

const ORIGEM_BADGE: Record<string, string> = {
    'Indicação': 'bg-green-500/20 text-green-400',
    'Instagram': 'bg-pink-500/20 text-pink-400',
    'LinkedIn': 'bg-blue-500/20 text-blue-400',
    'Google': 'bg-yellow-500/20 text-yellow-400',
    'Evento': 'bg-purple-500/20 text-purple-400',
    'Outro': 'bg-gray-500/20 text-gray-400',
}

export default function CRM() {
    const [leads, setLeads] = useState<Lead[]>(mockLeads)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Lead | null>(null)
    const [defaultStatus, setDefaultStatus] = useState<LeadStatus>('Leads')

    const openNew = (status: LeadStatus = 'Leads') => { setDefaultStatus(status); setEditing(null); setShowModal(true) }
    const openEdit = (l: Lead) => { setEditing(l); setShowModal(true) }
    const closeModal = () => { setShowModal(false); setEditing(null) }

    const handleSave = (data: Omit<Lead, 'id' | 'criado_em'>) => {
        if (editing) {
            setLeads(prev => prev.map(l => l.id === editing.id ? { ...l, ...data } : l))
        } else {
            setLeads(prev => [...prev, { ...data, id: genId(), criado_em: new Date().toISOString() }])
        }
        closeModal()
    }

    const totalFechado = leads.filter(l => l.status === 'Fechado').reduce((s, l) => s + l.valor_estimado, 0)
    const totalPipeline = leads.filter(l => !['Fechado', 'Perdido'].includes(l.status)).reduce((s, l) => s + l.valor_estimado, 0)

    return (
        <div className="flex flex-col h-screen">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500 bg-dark-200/50 flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white">CRM</h1>
                    <p className="text-gray-500 text-xs mt-0.5">
                        Pipeline: <span className="text-gold font-mono">{brl(totalPipeline)}</span>
                        <span className="mx-2">·</span>
                        Fechado: <span className="text-green-400 font-mono">{brl(totalFechado)}</span>
                    </p>
                </div>
                <button onClick={() => openNew()} className="btn-primary"><Plus size={14} /> Novo Lead</button>
            </div>

            {/* Pipeline */}
            <div className="flex-1 overflow-x-auto p-6">
                <div className="flex gap-4 h-full min-w-max">
                    {PIPELINE.map(({ status, color }) => {
                        const col = leads.filter(l => l.status === status)
                        const colValue = col.reduce((s, l) => s + l.valor_estimado, 0)
                        return (
                            <div key={status} className="kanban-column flex-shrink-0">
                                {/* Column header */}
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${color}`} />
                                        <span className="text-sm font-semibold text-gray-300">{status}</span>
                                        <span className="text-xs font-bold text-gray-600 bg-dark-500 px-1.5 py-0.5 rounded-full font-mono">{col.length}</span>
                                    </div>
                                    <button
                                        onClick={() => openNew(status)}
                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                {/* Column value */}
                                {colValue > 0 && (
                                    <p className="text-[10px] font-mono text-gold/60 px-1 mb-2">{brl(colValue)}</p>
                                )}

                                {/* Lead cards */}
                                <div className="space-y-2 flex-1 overflow-y-auto">
                                    {col.length === 0 ? (
                                        <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-dark-600 rounded-xl">Nenhum lead</div>
                                    ) : col.map(l => (
                                        <div
                                            key={l.id}
                                            onClick={() => openEdit(l)}
                                            className="card-hover border-l-2 border-l-gold/30"
                                        >
                                            <p className="font-semibold text-gray-200 text-sm mb-1">{l.empresa}</p>
                                            {l.contato && <p className="text-xs text-gray-500 mb-2 truncate">{l.contato}</p>}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono font-bold text-gold">{brl(l.valor_estimado)}</span>
                                                {l.origem && (
                                                    <span className={`badge ${ORIGEM_BADGE[l.origem] || 'bg-gray-500/20 text-gray-400'}`}>
                                                        {l.origem}
                                                    </span>
                                                )}
                                            </div>
                                            {l.notas && (
                                                <p className="text-[10px] text-gray-600 mt-2 line-clamp-2">{l.notas}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {showModal && (
                <LeadModal
                    lead={editing}
                    defaultStatus={defaultStatus}
                    onSave={handleSave}
                    onClose={closeModal}
                />
            )}
        </div>
    )
}
