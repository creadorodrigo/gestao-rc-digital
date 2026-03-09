import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
}

interface Cliente {
  id: string
  nome: string
}

interface Tarefa {
  id: string
  titulo: string
  descricao: string | null
  cliente_id: string | null
  solicitante: string | null
  responsavel: string | null
  solicitante_id: string | null
  responsavel_id: string | null
  prioridade: 'baixa' | 'média' | 'alta' | 'urgente'
  status: 'A Fazer' | 'Em Andamento' | 'Em Revisão' | 'Concluído'
  data_vencimento: string | null
  recorrencia: 'não' | 'semanal' | 'mensal'
  proxima_execucao: string | null
  ativa: boolean
  criado_em: string
  clientes?: { nome: string } | null
  responsavel_usuario?: { nome: string } | null
  solicitante_usuario?: { nome: string } | null
}

interface NovaT {
  titulo: string
  descricao: string
  cliente_id: string
  solicitante_id: string
  responsavel_id: string
  prioridade: 'baixa' | 'média' | 'alta' | 'urgente'
  status: 'A Fazer' | 'Em Andamento' | 'Em Revisão' | 'Concluído'
  data_vencimento: string
  recorrencia: 'não' | 'semanal' | 'mensal'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUNAS: Tarefa['status'][] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído']

const PRIORIDADE_COR: Record<string, string> = {
  baixa: 'border-l-4 border-green-500',
  média: 'border-l-4 border-yellow-400',
  alta: 'border-l-4 border-orange-500',
  urgente: 'border-l-4 border-red-600',
}

const PRIORIDADE_BADGE: Record<string, string> = {
  baixa: 'bg-green-900/40 text-green-300',
  média: 'bg-yellow-900/40 text-yellow-300',
  alta: 'bg-orange-900/40 text-orange-300',
  urgente: 'bg-red-900/40 text-red-300',
}

const NOVA_TAREFA_INICIAL: NovaT = {
  titulo: '',
  descricao: '',
  cliente_id: '',
  solicitante_id: '',
  responsavel_id: '',
  prioridade: 'média',
  status: 'A Fazer',
  data_vencimento: '',
  recorrencia: 'não',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAtrasada(t: Tarefa): boolean {
  if (!t.data_vencimento || t.status === 'Concluído') return false
  return new Date(t.data_vencimento) < new Date(new Date().toDateString())
}

function calcProximaExecucao(data_vencimento: string, recorrencia: 'semanal' | 'mensal'): string {
  const base = data_vencimento ? new Date(data_vencimento) : new Date()
  if (recorrencia === 'semanal') {
    base.setDate(base.getDate() + 7)
  } else {
    base.setMonth(base.getMonth() + 1)
  }
  return base.toISOString().split('T')[0]
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Tarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [novaT, setNovaT] = useState<NovaT>(NOVA_TAREFA_INICIAL)

  // ── Buscar dados ──────────────────────────────────────────────────────────

  const buscarTudo = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      // Buscar usuários reais do banco
      const { data: usuariosData, error: erroUsuarios } = await supabase
        .from('usuarios')
        .select('id, nome, email, role')
        .order('nome')

      if (erroUsuarios) throw new Error(`Erro ao buscar usuários: ${erroUsuarios.message}`)
      setUsuarios(usuariosData ?? [])

      // Buscar clientes reais
      const { data: clientesData, error: erroClientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('status', 'Ativo')
        .order('nome')

      if (erroClientes) throw new Error(`Erro ao buscar clientes: ${erroClientes.message}`)
      setClientes(clientesData ?? [])

      // Buscar tarefas com joins nas tabelas relacionadas
      const { data: tarefasData, error: erroTarefas } = await supabase
        .from('tarefas')
        .select(`
          *,
          clientes ( nome ),
          responsavel_usuario:usuarios!tarefas_responsavel_id_fkey ( nome ),
          solicitante_usuario:usuarios!tarefas_solicitante_id_fkey ( nome )
        `)
        .eq('ativa', true)
        .order('criado_em', { ascending: false })

      if (erroTarefas) throw new Error(`Erro ao buscar tarefas: ${erroTarefas.message}`)
      setTarefas((tarefasData as Tarefa[]) ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setErro(msg)
      console.error('[Tarefas] buscarTudo:', msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    buscarTudo()
  }, [buscarTudo])

  // ── Criar tarefa ──────────────────────────────────────────────────────────

  async function handleCriarTarefa() {
    if (!novaT.titulo.trim()) {
      setErro('Título é obrigatório.')
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      // Resolver nomes a partir dos IDs selecionados
      const responsavelUser = usuarios.find(u => u.id === novaT.responsavel_id)
      const solicitanteUser = usuarios.find(u => u.id === novaT.solicitante_id)

      // Calcular proxima_execucao se tarefa for recorrente
      const proxima_execucao =
        novaT.recorrencia !== 'não'
          ? calcProximaExecucao(
              novaT.data_vencimento || new Date().toISOString().split('T')[0],
              novaT.recorrencia
            )
          : null

      const payload = {
        titulo: novaT.titulo.trim(),
        descricao: novaT.descricao.trim() || null,
        cliente_id: novaT.cliente_id || null,
        // Campos texto (para exibição legada)
        solicitante: solicitanteUser?.nome ?? null,
        responsavel: responsavelUser?.nome ?? null,
        // Campos FK (referência real ao banco)
        solicitante_id: novaT.solicitante_id || null,
        responsavel_id: novaT.responsavel_id || null,
        prioridade: novaT.prioridade,
        status: novaT.status,
        data_vencimento: novaT.data_vencimento || null,
        recorrencia: novaT.recorrencia,
        proxima_execucao,
        ativa: true,
      }

      const { error } = await supabase.from('tarefas').insert([payload])

      if (error) throw new Error(error.message)

      setModalAberto(false)
      setNovaT(NOVA_TAREFA_INICIAL)
      await buscarTudo()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar'
      setErro(`Erro ao criar tarefa: ${msg}`)
      console.error('[Tarefas] handleCriarTarefa:', msg)
    } finally {
      setSalvando(false)
    }
  }

  // ── Mover tarefa entre colunas ────────────────────────────────────────────

  async function moverTarefa(id: string, novoStatus: Tarefa['status']) {
    // Atualiza localmente de imediato (optimistic update)
    setTarefas(prev =>
      prev.map(t => (t.id === id ? { ...t, status: novoStatus } : t))
    )

    const { error } = await supabase
      .from('tarefas')
      .update({ status: novoStatus })
      .eq('id', id)

    if (error) {
      console.error('[Tarefas] moverTarefa:', error.message)
      await buscarTudo() // reverter se falhar
    }
  }

  // ── Filtro ────────────────────────────────────────────────────────────────

  const tarefasFiltradas = filtroResponsavel
    ? tarefas.filter(t => t.responsavel_id === filtroResponsavel)
    : tarefas

  const tarefasPorColuna = (status: Tarefa['status']) =>
    tarefasFiltradas.filter(t => t.status === status)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 min-h-screen" style={{ background: '#0A0A0A', color: '#E5E5E5' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Nunito, sans-serif' }}>
            Tarefas
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''} ativas
          </p>
        </div>
        <button
          onClick={() => { setModalAberto(true); setErro(null) }}
          className="px-4 py-2 rounded-lg font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: '#C9A84C', color: '#0A0A0A' }}
        >
          + Nova Tarefa
        </button>
      </div>

      {/* Filtro por responsável */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs text-gray-400 font-medium">Filtrar por responsável:</label>
        <select
          value={filtroResponsavel}
          onChange={e => setFiltroResponsavel(e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 border border-gray-700 outline-none"
          style={{ background: '#1A1A1A', color: '#E5E5E5' }}
        >
          <option value="">Todos</option>
          {usuarios.map(u => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>
        {filtroResponsavel && (
          <button
            onClick={() => setFiltroResponsavel('')}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Erro global */}
      {erro && !modalAberto && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {erro}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUNAS.map(coluna => (
            <div key={coluna} className="rounded-xl p-3" style={{ background: '#141414' }}>

              {/* Cabeçalho coluna */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm" style={{ color: '#C9A84C' }}>{coluna}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {tarefasPorColuna(coluna).length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[80px]">
                {tarefasPorColuna(coluna).length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-4">Nenhuma tarefa</p>
                )}
                {tarefasPorColuna(coluna).map(tarefa => (
                  <TarefaCard
                    key={tarefa.id}
                    tarefa={tarefa}
                    colunas={COLUNAS}
                    onMover={moverTarefa}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Tarefa */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: '#C9A84C', fontFamily: 'Nunito, sans-serif' }}>
              Nova Tarefa
            </h2>

            {erro && (
              <div className="mb-3 p-2 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-xs">
                {erro}
              </div>
            )}

            <div className="space-y-3">

              {/* Título */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título *</label>
                <input
                  value={novaT.titulo}
                  onChange={e => setNovaT(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Nome da tarefa"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={novaT.descricao}
                  onChange={e => setNovaT(p => ({ ...p, descricao: e.target.value }))}
                  rows={2}
                  placeholder="Detalhes da tarefa..."
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600 resize-none"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                />
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                <select
                  value={novaT.cliente_id}
                  onChange={e => setNovaT(p => ({ ...p, cliente_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                >
                  <option value="">Selecionar cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Solicitante + Responsável */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Solicitante</label>
                  <select
                    value={novaT.solicitante_id}
                    onChange={e => setNovaT(p => ({ ...p, solicitante_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                  >
                    <option value="">Selecionar</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Responsável</label>
                  <select
                    value={novaT.responsavel_id}
                    onChange={e => setNovaT(p => ({ ...p, responsavel_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                  >
                    <option value="">Selecionar</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prioridade + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Prioridade</label>
                  <select
                    value={novaT.prioridade}
                    onChange={e => setNovaT(p => ({ ...p, prioridade: e.target.value as NovaT['prioridade'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Status inicial</label>
                  <select
                    value={novaT.status}
                    onChange={e => setNovaT(p => ({ ...p, status: e.target.value as NovaT['status'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                  >
                    {COLUNAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Data + Recorrência */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data de entrega</label>
                  <input
                    type="date"
                    value={novaT.data_vencimento}
                    onChange={e => setNovaT(p => ({ ...p, data_vencimento: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Recorrência</label>
                  <select
                    value={novaT.recorrencia}
                    onChange={e => setNovaT(p => ({ ...p, recorrencia: e.target.value as NovaT['recorrencia'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}
                  >
                    <option value="não">Não recorrente</option>
                    <option value="semanal">↻ Semanal (toda semana)</option>
                    <option value="mensal">↻ Mensal (todo mês)</option>
                  </select>
                </div>
              </div>

              {/* Aviso de recorrência */}
              {novaT.recorrencia !== 'não' && (
                <div className="p-3 rounded-lg border text-xs" style={{ background: '#1f1a0a', borderColor: '#C9A84C40', color: '#C9A84C' }}>
                  ↻ Esta tarefa será <strong>gerada automaticamente</strong> toda{' '}
                  {novaT.recorrencia === 'semanal' ? 'semana' : 'mês'} com as mesmas configurações.
                  {novaT.data_vencimento && (
                    <span className="block mt-1 text-gray-400">
                      Próxima geração:{' '}
                      {new Date(
                        calcProximaExecucao(novaT.data_vencimento, novaT.recorrencia)
                      ).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setModalAberto(false); setErro(null) }}
                className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarTarefa}
                disabled={salvando || !novaT.titulo.trim()}
                className="px-5 py-2 text-sm font-semibold rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: '#C9A84C', color: '#0A0A0A' }}
              >
                {salvando ? 'Salvando...' : 'Criar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card de Tarefa ───────────────────────────────────────────────────────────

interface TarefaCardProps {
  tarefa: Tarefa
  colunas: Tarefa['status'][]
  onMover: (id: string, status: Tarefa['status']) => void
}

function TarefaCard({ tarefa, colunas, onMover }: TarefaCardProps) {
  const atrasada = isAtrasada(tarefa)
  const nomeResponsavel = tarefa.responsavel_usuario?.nome ?? tarefa.responsavel ?? '—'
  const nomeCliente = tarefa.clientes?.nome ?? null

  return (
    <div
      className={`rounded-xl p-3 ${PRIORIDADE_COR[tarefa.prioridade] ?? 'border-l-4 border-gray-600'}`}
      style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}
    >
      {/* Título + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-tight text-gray-100">{tarefa.titulo}</p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORIDADE_BADGE[tarefa.prioridade] ?? ''}`}>
            {tarefa.prioridade}
          </span>
          {tarefa.recorrencia !== 'não' && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: '#C9A84C22', color: '#C9A84C' }}
              title={`Recorrência ${tarefa.recorrencia} — próxima: ${tarefa.proxima_execucao ?? 'N/D'}`}
            >
              ↻ {tarefa.recorrencia}
            </span>
          )}
        </div>
      </div>

      {/* Descrição */}
      {tarefa.descricao && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{tarefa.descricao}</p>
      )}

      {/* Meta info */}
      <div className="space-y-1">
        {nomeCliente && (
          <p className="text-xs text-gray-500">
            <span className="text-gray-600">Cliente: </span>{nomeCliente}
          </p>
        )}
        <p className="text-xs text-gray-500">
          <span className="text-gray-600">Resp: </span>{nomeResponsavel}
        </p>
        {tarefa.data_vencimento && (
          <p className={`text-xs font-medium ${atrasada ? 'text-red-400' : 'text-gray-400'}`}>
            {atrasada ? '⚠ Atrasada · ' : ''}
            {new Date(tarefa.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      {/* Mover para coluna */}
      <div className="mt-2 pt-2 border-t border-gray-800">
        <select
          value={tarefa.status}
          onChange={e => onMover(tarefa.id, e.target.value as Tarefa['status'])}
          className="w-full text-xs px-2 py-1 rounded-lg border border-gray-700 outline-none"
          style={{ background: '#1A1A1A', color: '#C9A84C' }}
        >
          {colunas.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
