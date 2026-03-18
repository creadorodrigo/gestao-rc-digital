import { useState, useRef, useCallback } from 'react'
import { X, Calendar, User, Tag, RotateCcw, Building2, AlertCircle } from 'lucide-react'
import type { Tarefa, TaskStatus, TaskPriority, TaskRecurrence, Cliente, MembroTime } from '../../types'

interface TaskModalProps {
    task?: Tarefa | null
    clientes: Cliente[]
    membros: MembroTime[]
    defaultStatus?: TaskStatus
    onSave: (task: Omit<Tarefa, 'id' | 'criado_em'>) => void
    onDelete?: (id: string) => void
    onClose: () => void
}

const PRIORITIES: TaskPriority[] = ['alta', 'média', 'baixa']
const STATUSES: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído']
const RECURRENCES: TaskRecurrence[] = ['não', 'diária', 'semanal', 'quinzenal', 'mensal']

export default function TaskModal({ task, clientes, membros, defaultStatus, onSave, onDelete, onClose }: TaskModalProps) {
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

    // Resize do modal
    const modalRef = useRef<HTMLDivElement>(null)
    const isResizing = useRef(false)
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const modal = modalRef.current
        if (!modal) return
        isResizing.current = true
        resizeStart.current = {
            x: e.clientX,
            y: e.clientY,
            w: modal.offsetWidth,
            h: modal.offsetHeight,
        }

        const onMouseMove = (ev: MouseEvent) => {
            if (!isResizing.current || !modal) return
            const newW = Math.max(480, resizeStart.current.w + (ev.clientX - resizeStart.current.x))
            const newH = Math.max(400, resizeStart.current.h + (ev.clientY - resizeStart.current.y))
            modal.style.width = `${newW}px`
            modal.style.height = `${newH}px`
            modal.style.maxHeight = `${newH}px`
        }

        const onMouseUp = () => {
            isResizing.current = false
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.body.style.userSelect = ''
            document.body.style.cursor = ''
        }

        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'nwse-resize'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [])

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
            <div
                ref={modalRef}
                className="modal-box"
                style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '560px',
                    minWidth: '480px',
                    maxWidth: '90vw',
                    height: 'auto',
                    minHeight: '400px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                }}
            >
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <h3 className="section-title">{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                    <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
                        <div>
                            <label className="form-label">Título *</label>
                            <input className="form-input" value={form.titulo} onChange={set('titulo')} placeholder="Descreva a tarefa..." required />
                        </div>

                        <div>
                            <label className="form-label">Descrição</label>
                            <textarea
                                className="form-input"
                                rows={8}
                                value={form.descricao}
                                onChange={set('descricao')}
                                placeholder="Detalhes da tarefa..."
                                style={{ resize: 'vertical', minHeight: '160px' }}
                            />
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
                                    {membros.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label flex items-center gap-1"><User size={10} />Responsável</label>
                                <select className="form-select" value={form.responsavel} onChange={set('responsavel')}>
                                    <option value="">Nenhum</option>
                                    {membros.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
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

                    <div className="modal-footer" style={{ flexShrink: 0 }}>
                        {task && onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(task.id)}
                                className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
                            >
                                Excluir Tarefa
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">
                            {task ? 'Salvar Alterações' : 'Criar Tarefa'}
                        </button>
                    </div>
                </form>

                {/* Handle de resize — canto inferior direito */}
                <div
                    onMouseDown={onResizeMouseDown}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 18,
                        height: 18,
                        cursor: 'nwse-resize',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        padding: '3px',
                        opacity: 0.4,
                        transition: 'opacity 0.2s',
                        zIndex: 10,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                    title="Arrastar para redimensionar"
                >
                    {/* Ícone de resize (3 linhas diagonais) */}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <line x1="0" y1="10" x2="10" y2="0" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                        <line x1="4" y1="10" x2="10" y2="4" stroke="currentColor" strokeWidth="1.5" opacity="0.7"/>
                        <line x1="8" y1="10" x2="10" y2="8" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                </div>
            </div>
        </div>
    )
}
