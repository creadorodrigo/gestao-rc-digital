import { Plus } from 'lucide-react'
import type { Tarefa, TaskStatus } from '../../types'
import TaskCard from './TaskCard'

interface KanbanColumnProps {
    title: TaskStatus
    tasks: Tarefa[]
    onAddTask: (status: TaskStatus) => void
    onEditTask: (task: Tarefa) => void
}

const COLUMN_COLORS: Record<TaskStatus, string> = {
    'A Fazer': 'bg-gray-400',
    'Em Andamento': 'bg-blue-400',
    'Em Revisão': 'bg-yellow-400',
    'Concluído': 'bg-green-400',
}

const COLUMN_DOT: Record<TaskStatus, string> = {
    'A Fazer': 'text-gray-400',
    'Em Andamento': 'text-blue-400',
    'Em Revisão': 'text-yellow-400',
    'Concluído': 'text-green-400',
}

export default function KanbanColumn({ title, tasks, onAddTask, onEditTask }: KanbanColumnProps) {
    return (
        <div className="kanban-column flex-shrink-0">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${COLUMN_COLORS[title]}`} />
                    <span className="text-sm font-semibold text-gray-300">{title}</span>
                    <span className="text-xs font-bold text-gray-600 bg-dark-500 px-1.5 py-0.5 rounded-full font-mono">
                        {tasks.length}
                    </span>
                </div>
                <button
                    onClick={() => onAddTask(title)}
                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gold hover:bg-gold/10 rounded-lg transition-all duration-200"
                    title={`Adicionar em ${title}`}
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Cards */}
            <div className="space-y-2 flex-1 overflow-y-auto min-h-[60px]">
                {tasks.length === 0 ? (
                    <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-dark-600 rounded-xl">
                        Nenhuma tarefa
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskCard key={task.id} task={task} onClick={() => onEditTask(task)} />
                    ))
                )}
            </div>
        </div>
    )
}
