import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface Usuario { id: string; nome: string; email: string; role: string }
interface Cliente { id: string; nome: string }

interface Tarefa {
  id: string; titulo: string; descricao: string | null
  cliente_id: string | null; solicitante: string | null; responsavel: string | null
  solicitante_id: string | null; responsavel_id: string | null
  prioridade: 'baixa' | 'média' | 'alta' | 'urgente'
  status: 'A Fazer' | 'Em Andamento' | 'Em Revisão' | 'Concluído'
  data_vencimento: string | null; recorrencia: 'não' | 'semanal' | 'mensal'
  proxima_execucao: string | null; ativa: boolean; criado_em: string
  clientes?: { nome: string } | null
  responsavel_usuario?: { nome: string } | null
  solicitante_usuario?: { nome: string } | null
}

interface FormT {
  titulo: string; descricao: string; cliente_id: string
  solicitante_id: string; responsavel_id: string
  prioridade: 'baixa' | 'média' | 'alta' | 'urgente'
  status: 'A Fazer' | 'Em Andamento' | 'Em Revisão' | 'Concluído'
  data_vencimento: string; recorrencia: 'não' | 'semanal' | 'mensal'
}

const COLUNAS: Tarefa['status'][] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído']

const PRIORIDADE_COR: Record<string, string> = {
  baixa: 'border-l-4 border-green-500', média: 'border-l-4 border-yellow-400',
  alta: 'border-l-4 border-orange-500', urgente: 'border-l-4 border-red-600',
}
const PRIORIDADE_BADGE: Record<string, string> = {
  baixa: 'bg-green-900/40 text-green-300', média: 'bg-yellow-900/40 text-yellow-300',
  alta: 'bg-orange-900/40 text-orange-300', urgente: 'bg-red-900/40 text-red-300',
}

const FORM_INICIAL: FormT = {
  titulo: '', descricao: '', cliente_id: '', solicitante_id: '', responsavel_id: '',
  prioridade: 'média', status: 'A Fazer', data_vencimento: '', recorrencia: 'não',
}

function isAtrasada(t: Tarefa): boolean {
  if (!t.data_vencimento || t.status === 'Concluído') return false
  return new Date(new Date().toDateString()) > new Date(t.data_vencimento + 'T00:00:00')
}

