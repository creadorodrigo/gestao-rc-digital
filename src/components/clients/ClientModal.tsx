import { useState } from 'react'
import { X, Lock, Globe, TrendingUp, Calendar } from 'lucide-react'
import type { Cliente, ClientStatus, ClientType } from '../../types'

interface ClientModalProps {
    client?: Cliente | null
    isAdmin: boolean
    onSave: (data: Omit<Cliente, 'id' | 'criado_em'>) => void
    onClose: () => void
    onDelete?: (id: string) => void
}

const STATUS_OPTIONS: ClientStatus[] = ['Prospectando', 'Ativo', 'Encerrado']
const TYPE_OPTIONS: ClientType[] = ['E-commerce', 'Negócio Local', 'Info Produto', 'Outros']
const RESPONSAVEIS = ['Rodrigo', 'Ana', 'Lucas', 'Camila']

const PROGRESS_COLOR = (pct: number) =>
    pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'

const NPS_CLASS = (nps?: number) => {
    if (nps === undefined) return { label: '—', color: 'text-gray-500' }
    if (nps >= 9) return { label: 'Promotor', color: 'text-green-400' }
    if (nps >= 7) return { label: 'Neutro', color: 'text-yellow-400' }
    return { label: 'Detrator', color: 'text-red-400' }
}

