import { useState, useMemo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import type { Tarefa, TaskStatus } from '../types'
import { mockTarefas, mockClientes } from '../lib/mockData'
import KanbanColumn from '../components/tasks/KanbanColumn'
import TaskModal from '../components/tasks/TaskModal'

const COLUMNS: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído']
const ASSIGNEES = ['Rodrigo', 'Ana', 'Lucas', 'Camila']

function genId() { return Math.random().toString(36).slice(2) }

export default function Tarefas() {
    const [tasks, setTasks] = useState<Tarefa[]>(mockTarefas)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<Tarefa | null>(null)
    const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('A Fazer')
    const [filterAssignee, setFilterAssignee] = useState('')

    const filteredTasks = useMemo(() =>
        filterAssignee ? tasks.filter(t => t.responsavel === filterAssignee) : tasks,
        [tasks, filterAssignee]
    )

    const getColumnTasks = (status: TaskStatus) =>
        filteredTasks.filter(t => t.status === status)

    const handleAddTask = (status: TaskStatus) => {
        setDefaultStatus(status)
        setEditingTask(null)
        setModalOpen(true)
    }

    const handleEditTask = (task: Tarefa) => {
        setEditingTask(task)
        setModalOpen(true)
    }

    const handleSaveTask = (data: Omit<Tarefa, 'id' | 'criado_em'>) => {
        if (editingTask) {
            setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...data } : t))
        } else {
            const newTask: Tarefa = { ...data, id: genId(), criado_em: new Date().toISOString() }
            setTasks(prev => [...prev, newTask])
        }
        setModalOpen(false)
        setEditingTask(null)
    }

    const handleNewTask = () => {
        setDefaultStatus('A Fazer')
        setEditingTask(null)
        setModalOpen(true)
    }

    const overdueCount = tasks.filter(t => {
        if (!t.data_vencimento || t.status === 'Concluído') return false
        return new Date(t.data_vencimento + 'T00:00:00') < new Date('2026-03-05')
    }).length

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500 bg-dark-200/50 backdrop-blur-sm flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white">Tarefas</h1>
                    <p className="text-gray-500 text-xs mt-0.5">
                        {tasks.length} tarefas
                        {overdueCount > 0 && <span className="text-red-400 ml-2">• {overdueCount} atrasadas</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Assignee filter */}
                    <div className="relative">
                        <select
                            value={filterAssignee}
                            onChange={e => setFilterAssignee(e.target.value)}
                            className="form-select pr-8 pl-3 py-1.5 text-xs appearance-none bg-dark-400 border-dark-600"
                        >
                            <option value="">Todos os responsáveis</option>
                            {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <button onClick={handleNewTask} className="btn-primary">
                        <Plus size={14} /> Nova Tarefa
                    </button>
                </div>
            </div>

            {/* Kanban board */}
            <div className="flex-1 overflow-x-auto p-6">
                <div className="flex gap-4 h-full min-w-max">
                    {COLUMNS.map(col => (
                        <KanbanColumn
                            key={col}
                            title={col}
                            tasks={getColumnTasks(col)}
                            onAddTask={handleAddTask}
                            onEditTask={handleEditTask}
                        />
                    ))}
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <TaskModal
                    task={editingTask}
                    clientes={mockClientes}
                    defaultStatus={defaultStatus}
                    onSave={handleSaveTask}
                    onClose={() => { setModalOpen(false); setEditingTask(null) }}
                />
            )}
        </div>
    )
}
