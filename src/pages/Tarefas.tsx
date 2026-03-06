import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import type { Tarefa, TaskStatus, Cliente, MembroTime } from '../types'
import { supabase } from '../lib/supabase'
import KanbanColumn from '../components/tasks/KanbanColumn'
import TaskModal from '../components/tasks/TaskModal'
import { useAuth } from '../contexts/AuthContext'

const COLUMNS: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído']

export default function Tarefas() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'
    const [tasks, setTasks] = useState<Tarefa[]>([])
    const [clients, setClients] = useState<Cliente[]>([])
    const [membros, setMembros] = useState<MembroTime[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<Tarefa | null>(null)
    const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('A Fazer')
    const [filterAssignee, setFilterAssignee] = useState('')

    const fetchAll = async () => {
        setLoading(true)
        const [tarefasRes, clientesRes, membrosRes] = await Promise.all([
            supabase!.from('tarefas').select('*, clientes(nome)').order('criado_em', { ascending: false }),
            supabase!.from('clientes').select('id, nome, tipo, status, investimento_mensal, meta_faturamento, faturado_ate_data, responsaveis').order('nome'),
            supabase!.from('membros_time').select('id, nome, funcao').order('nome'),
        ])
        const mapped = (tarefasRes.data || []).map((t: any) => ({
            ...t,
            cliente_nome: t.clientes?.nome || '',
            clientes: undefined,
        })) as Tarefa[]
        setTasks(mapped)
        setClients((clientesRes.data || []) as Cliente[])
        setMembros((membrosRes.data || []) as MembroTime[])
        setLoading(false)
    }

    useEffect(() => { fetchAll() }, [])

    // Build dynamic assignees list from task data
    const assignees = useMemo(() => {
        const set = new Set<string>()
        tasks.forEach(t => { if (t.responsavel) set.add(t.responsavel) })
        return Array.from(set).sort()
    }, [tasks])

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

    const handleSaveTask = async (data: Omit<Tarefa, 'id' | 'criado_em'>) => {
        // Remove cliente_nome — not a DB column; derive from cliente_id FK
        const { cliente_nome: _cn, ...payload } = data as any
        if (editingTask) {
            await supabase!.from('tarefas').update(payload).eq('id', editingTask.id)
        } else {
            await supabase!.from('tarefas').insert(payload)
        }
        await fetchAll()
        setModalOpen(false)
        setEditingTask(null)
    }

    const handleDeleteTask = async (id: string) => {
        if (!confirm('Excluir esta tarefa?')) return
        await supabase!.from('tarefas').delete().eq('id', id)
        setTasks(prev => prev.filter(t => t.id !== id))
        setModalOpen(false)
        setEditingTask(null)
    }

    const overdueCount = tasks.filter(t => {
        if (!t.data_vencimento || t.status === 'Concluído') return false
        return new Date(t.data_vencimento + 'T00:00:00') < new Date()
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
                    <div className="relative">
                        <select
                            value={filterAssignee}
                            onChange={e => setFilterAssignee(e.target.value)}
                            className="form-select pr-8 pl-3 py-1.5 text-xs appearance-none bg-dark-400 border-dark-600"
                        >
                            <option value="">Todos os responsáveis</option>
                            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <button onClick={() => { setDefaultStatus('A Fazer'); setEditingTask(null); setModalOpen(true) }} className="btn-primary">
                        <Plus size={14} /> Nova Tarefa
                    </button>
                </div>
            </div>

            {/* Kanban board */}
            <div className="flex-1 overflow-x-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">Carregando tarefas...</div>
                ) : (
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
                )}
            </div>

            {modalOpen && (
                <TaskModal
                    task={editingTask}
                    clientes={clients}
                    membros={membros}
                    defaultStatus={defaultStatus}
                    onSave={handleSaveTask}
                    onDelete={editingTask ? handleDeleteTask : undefined}
                    onClose={() => { setModalOpen(false); setEditingTask(null) }}
                />
            )}
        </div>
    )
}
