import React, { useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import { Tarefa, TaskStatus, Cliente } from '../../types'
import { mockTarefas, mockClientes } from '../../lib/mockData'
import KanbanColumn from '../components/tasks/KanbanColumn'
import TaskModal from '../components/tasks/TaskModal'

const COLUMNS: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído']
const ASSIGNEES = ['Rodrigo', 'Ana', 'Lucas', 'Camila']

// This is the Tarefas page - written as standalone to avoid circular import
export { }
