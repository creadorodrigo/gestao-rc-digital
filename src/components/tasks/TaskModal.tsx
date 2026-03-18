import { useState, useRef, useLayoutEffect, useCallback } from 'react'
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

const MIN_W = 480
const MIN_H = 400
const INIT_W = 560
const INIT_H = 620

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const cursorMap: Record<ResizeDir, string> = {
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    nw: 'nwse-resize', se: 'nwse-resize',
}

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

    const modalRef = useRef<HTMLDivElement>(null)
    const geom = useRef({ w: INIT_W, h: INIT_H, top: 0, left: 0 })

    // Centraliza na abertura
    useLayoutEffect(() => {
        const w = INIT_W
        const h = INIT_H
        const top = Math.max(0, (window.innerHeight - h) / 2)
        const left = Math.max(0, (window.innerWidth - w) / 2)
        geom.current = { w, h, top, left }
        const el = modalRef.current
        if (!el) return
        el.style.width = `${w}px`
        el.style.height = `${h}px`
        el.style.top = `${top}px`
        el.style.left = `${left}px`
    }, [])

    const makeResizeHandler = useCallback((dir: ResizeDir) => (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const el = modalRef.current
        if (!el) return

        const startX = e.clientX
        const startY = e.clientY
        const { w: startW, h: startH, top: startTop, left: startLeft } = geom.current

        const maxW = window.innerWidth * 0.95
        const maxH = window.innerHeight * 0.95

        const onMouseMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX
            const dy = ev.clientY - startY

            let w = startW, h = startH, top = startTop, left = startLeft

            if (dir === 'e' || dir === 'ne' || dir === 'se') {
                w = Math.min(maxW, Math.max(MIN_W, startW + dx))
            }
            if (dir === 'w' || dir === 'nw' || dir === 'sw') {
                const newW = Math.min(maxW, Math.max(MIN_W, startW - dx))
                left = startLeft + (startW - newW)
                w = newW
            }
            if (dir === 's' || dir === 'se' || dir === 'sw') {
                h = Math.min(maxH, Math.max(MIN_H, startH + dy))
            }
            if (dir === 'n' || dir === 'ne' || dir === 'nw') {
                const newH = Math.min(maxH, Math.max(MIN_H, startH - dy))
                top = startTop + (startH - newH)
                h = newH
            }

            geom.current = { w, h, top, left }
            el.style.width = `${w}px`
            el.style.height = `${h}px`
            el.style.top = `${top}px`
            el.style.left = `${left}px`
        }

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.body.style.userSelect = ''
            document.body.style.cursor = ''
        }

        document.body.style.userSelect = 'none'
        document.body.style.cursor = cursorMap[dir]
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

    const EDGE = 6   // espessura das bordas
    const CORNER = 14 // tamanho dos cantos

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div
                ref={modalRef}
                className="modal-box"
                style={{
                    position: 'fixed',
                    display: 'flex',
                    flexDirection: 'column',
                    width: INIT_W,
                    height: INIT_H,
                    minWidth: MIN_W,
                    minHeight: MIN_H,
                    overflow: 'hidden',
                }}
            >
                {/* ── Handles de resize ───────────────────────────────────────── */}

                {/* Bordas */}
                <div onMouseDown={makeResizeHandler('n')}  style={{ position:'absolute', top:0, left:CORNER, right:CORNER, height:EDGE, cursor:'ns-resize', zIndex:20 }} />
                <div onMouseDown={makeResizeHandler('s')}  style={{ position:'absolute', bottom:0, left:CORNER, right:CORNER, height:EDGE, cursor:'ns-resize', zIndex:20 }} />
                <div onMouseDown={makeResizeHandler('e')}  style={{ position:'absolute', top:CORNER, bottom:CORNER, right:0, width:EDGE, cursor:'ew-resize', zIndex:20 }} />
                <div onMouseDown={makeResizeHandler('w')}  style={{ position:'absolute', top:CORNER, bottom:CORNER, left:0, width:EDGE, cursor:'ew-resize', zIndex:20 }} />

                {/* Cantos */}
                <div onMouseDown={makeResizeHandler('nw')} style={{ position:'absolute', top:0, left:0, width:CORNER, height:CORNER, cursor:'nwse-resize', zIndex:21 }} />
                <div onMouseDown={makeResizeHandler('ne')} style={{ position:'absolute', top:0, right:0, width:CORNER, height:CORNER, cursor:'nesw-resize', zIndex:21 }} />
                <div onMouseDown={makeResizeHandler('sw')} style={{ position:'absolute', bottom:0, left:0, width:CORNER, height:CORNER, cursor:'nesw-resize', zIndex:21 }} />
                <div onMouseDown={makeResizeHandler('se')} style={{ position:'absolute', bottom:0, right:0, width:CORNER, height:CORNER, cursor:'nwse-resize', zIndex:21 }} />

                {/* ── Conteúdo ─────────────────────────────────────────────────── */}
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
                                rows={12}
                                value={form.descricao}
                                onChange={set('descricao')}
                                placeholder="Detalhes da tarefa..."
                                style={{ resize: 'vertical', minHeight: '220px', maxHeight: '400px' }}
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
            </div>
        </div>
    )
}
