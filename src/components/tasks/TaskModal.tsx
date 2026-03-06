import { useState } from 'react'
import { X, Calendar, User, Tag, RotateCcw, Building2, AlertCircle } from 'lucide-react'
import type { Tarefa, TaskStatus, TaskPriority, TaskRecurrence, Cliente } from '../../types'

interface TaskModalProps {
    task?: Tarefa | null
    clientes: Cliente[]
    defaultStatus?: TaskStatus
    onSave: (task: Omit<Tarefa, 'id' | 'criado_em'>) => void
    onClose: () => void
}

const PRIORITIES: TaskPriority[] = ['alta', 'média', 'baixa']
const STATUSES: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído']
const RECURRENCES: TaskRecurrence[] = ['não', 'diária', 'semanal', 'quinzenal', 'mensal']
const ASSIGNEES = ['Rodrigo', 'Ana', 'Lucas', 'Camila']

export default function TaskModal({ task, clientes, defaultStatus, onSave, onClose }: TaskModalProps) {
    const [form, setForm] = useState<Omit<Tarefa, 'id' | 'criado_em'>>({
        titulo: task?.titulo || '',
        descricao: task?.descricao || '',
        cliente_id: task?.cliente_id || '',
        cliente_nome: task?.cliente_nome || '',
        solicitante: task?.solicitante || '',
        responsavel: task?.responsavel || '',
        prioridade: task?.prioridade || 'média',
        status: task?.status || defaultStatus || 'A Fazer',
        data_vencimento: task?.data_vencimento || '',
        recorrencia: task?.recorrencia || 'não',
    })

    const handleClienteChange = (id: string) => {
        const cliente = clientes.find(c => c.id === id)
        setForm(f => ({ ...f, cliente_id: id, cliente_nome: cliente?.nome || '' }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.titulo.trim()) return
        onSave(form)
    }

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }))

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <h3 className="section-title">{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                    <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div>
                            <label className="form-label">Título *</label>
                            <input className="form-input" value={form.titulo} onChange={set('titulo')} placeholder="Descreva a tarefa..." required />
                        </div>

                        <div>
                            <label className="form-label">Descrição</label>
                            <textarea className="form-input resize-none" rows={3} value={form.descricao} onChange={set('descricao')} placeholder="Detalhes da tarefa..." />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="form-label flex items-center gap-1"><Building2 size={10} />Cliente</label>
                                <select className="form-select" value={form.cliente_id} onChange={e => handleClienteChange(e.target.value)}>
                                    <option value="">Nenhum</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label flex items-center gap-1"><Tag size={10} />Prioridade</label>
                                <select className="form-select" value={form.prioridade} onChange={set('prioridade')}>
                                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="form-label flex items-center gap-1"><User size={10} />Solicitante</label>
                                <select className="form-select" value={form.solicitante} onChange={set('solicitante')}>
                                    <option value="">Nenhum</option>
                                    {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label flex items-center gap-1"><User size={10} />Responsável</label>
                                <select className="form-select" value={form.responsavel} onChange={set('responsavel')}>
                                    <option value="">Nenhum</option>
                                    {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="form-label flex items-center gap-1"><Calendar size={10} />Vencimento</label>
                                <input type="date" className="form-input" value={form.data_vencimento} onChange={set('data_vencimento')} />
                            </div>
                            <div>
                                <label className="form-label flex items-center gap-1"><RotateCcw size={10} />Recorrência</label>
                                <select className="form-select" value={form.recorrencia} onChange={set('recorrencia')}>
                                    {RECURRENCES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="form-label flex items-center gap-1"><AlertCircle size={10} />Status</label>
                            <select className="form-select" value={form.status} onChange={set('status')}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">
                            {task ? 'Salvar Alterações' : 'Criar Tarefa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
