import { Calendar, RotateCcw, AlertTriangle, Building2 } from 'lucide-react'
import type { Tarefa } from '../../types'

interface TaskCardProps {
    task: Tarefa
    onClick: () => void
}

const PRIORITY_CLASSES = {
    alta: 'priority-alta',
    média: 'priority-media',
    baixa: 'priority-baixa',
}

const PRIORITY_LABELS = {
    alta: { label: 'Alta', color: 'bg-red-500/20 text-red-400' },
    média: { label: 'Média', color: 'bg-yellow-500/20 text-yellow-400' },
    baixa: { label: 'Baixa', color: 'bg-gray-500/20 text-gray-400' },
}

const RECURRENCE_LABELS: Record<string, string> = {
    diária: 'Diária',
    semanal: 'Semanal',
    quinzenal: 'Quinzenal',
    mensal: 'Mensal',
}

function isOverdue(dateStr?: string): boolean {
    if (!dateStr) return false
    const today = new Date('2026-03-05')
    const due = new Date(dateStr + 'T00:00:00')
    return due < today
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
    const overdue = isOverdue(task.data_vencimento) && task.status !== 'Concluído'
    const priority = PRIORITY_LABELS[task.prioridade]

    return (
        <div
            onClick={onClick}
            className={`card-hover ${PRIORITY_CLASSES[task.prioridade]} animate-fade-in`}
        >
            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`badge ${priority.color}`}>{priority.label}</span>
                {overdue && (
                    <span className="badge bg-red-600/90 text-white flex items-center gap-1">
                        <AlertTriangle size={9} />Atrasada
                    </span>
                )}
                {task.recorrencia !== 'não' && (
                    <span className="badge bg-gold/20 text-gold flex items-center gap-1">
                        <RotateCcw size={9} />{RECURRENCE_LABELS[task.recorrencia]}
                    </span>
                )}
            </div>

            {/* Title */}
            <p className="text-gray-200 text-sm font-semibold leading-snug mb-2 line-clamp-2">{task.titulo}</p>

            {/* Description */}
            {task.descricao && (
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">{task.descricao}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-dark-500/50">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    {task.cliente_nome ? (
                        <>
                            <Building2 size={10} className="text-gold/60" />
                            <span className="truncate max-w-[80px]">{task.cliente_nome}</span>
                        </>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    {task.responsavel && (
                        <div className="w-5 h-5 rounded-full bg-dark-500 border border-dark-600 flex items-center justify-center text-[9px] text-gray-400 font-bold">
                            {task.responsavel.charAt(0)}
                        </div>
                    )}
                    {task.data_vencimento && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-mono ${overdue ? 'text-red-400' : 'text-gray-500'}`}>
                            <Calendar size={9} />{formatDate(task.data_vencimento)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