function calcProxima(data: string, rec: 'semanal' | 'mensal'): string {
  const d = new Date(data || new Date().toISOString().split('T')[0])
  rec === 'semanal' ? d.setDate(d.getDate() + 7) : d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export default function Tarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  // modal: null=fechado | 'novo'=criando | Tarefa=editando
  const [modal, setModal] = useState<null | 'novo' | Tarefa>(null)
  const [form, setForm] = useState<FormT>(FORM_INICIAL)

  const buscarTudo = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const [{ data: us, error: eu }, { data: cs, error: ec }, { data: ts, error: et }] =
        await Promise.all([
          supabase!.from('usuarios').select('id,nome,email,role').order('nome'),
          supabase!.from('clientes').select('id,nome').eq('status', 'Ativo').order('nome'),
          supabase!.from('tarefas').select(`
            *,
            clientes(nome),
            responsavel_usuario:usuarios!tarefas_responsavel_id_fkey(nome),
            solicitante_usuario:usuarios!tarefas_solicitante_id_fkey(nome)
          `).eq('ativa', true).order('criado_em', { ascending: false }),
        ])
      if (eu) throw new Error(eu.message)
      if (ec) throw new Error(ec.message)
      if (et) throw new Error(et.message)
      setUsuarios(us ?? [])
      setClientes(cs ?? [])
      setTarefas((ts as Tarefa[]) ?? [])
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { buscarTudo() }, [buscarTudo])

  function abrirNovo() { setForm(FORM_INICIAL); setModal('novo'); setErro(null) }

  function abrirEdicao(t: Tarefa) {
    setForm({
      titulo: t.titulo, descricao: t.descricao ?? '',
      cliente_id: t.cliente_id ?? '', solicitante_id: t.solicitante_id ?? '',
      responsavel_id: t.responsavel_id ?? '', prioridade: t.prioridade,
      status: t.status, data_vencimento: t.data_vencimento ?? '',
      recorrencia: t.recorrencia,
    })
    setModal(t); setErro(null)
  }

  function fecharModal() { setModal(null); setErro(null) }

  async function handleSalvar() {
    if (!form.titulo.trim()) { setErro('Título é obrigatório.'); return }
    setSalvando(true); setErro(null)
    try {
      const respUser = usuarios.find(u => u.id === form.responsavel_id)
      const solUser = usuarios.find(u => u.id === form.solicitante_id)
      const proxima = form.recorrencia !== 'não'
        ? calcProxima(form.data_vencimento || new Date().toISOString().split('T')[0], form.recorrencia)
        : null

      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        cliente_id: form.cliente_id || null,
        solicitante: solUser?.nome ?? null,
        responsavel: respUser?.nome ?? null,
        solicitante_id: form.solicitante_id || null,
        responsavel_id: form.responsavel_id || null,
        prioridade: form.prioridade,
        status: form.status,
        data_vencimento: form.data_vencimento || null,
        recorrencia: form.recorrencia,
        proxima_execucao: proxima,
        ativa: true,
      }

      if (modal === 'novo') {
        const { error } = await supabase!.from('tarefas').insert([payload])
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase!.from('tarefas').update(payload).eq('id', (modal as Tarefa).id)
        if (error) throw new Error(error.message)
      }
      fecharModal(); await buscarTudo()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSalvando(false) }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja excluir esta tarefa?')) return
    await supabase!.from('tarefas').update({ ativa: false }).eq('id', id)
    fecharModal(); await buscarTudo()
  }

  async function moverTarefa(id: string, status: Tarefa['status']) {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    const { error } = await supabase!.from('tarefas').update({ status }).eq('id', id)
    if (error) await buscarTudo()
  }

  const filtradas = filtroResponsavel ? tarefas.filter(t => t.responsavel_id === filtroResponsavel) : tarefas
  const porColuna = (s: Tarefa['status']) => filtradas.filter(t => t.status === s)
  const isEdicao = modal !== null && modal !== 'novo'

  return (
    <div className="p-6 min-h-screen" style={{ background: '#0A0A0A', color: '#E5E5E5' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Nunito, sans-serif' }}>Tarefas</h1>
          <p className="text-sm text-gray-400 mt-1">{tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''} ativas</p>
        </div>
        <button onClick={abrirNovo}
          className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-80 transition-opacity"
          style={{ background: '#C9A84C', color: '#0A0A0A' }}>
          + Nova Tarefa
        </button>
      </div>

      {/* Filtro responsável */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs text-gray-400">Filtrar por responsável:</label>
        <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 border border-gray-700 outline-none"
          style={{ background: '#1A1A1A', color: '#E5E5E5' }}>
          <option value="">Todos</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        {filtroResponsavel && (
          <button onClick={() => setFiltroResponsavel('')} className="text-xs text-gray-500 hover:text-gray-300">✕ Limpar</button>
        )}
      </div>

      {erro && !modal && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">{erro}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUNAS.map(col => (
            <div key={col} className="rounded-xl p-3" style={{ background: '#141414' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm" style={{ color: '#C9A84C' }}>{col}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{porColuna(col).length}</span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {porColuna(col).length === 0 && <p className="text-xs text-gray-600 text-center py-4">Nenhuma tarefa</p>}
                {porColuna(col).map(t => (
                  <TarefaCard key={t.id} tarefa={t} colunas={COLUNAS}
                    onMover={moverTarefa} onEditar={abrirEdicao} onExcluir={handleExcluir} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) fecharModal() }}>
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#C9A84C', fontFamily: 'Nunito, sans-serif' }}>
                {isEdicao ? '✏️ Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              <button onClick={fecharModal} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
            </div>

            {erro && <div className="mb-3 p-2 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-xs">{erro}</div>}

            <div className="space-y-3">
              {/* Título */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Nome da tarefa"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  rows={2} placeholder="Detalhes da tarefa..."
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600 resize-none"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                  <option value="">Selecionar cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Solicitante + Responsável */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Solicitante</label>
                  <select value={form.solicitante_id} onChange={e => setForm(p => ({ ...p, solicitante_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                    <option value="">Selecionar</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Responsável</label>
                  <select value={form.responsavel_id} onChange={e => setForm(p => ({ ...p, responsavel_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                    <option value="">Selecionar</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Prioridade + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Prioridade</label>
                  <select value={form.prioridade} onChange={e => setForm(p => ({ ...p, prioridade: e.target.value as FormT['prioridade'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as FormT['status'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                    {COLUNAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Data + Recorrência */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data de entrega</label>
                  <input type="date" value={form.data_vencimento}
                    onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Recorrência</label>
                  <select value={form.recorrencia} onChange={e => setForm(p => ({ ...p, recorrencia: e.target.value as FormT['recorrencia'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                    <option value="não">Não recorrente</option>
                    <option value="semanal">↻ Semanal</option>
                    <option value="mensal">↻ Mensal</option>
                  </select>
                </div>
              </div>

              {form.recorrencia !== 'não' && (
                <div className="p-3 rounded-lg border text-xs" style={{ background: '#1f1a0a', borderColor: '#C9A84C40', color: '#C9A84C' }}>
                  ↻ Gerada automaticamente toda {form.recorrencia === 'semanal' ? 'semana' : 'mês'}.
                  {form.data_vencimento && (
                    <span className="block mt-1 text-gray-400">
                      Próxima: {new Date(calcProxima(form.data_vencimento, form.recorrencia)).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-between items-center mt-5">
              {isEdicao ? (
                <button onClick={() => handleExcluir((modal as Tarefa).id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors" disabled={salvando}>
                  🗑 Excluir
                </button>
              ) : <span />}
              <div className="flex gap-3">
                <button onClick={fecharModal} disabled={salvando}
                  className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-gray-200">Cancelar</button>
                <button onClick={handleSalvar} disabled={salvando || !form.titulo.trim()}
                  className="px-5 py-2 text-sm font-semibold rounded-lg hover:opacity-80 disabled:opacity-40"
                  style={{ background: '#C9A84C', color: '#0A0A0A' }}>
                  {salvando ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Criar Tarefa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  tarefa: Tarefa; colunas: Tarefa['status'][]
  onMover: (id: string, s: Tarefa['status']) => void
  onEditar: (t: Tarefa) => void
  onExcluir: (id: string) => void
}

function TarefaCard({ tarefa, colunas, onMover, onEditar }: CardProps) {
  const atrasada = isAtrasada(tarefa)
  const nomeResp = tarefa.responsavel_usuario?.nome ?? tarefa.responsavel ?? '—'
  const nomeCliente = tarefa.clientes?.nome ?? null

  return (
    <div className={`rounded-xl p-3 ${PRIORIDADE_COR[tarefa.prioridade] ?? 'border-l-4 border-gray-600'}`}
      style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}>

      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-tight text-gray-100 flex-1">{tarefa.titulo}</p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={() => onEditar(tarefa)}
              className="text-gray-600 hover:text-yellow-400 transition-colors text-xs"
              title="Editar">✏️</button>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORIDADE_BADGE[tarefa.prioridade] ?? ''}`}>
              {tarefa.prioridade}
            </span>
          </div>
          {tarefa.recorrencia !== 'não' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: '#C9A84C22', color: '#C9A84C' }}>
              ↻ {tarefa.recorrencia}
            </span>
          )}
        </div>
      </div>

      {tarefa.descricao && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{tarefa.descricao}</p>}

      <div className="space-y-1">
        {nomeCliente && <p className="text-xs text-gray-500"><span className="text-gray-600">Cliente: </span>{nomeCliente}</p>}
        <p className="text-xs text-gray-500"><span className="text-gray-600">Resp: </span>{nomeResp}</p>
        {tarefa.data_vencimento && (
          <p className={`text-xs font-medium ${atrasada ? 'text-red-400' : 'text-gray-400'}`}>
            {atrasada ? '⚠ Atrasada · ' : ''}
            {new Date(tarefa.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-800">
        <select value={tarefa.status} onChange={e => onMover(tarefa.id, e.target.value as Tarefa['status'])}
          className="w-full text-xs px-2 py-1 rounded-lg border border-gray-700 outline-none"
          style={{ background: '#1A1A1A', color: '#C9A84C' }}>
          {colunas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  )
}
