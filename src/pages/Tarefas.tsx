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

type Visualizacao = 'kanban' | 'calendario'

const COLUNAS: Tarefa['status'][] = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Concluído']
const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

const PRIORIDADE_COR: Record<string, string> = {
  baixa: 'border-l-4 border-green-500', média: 'border-l-4 border-yellow-400',
  alta: 'border-l-4 border-orange-500', urgente: 'border-l-4 border-red-600',
}
const PRIORIDADE_BADGE: Record<string, string> = {
  baixa: 'bg-green-900/40 text-green-300', média: 'bg-yellow-900/40 text-yellow-300',
  alta: 'bg-orange-900/40 text-orange-300', urgente: 'bg-red-900/40 text-red-300',
}
const PRIORIDADE_BORDA: Record<string, string> = {
  baixa: '#22c55e', média: '#eab308', alta: '#f97316', urgente: '#ef4444',
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

function inicioSemana(ref: Date): Date {
  const d = new Date(ref)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDias(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function toDateStr(d: Date): string {
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
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('kanban')
  const [semanaRef, setSemanaRef] = useState<Date>(() => inicioSemana(new Date()))
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

  // Calendário
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDias(semanaRef, i))
  const hoje = toDateStr(new Date())
  const tarefasDia = (dia: Date) => filtradas.filter(t => t.data_vencimento === toDateStr(dia))
  const tarefasSemData = filtradas.filter(t => !t.data_vencimento)

  const labelSemana = () => {
    const ini = diasSemana[0]
    const fim = diasSemana[6]
    const mesIni = ini.toLocaleDateString('pt-BR', { month: 'long' })
    const mesFim = fim.toLocaleDateString('pt-BR', { month: 'long' })
    const ano = fim.getFullYear()
    return mesIni === mesFim ? `${mesIni} de ${ano}` : `${mesIni} – ${mesFim} de ${ano}`
  }

  return (
    <div className="p-6 min-h-screen" style={{ background: '#0A0A0A', color: '#E5E5E5' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Nunito, sans-serif' }}>Tarefas</h1>
          <p className="text-sm text-gray-400 mt-1">{tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''} ativas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle visualização */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #2A2A2A' }}>
            <button
              onClick={() => setVisualizacao('kanban')}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: visualizacao === 'kanban' ? '#C9A84C' : '#141414',
                color: visualizacao === 'kanban' ? '#0A0A0A' : '#666',
                transition: 'all 0.15s', fontFamily: 'Nunito, sans-serif',
              }}
            >⬛ Kanban</button>
            <button
              onClick={() => setVisualizacao('calendario')}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: visualizacao === 'calendario' ? '#C9A84C' : '#141414',
                color: visualizacao === 'calendario' ? '#0A0A0A' : '#666',
                transition: 'all 0.15s', fontFamily: 'Nunito, sans-serif',
              }}
            >📅 Calendário</button>
          </div>
          <button onClick={abrirNovo}
            className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-80 transition-opacity"
            style={{ background: '#C9A84C', color: '#0A0A0A' }}>
            + Nova Tarefa
          </button>
        </div>
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
        <>
          {/* ══ KANBAN ══════════════════════════════════════════════════════ */}
          {visualizacao === 'kanban' && (
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

          {/* ══ CALENDÁRIO SEMANAL ═════════════════════════════════════════ */}
          {visualizacao === 'calendario' && (
            <div>
              {/* Navegação */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSemanaRef(d => addDias(d, -7))}
                    style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#888', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
                    ‹
                  </button>
                  <button
                    onClick={() => setSemanaRef(d => addDias(d, 7))}
                    style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#888', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
                    ›
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#E5E5E5', textTransform: 'capitalize', fontFamily: 'Nunito, sans-serif' }}>
                    {labelSemana()}
                  </span>
                </div>
                <button
                  onClick={() => setSemanaRef(inicioSemana(new Date()))}
                  style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #2A2A2A', background: '#141414', color: '#C9A84C', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                  Hoje
                </button>
              </div>

              {/* Faixa sem data */}
              {tarefasSemData.length > 0 && (
                <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: '#555', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Sem data ({tarefasSemData.length})
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tarefasSemData.map(t => (
                      <button key={t.id} onClick={() => abrirEdicao(t)}
                        style={{
                          background: '#0F0F0F',
                          border: '1px solid #2A2A2A',
                          borderLeft: `3px solid ${PRIORIDADE_BORDA[t.prioridade] ?? '#555'}`,
                          borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                          fontSize: 11, color: '#C0C0C0', fontFamily: 'Nunito, sans-serif',
                        }}>
                        {t.titulo}
                        {t.clientes && <span style={{ color: '#555', marginLeft: 6 }}>{t.clientes.nome}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid 7 dias */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {diasSemana.map((dia, i) => {
                  const isHoje = toDateStr(dia) === hoje
                  const lista = tarefasDia(dia)
                  return (
                    <div key={i} style={{
                      background: '#141414',
                      border: `1px solid ${isHoje ? '#C9A84C55' : '#1E1E1E'}`,
                      borderRadius: 10, minHeight: 160, overflow: 'hidden',
                    }}>
                      {/* Cabeçalho do dia */}
                      <div style={{
                        padding: '8px 10px', borderBottom: '1px solid #1E1E1E',
                        background: isHoje ? '#C9A84C0D' : 'transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {DIAS_SEMANA[i]}
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isHoje ? '#C9A84C' : '#E5E5E5',
                          background: isHoje ? '#C9A84C22' : 'transparent',
                          borderRadius: '50%', width: 26, height: 26,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {dia.getDate()}
                        </span>
                      </div>

                      {/* Cards do dia */}
                      <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {lista.length === 0 && (
                          <p style={{ fontSize: 10, color: '#2A2A2A', textAlign: 'center', padding: '14px 0' }}>—</p>
                        )}
                        {lista.map(t => {
                          const atrasada = isAtrasada(t)
                          return (
                            <button key={t.id} onClick={() => abrirEdicao(t)}
                              style={{
                                background: '#0F0F0F', border: '1px solid #2A2A2A',
                                borderLeft: `3px solid ${PRIORIDADE_BORDA[t.prioridade] ?? '#555'}`,
                                borderRadius: 6, padding: '5px 7px',
                                cursor: 'pointer', textAlign: 'left', width: '100%',
                              }}>
                              <p style={{
                                fontSize: 11, fontWeight: 600, margin: 0, lineHeight: 1.3,
                                color: atrasada ? '#ef4444' : '#D0D0D0',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                fontFamily: 'Nunito, sans-serif',
                              }}>
                                {atrasada ? '⚠ ' : ''}{t.titulo}
                              </p>
                              {t.clientes?.nome && (
                                <p style={{ fontSize: 10, color: '#555', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.clientes.nome}
                                </p>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                <span style={{
                                  fontSize: 9, padding: '1px 5px', borderRadius: 20, fontWeight: 700,
                                  background: (PRIORIDADE_BORDA[t.prioridade] ?? '#888') + '22',
                                  color: PRIORIDADE_BORDA[t.prioridade] ?? '#888',
                                }}>
                                  {t.prioridade}
                                </span>
                                {t.status === 'Concluído' && <span style={{ fontSize: 10, color: '#22c55e' }}>✓</span>}
                                {t.recorrencia !== 'não' && <span style={{ fontSize: 10, color: '#C9A84C' }}>↻</span>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legenda */}
              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                {Object.entries(PRIORIDADE_BORDA).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: v }} />
                    <span style={{ fontSize: 11, color: '#555', textTransform: 'capitalize' }}>{k}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: '#ef4444' }}>⚠</span>
                  <span style={{ fontSize: 11, color: '#555' }}>Atrasada</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: '#22c55e' }}>✓</span>
                  <span style={{ fontSize: 11, color: '#555' }}>Concluída</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: '#C9A84C' }}>↻</span>
                  <span style={{ fontSize: 11, color: '#555' }}>Recorrente</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ MODAL CRIAR / EDITAR ══════════════════════════════════════════ */}
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
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Nome da tarefa"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  rows={4} placeholder="Detalhes da tarefa..."
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                  style={{ background: '#0A0A0A', color: '#E5E5E5', resize: 'vertical', minHeight: '80px' }} />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                  <option value="">Selecionar cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

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

// ── Card Kanban ────────────────────────────────────────────────────────────────

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
