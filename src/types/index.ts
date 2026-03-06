export type UserRole = 'admin' | 'team'

export type ClientStatus = 'Prospectando' | 'Ativo' | 'Encerrado'
export type ClientType = 'E-commerce' | 'Negócio Local' | 'Info Produto' | 'Outros'

export type TaskStatus = 'A Fazer' | 'Em Andamento' | 'Em Revisão' | 'Concluído'
export type TaskPriority = 'alta' | 'média' | 'baixa'
export type TaskRecurrence = 'não' | 'diária' | 'semanal' | 'quinzenal' | 'mensal'

export type LeadStatus = 'Leads' | 'Contato Feito' | 'Proposta Enviada' | 'Negociação' | 'Fechado' | 'Perdido'

export interface Usuario {
    id: string
    nome: string
    email: string
    role: UserRole
    funcao?: string
    avatar?: string
    telefone?: string
    foto_url?: string
}

export interface Cliente {
    id: string
    nome: string
    site?: string
    tipo: ClientType
    status: ClientStatus
    investimento_mensal: number
    conta_meta_ads?: string
    conta_google_ads?: string
    meta_faturamento: number
    faturado_ate_data: number
    responsaveis: string[]
    // Admin-only
    contrato_mensal?: number
    vigencia_inicio?: string
    vigencia_fim?: string
    nps?: number
    criado_em?: string
}

export interface Tarefa {
    id: string
    titulo: string
    descricao?: string
    cliente_id?: string
    cliente_nome?: string
    solicitante?: string
    responsavel?: string
    prioridade: TaskPriority
    status: TaskStatus
    data_vencimento?: string
    recorrencia: TaskRecurrence
    criado_em?: string
}

export interface Lead {
    id: string
    empresa: string
    contato?: string
    valor_estimado: number
    origem?: string
    notas?: string
    status: LeadStatus
    criado_em?: string
}

export interface MembroTime {
    id: string
    nome: string
    foto_url?: string
    telefone?: string
    funcao?: string
}