function brl(val?: number) {
    if (val === undefined || val === null) return '—'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function ClientModal({ client, isAdmin, onSave, onClose, onDelete }: ClientModalProps) {
    const [tab, setTab] = useState<'info' | 'edit'>(!client ? 'edit' : 'info')
    const [form, setForm] = useState<Omit<Cliente, 'id' | 'criado_em'>>({
        nome: client?.nome || '',
        site: client?.site || '',
        tipo: client?.tipo || 'Outros',
        status: client?.status || 'Prospectando',
        investimento_mensal: client?.investimento_mensal || 0,
        conta_meta_ads: client?.conta_meta_ads || '',
        conta_google_ads: client?.conta_google_ads || '',
        meta_faturamento: client?.meta_faturamento || 0,
        faturado_ate_data: client?.faturado_ate_data || 0,
        responsaveis: client?.responsaveis || [],
        contrato_mensal: client?.contrato_mensal || 0,
        vigencia_inicio: client?.vigencia_inicio || '',
        vigencia_fim: client?.vigencia_fim || '',
        nps: client?.nps,
    })

    const set = (field: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setForm(f => ({ ...f, [field]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))

    const toggleResponsavel = (name: string) => {
        setForm(f => ({
            ...f,
            responsaveis: f.responsaveis.includes(name)
                ? f.responsaveis.filter(r => r !== name)
                : [...f.responsaveis, name]
        }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.nome.trim()) return
        onSave(form)
    }

    const progressPct = form.meta_faturamento > 0
        ? Math.min(100, Math.round((form.faturado_ate_data / form.meta_faturamento) * 100))
        : 0

    const npsInfo = NPS_CLASS(form.nps)

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box-lg max-h-[90vh] flex flex-col">
                <div className="modal-header flex-shrink-0">
                    <div>
                        <h3 className="section-title">{client ? client.nome : 'Novo Cliente'}</h3>
                        {client && <p className="text-gray-500 text-xs mt-0.5">{client.site}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        {client && (
                            <>
                                <button onClick={() => setTab('info')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${tab === 'info' ? 'bg-gold/10 text-gold border border-gold/20' : 'text-gray-500 hover:text-gray-300'}`}>Visão Geral</button>
                                {isAdmin && <button onClick={() => setTab('edit')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${tab === 'edit' ? 'bg-gold/10 text-gold border border-gold/20' : 'text-gray-500 hover:text-gray-300'}`}>Editar</button>}
                            </>
                        )}
                        <button onClick={onClose} className="btn-ghost p-1.5 ml-2"><X size={16} /></button>
                    </div>
                </div>

                {/* Info tab */}
                {tab === 'info' && client && (
                    <div className="modal-body">
                        {/* Progress bar */}
                        <div className="p-4 bg-dark-400 rounded-xl border border-dark-600">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                                    <TrendingUp size={11} /> Meta de Faturamento
                                </span>
                                <span className="text-xs font-bold text-gold font-mono">{progressPct}%</span>
                            </div>
                            <div className="w-full bg-dark-600 rounded-full h-2.5 mb-2">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${PROGRESS_COLOR(progressPct)}`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-400">Faturado: <span className="text-gray-200">{brl(client.faturado_ate_data)}</span></span>
                                <span className="text-gray-400">Meta: <span className="text-gray-200">{brl(client.meta_faturamento)}</span></span>
                            </div>
                        </div>

                        {/* Public info */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <Info label="Tipo" value={client.tipo} />
                            <Info label="Status" value={client.status} />
                            <Info label="Investimento Mensal" value={brl(client.investimento_mensal)} />
                            <Info label="Responsáveis" value={client.responsaveis.join(', ') || '—'} />
                            <Info label="Conta Meta Ads" value={client.conta_meta_ads || '—'} />
                            <Info label="Conta Google Ads" value={client.conta_google_ads || '—'} />
                        </div>

                        {/* Admin-only info */}
                        {isAdmin && (
                            <div className="p-4 bg-gold/5 border border-gold/15 rounded-xl">
                                <p className="text-xs font-bold text-gold/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Lock size={10} /> Informações Restritas
                                </p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <Info label="Contrato Mensal" value={brl(client.contrato_mensal)} />
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">NPS</p>
                                        <p className="font-semibold text-gray-200">{client.nps ?? '—'} <span className={`text-xs ${npsInfo.color}`}>({npsInfo.label})</span></p>
                                    </div>
                                    <Info label="Vigência Início" value={fmtDate(client.vigencia_inicio)} />
                                    <Info label="Vigência Fim" value={fmtDate(client.vigencia_fim)} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Edit tab */}
                {tab === 'edit' && (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        <div className="modal-body">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="form-label">Nome *</label>
                                    <input className="form-input" value={form.nome} onChange={set('nome')} placeholder="Nome do cliente" required />
                                </div>
                                <div>
                                    <label className="form-label"><Globe size={10} className="inline mr-1" />Site</label>
                                    <input className="form-input" value={form.site} onChange={set('site')} placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="form-label">Tipo</label>
                                    <select className="form-select" value={form.tipo} onChange={set('tipo')}>
                                        {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={form.status} onChange={set('status')}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Invest. Mensal (R$)</label>
                                    <input type="number" className="form-input font-mono" value={form.investimento_mensal} onChange={set('investimento_mensal')} min={0} />
                                </div>
                                <div>
                                    <label className="form-label">Conta Meta Ads</label>
                                    <input className="form-input" value={form.conta_meta_ads} onChange={set('conta_meta_ads')} />
                                </div>
                                <div>
                                    <label className="form-label">Conta Google Ads</label>
                                    <input className="form-input" value={form.conta_google_ads} onChange={set('conta_google_ads')} />
                                </div>
                                <div>
                                    <label className="form-label">Meta de Faturamento (R$)</label>
                                    <input type="number" className="form-input font-mono" value={form.meta_faturamento} onChange={set('meta_faturamento')} min={0} />
                                </div>
                                <div>
                                    <label className="form-label">Faturado até a Data (R$)</label>
                                    <input type="number" className="form-input font-mono" value={form.faturado_ate_data} onChange={set('faturado_ate_data')} min={0} />
                                </div>
                            </div>

                            {/* Responsáveis */}
                            <div>
                                <label className="form-label">Responsáveis</label>
                                <div className="flex flex-wrap gap-2">
                                    {RESPONSAVEIS.map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => toggleResponsavel(r)}
                                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${form.responsaveis.includes(r)
                                                ? 'bg-gold/20 text-gold border-gold/40'
                                                : 'bg-dark-500 text-gray-500 border-dark-600 hover:text-gray-300'
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Admin-only fields */}
                            {isAdmin && (
                                <div className="p-4 bg-gold/5 border border-gold/15 rounded-xl space-y-3">
                                    <p className="text-xs font-bold text-gold/70 uppercase tracking-wider flex items-center gap-1.5">
                                        <Lock size={10} /> Campos Restritos (Admin)
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="form-label">Contrato Mensal (R$)</label>
                                            <input type="number" className="form-input font-mono" value={form.contrato_mensal || 0} onChange={set('contrato_mensal')} min={0} />
                                        </div>
                                        <div>
                                            <label className="form-label">NPS (0–10)</label>
                                            <input type="number" className="form-input font-mono" value={form.nps ?? ''} onChange={e => setForm(f => ({ ...f, nps: e.target.value === '' ? undefined : Number(e.target.value) }))} min={0} max={10} />
                                        </div>
                                        <div>
                                            <label className="form-label"><Calendar size={10} className="inline mr-1" />Vigência Início</label>
                                            <input type="date" className="form-input" value={form.vigencia_inicio} onChange={set('vigencia_inicio')} />
                                        </div>
                                        <div>
                                            <label className="form-label"><Calendar size={10} className="inline mr-1" />Vigência Fim</label>
                                            <input type="date" className="form-input" value={form.vigencia_fim} onChange={set('vigencia_fim')} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer flex-shrink-0">
                            {client && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(client.id)}
                                    className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
                                >
                                    Excluir Cliente
                                </button>
                            )}
                            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                            <button type="submit" className="btn-primary">{client ? 'Salvar' : 'Criar Cliente'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-200">{value}</p>
        </div>
    )
}

function fmtDate(d?: string) {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
}
