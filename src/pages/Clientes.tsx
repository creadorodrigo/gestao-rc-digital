import { useState } from 'react'
import { Plus, LayoutGrid, List, Search } from 'lucide-react'
import type { Cliente } from '../types'
import { mockClientes } from '../lib/mockData'
import { useAuth } from '../contexts/AuthContext'
import ClientCard from '../components/clients/ClientCard'
import ClientModal from '../components/clients/ClientModal'

const STATUS_ORDER = ['Prospectando', 'Ativo', 'Encerrado'] as const

const KANBAN_STATUS_COLORS: Record<string, string> = {
    Prospectando: 'bg-purple-400',
    Ativo: 'bg-green-400',
    Encerrado: 'bg-red-400',
}

function genId() { return Math.random().toString(36).slice(2) }

function brl(v?: number) {
    if (!v) return 'R$ 0'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

export default function Clientes() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'
    const [clients, setClients] = useState<Cliente[]>(mockClientes)
    const [view, setView] = useState<'list' | 'kanban'>('kanban')
    const [search, setSearch] = useState('')
    const [modalClient, setModalClient] = useState<Cliente | null | undefined>(undefined)
    const [showModal, setShowModal] = useState(false)

    const filtered = clients.filter(c =>
        c.nome.toLowerCase().includes(search.toLowerCase())
    )

    const openNew = () => { setModalClient(null); setShowModal(true) }
    const openEdit = (c: Cliente) => { setModalClient(c); setShowModal(true) }
    const closeModal = () => { setShowModal(false); setModalClient(undefined) }

    const handleSave = (data: Omit<Cliente, 'id' | 'criado_em'>) => {
        if (modalClient) {
            setClients(prev => prev.map(c => c.id === modalClient.id ? { ...c, ...data } : c))
        } else {
            setClients(prev => [...prev, { ...data, id: genId(), criado_em: new Date().toISOString() }])
        }
        closeModal()
    }

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500 bg-dark-200/50 flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white">Clientes</h1>
                    <p className="text-gray-500 text-xs mt-0.5">
                        {clients.filter(c => c.status === 'Ativo').length} ativos · {clients.length} total
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            className="form-input pl-8 pr-3 py-1.5 text-xs w-48"
                            placeholder="Buscar cliente..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {/* View toggle */}
                    <div className="flex bg-dark-400 rounded-lg p-0.5 border border-dark-600">
                        <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-dark-600 text-gold' : 'text-gray-500 hover:text-gray-300'}`}>
                            <LayoutGrid size={14} />
                        </button>
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-dark-600 text-gold' : 'text-gray-500 hover:text-gray-300'}`}>
                            <List size={14} />
                        </button>
                    </div>
                    <button onClick={openNew} className="btn-primary"><Plus size={14} /> Novo Cliente</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {view === 'kanban' ? (
                    /* Kanban view */
                    <div className="flex gap-4 h-full min-w-max">
                        {STATUS_ORDER.map(status => {
                            const col = filtered.filter(c => c.status === status)
                            return (
                                <div key={status} className="kanban-column flex-shrink-0">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <div className={`w-2 h-2 rounded-full ${KANBAN_STATUS_COLORS[status]}`} />
                                        <span className="text-sm font-semibold text-gray-300">{status}</span>
                                        <span className="text-xs font-bold text-gray-600 bg-dark-500 px-1.5 py-0.5 rounded-full font-mono">{col.length}</span>
                                    </div>
                                    <div className="space-y-2 overflow-y-auto">
                                        {col.length === 0 ? (
                                            <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-dark-600 rounded-xl">Nenhum cliente</div>
                                        ) : col.map(c => (
                                            <ClientCard key={c.id} client={c} isAdmin={isAdmin} onClick={() => openEdit(c)} />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    /* List view */
                    <div className="card overflow-hidden p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-dark-500">
                                    {['Cliente', 'Tipo', 'Status', 'Invest. Mensal', 'Meta', 'Faturado', 'Responsáveis', ...(isAdmin ? ['Contrato'] : [])].map(h => (
                                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c, i) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => openEdit(c)}
                                        className={`border-b border-dark-500/50 hover:bg-dark-400/50 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-dark-400/20'}`}
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-200">{c.nome}</p>
                                            <p className="text-gray-600 text-xs">{c.site}</p>
                                        </td>
                                        <td className="px-4 py-3"><span className="badge bg-dark-500 text-gray-400">{c.tipo}</span></td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${c.status === 'Ativo' ? 'bg-green-500/20 text-green-400' : c.status === 'Prospectando' ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-300">{brl(c.investimento_mensal)}</td>
                                        <td className="px-4 py-3 font-mono text-gray-300">{brl(c.meta_faturamento)}</td>
                                        <td className="px-4 py-3 font-mono text-gray-300">{brl(c.faturado_ate_data)}</td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{c.responsaveis.join(', ') || '—'}</td>
                                        {isAdmin && <td className="px-4 py-3 font-mono text-gold/80">{brl(c.contrato_mensal)}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <ClientModal
                    client={modalClient}
                    isAdmin={isAdmin}
                    onSave={handleSave}
                    onClose={closeModal}
                />
            )}
        </div>
    )
}
