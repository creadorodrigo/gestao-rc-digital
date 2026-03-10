import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Usuario { id: string; nome: string; email: string; role: string }

interface Cliente {
  id: string; nome: string; site: string | null; tipo: string | null
  status: string; investimento_mensal: number | null; conta_meta_ads: string | null
  conta_google_ads: string | null; meta_faturamento: number | null
  faturado_ate_data: number | null; responsaveis: string[]
  contrato_mensal: number | null; vigencia_inicio: string | null
  vigencia_fim: string | null; nps: number | null; criado_em: string
}

interface FormC {
  nome: string; site: string; tipo: string; status: string
  investimento_mensal: string; conta_meta_ads: string; conta_google_ads: string
  meta_faturamento: string; faturado_ate_data: string; contrato_mensal: string
  vigencia_inicio: string; vigencia_fim: string; nps: string
  responsaveis: string[]   // array de UUIDs de usuários
}

const TIPOS = ['E-commerce', 'Negócio Local', 'Mercado', 'Indústria']
const STATUS_OPTS = ['Ativo', 'Pausado', 'Inativo', 'Prospectando']
const VISUALIZACOES = ['lista', 'kanban'] as const

const FORM_INICIAL: FormC = {
  nome: '', site: '', tipo: '', status: 'Ativo',
  investimento_mensal: '', conta_meta_ads: '', conta_google_ads: '',
  meta_faturamento: '', faturado_ate_data: '', contrato_mensal: '',
  vigencia_inicio: '', vigencia_fim: '', nps: '',
  responsaveis: [],
}

const STATUS_COR: Record<string, { bg: string; text: string }> = {
  Ativo:    { bg: '#0d2b0d', text: '#4ade80' },
  Pausado:  { bg: '#2b220d', text: '#fbbf24' },
  Inativo:  { bg: '#2b0d0d', text: '#f87171' },
  Prospectando: { bg: '#0d1a2b', text: '#60a5fa' },
}

function fmt(v: number | null, prefix = 'R$') {
  if (v == null) return '—'
  return `${prefix} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

// ── Multi-select de responsáveis ─────────────────────────────────────────────
function ResponsaveisSelect({
  usuarios, value, onChange,
}: {
  usuarios: Usuario[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  }

  const selecionados = usuarios.filter(u => value.includes(u.id))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setAberto(a => !a)}
        style={{
          minHeight: 38, padding: '6px 10px', borderRadius: 8,
          border: `1px solid ${aberto ? '#C9A84C66' : '#2A2A2A'}`,
          background: '#0A0A0A', cursor: 'pointer',
          display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
        }}
      >
        {selecionados.length === 0 && (
          <span style={{ fontSize: 12, color: '#444' }}>Selecionar responsáveis...</span>
        )}
        {selecionados.map(u => (
          <span key={u.id} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#C9A84C22', color: '#C9A84C',
            borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600,
          }}>
            {u.nome.split(' ')[0]}
            <button
              onClick={e => { e.stopPropagation(); toggle(u.id) }}
              style={{ background: 'none', border: 'none', color: '#C9A84C', cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1 }}
            >×</button>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: '#444', fontSize: 12 }}>▾</span>
      </div>

      {/* Dropdown */}
      {aberto && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}>
          {usuarios.map(u => {
            const sel = value.includes(u.id)
            return (
              <div
                key={u.id}
                onClick={() => toggle(u.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', cursor: 'pointer',
                  background: sel ? '#C9A84C11' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = sel ? '#C9A84C22' : '#222')}
                onMouseLeave={e => (e.currentTarget.style.background = sel ? '#C9A84C11' : 'transparent')}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: `1.5px solid ${sel ? '#C9A84C' : '#444'}`,
                  background: sel ? '#C9A84C' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {sel && <span style={{ color: '#0A0A0A', fontSize: 10, fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#C9A84C33', color: '#C9A84C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#E5E5E5', margin: 0 }}>{u.nome}</p>
                  <p style={{ fontSize: 10, color: '#555', margin: 0 }}>{u.role}</p>
                </div>
              </div>
            )
          })}
          {usuarios.length === 0 && (
            <p style={{ fontSize: 12, color: '#555', padding: '10px 12px', margin: 0 }}>Nenhum usuário encontrado</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Avatares de responsáveis (para os cards) ──────────────────────────────────
function AvatarResponsaveis({ ids, usuarios }: { ids: string[]; usuarios: Usuario[] }) {
  if (!ids || ids.length === 0) return <span style={{ fontSize: 11, color: '#444' }}>—</span>
  const lista = ids.map(id => usuarios.find(u => u.id === id)).filter(Boolean) as Usuario[]
  return (
    <div style={{ display: 'flex', gap: -4 }}>
      {lista.slice(0, 4).map((u, i) => (
        <div
          key={u.id}
          title={u.nome}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            background: '#C9A84C33', border: '1.5px solid #0A0A0A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#C9A84C',
            marginLeft: i > 0 ? -6 : 0, zIndex: lista.length - i,
            position: 'relative',
          }}
        >
          {u.nome.charAt(0).toUpperCase()}
        </div>
      ))}
      {lista.length > 4 && (
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: '#2A2A2A', border: '1.5px solid #0A0A0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#888', marginLeft: -6, position: 'relative',
        }}>
          +{lista.length - 4}
        </div>
      )}
    </div>
  )
}

export default function Clientes() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [visualizacao, setVisualizacao] = useState<typeof VISUALIZACOES[number]>('lista')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [modal, setModal] = useState<null | 'novo' | Cliente>(null)
  const [form, setForm] = useState<FormC>(FORM_INICIAL)

  const buscarTudo = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const [{ data: cs, error: ec }, { data: us, error: eu }] = await Promise.all([
        supabase!.from('clientes').select('*').order('nome'),
        supabase!.from('usuarios').select('id,nome,email,role').order('nome'),
      ])
      if (ec) throw new Error(ec.message)
      if (eu) throw new Error(eu.message)
      setClientes((cs as Cliente[]) ?? [])
      setUsuarios(us ?? [])
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { buscarTudo() }, [buscarTudo])

  function abrirNovo() { setForm(FORM_INICIAL); setModal('novo'); setErro(null) }

  function abrirEdicao(c: Cliente) {
    setForm({
      nome: c.nome, site: c.site ?? '', tipo: c.tipo ?? '', status: c.status,
      investimento_mensal: c.investimento_mensal?.toString() ?? '',
      conta_meta_ads: c.conta_meta_ads ?? '',
      conta_google_ads: c.conta_google_ads ?? '',
      meta_faturamento: c.meta_faturamento?.toString() ?? '',
      faturado_ate_data: c.faturado_ate_data?.toString() ?? '',
      contrato_mensal: c.contrato_mensal?.toString() ?? '',
      vigencia_inicio: c.vigencia_inicio ?? '',
      vigencia_fim: c.vigencia_fim ?? '',
      nps: c.nps?.toString() ?? '',
      responsaveis: c.responsaveis ?? [],
    })
    setModal(c); setErro(null)
  }

  function fecharModal() { setModal(null); setErro(null) }

  async function handleSalvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro(null)
    try {
      const payload = {
        nome: form.nome.trim(),
        site: form.site || null,
        tipo: form.tipo || null,
        status: form.status,
        investimento_mensal: form.investimento_mensal ? parseFloat(form.investimento_mensal) : null,
        conta_meta_ads: form.conta_meta_ads || null,
        conta_google_ads: form.conta_google_ads || null,
        meta_faturamento: form.meta_faturamento ? parseFloat(form.meta_faturamento) : null,
        faturado_ate_data: form.faturado_ate_data ? parseFloat(form.faturado_ate_data) : null,
        contrato_mensal: form.contrato_mensal ? parseFloat(form.contrato_mensal) : null,
        vigencia_inicio: form.vigencia_inicio || null,
        vigencia_fim: form.vigencia_fim || null,
        nps: form.nps ? parseInt(form.nps) : null,
        responsaveis: form.responsaveis,
      }
      if (modal === 'novo') {
        const { error } = await supabase!.from('clientes').insert([payload])
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase!.from('clientes').update(payload).eq('id', (modal as Cliente).id)
        if (error) throw new Error(error.message)
      }
      fecharModal(); await buscarTudo()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSalvando(false) }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Deseja excluir este cliente?')) return
    await supabase!.from('clientes').delete().eq('id', id)
    fecharModal(); await buscarTudo()
  }

  // Filtros
  const filtrados = clientes.filter(c => {
    if (filtroStatus && c.status !== filtroStatus) return false
    if (filtroResponsavel && !(c.responsaveis ?? []).includes(filtroResponsavel)) return false
    return true
  })

  const isEdicao = modal !== null && modal !== 'novo'

  return (
    <div className="p-6 min-h-screen" style={{ background: '#0A0A0A', color: '#E5E5E5' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Nunito, sans-serif' }}>Clientes</h1>
          <p className="text-sm text-gray-400 mt-1">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle visualização */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #2A2A2A' }}>
            {VISUALIZACOES.map(v => (
              <button key={v} onClick={() => setVisualizacao(v)}
                style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: visualizacao === v ? '#C9A84C' : '#141414',
                  color: visualizacao === v ? '#0A0A0A' : '#666',
                  transition: 'all 0.15s', fontFamily: 'Nunito, sans-serif',
                  textTransform: 'capitalize',
                }}>
                {v === 'lista' ? '☰ Lista' : '⬛ Kanban'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={abrirNovo}
              className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-80 transition-opacity"
              style={{ background: '#C9A84C', color: '#0A0A0A' }}>
              + Novo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Status:</label>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 border border-gray-700 outline-none"
            style={{ background: '#1A1A1A', color: '#E5E5E5' }}>
            <option value="">Todos</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Responsável:</label>
          <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 border border-gray-700 outline-none"
            style={{ background: '#1A1A1A', color: '#E5E5E5' }}>
            <option value="">Todos</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        {(filtroStatus || filtroResponsavel) && (
          <button onClick={() => { setFiltroStatus(''); setFiltroResponsavel('') }}
            className="text-xs text-gray-500 hover:text-gray-300">✕ Limpar filtros</button>
        )}
        {(filtroStatus || filtroResponsavel) && (
          <span className="text-xs text-gray-500">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
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
          {/* ══ LISTA ══ */}
          {visualizacao === 'lista' && (
            <div className="space-y-2">
              {filtrados.length === 0 && (
                <p className="text-center text-gray-600 py-16">Nenhum cliente encontrado.</p>
              )}
              {filtrados.map(c => {
                const cor = STATUS_COR[c.status] ?? { bg: '#1A1A1A', text: '#888' }
                return (
                  <div key={c.id}
                    className="rounded-xl p-4 flex items-center gap-4"
                    style={{ background: '#141414', border: '1px solid #1E1E1E' }}>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: '#C9A84C22', color: '#C9A84C' }}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-100">{c.nome}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: cor.bg, color: cor.text }}>{c.status}</span>
                        {c.tipo && <span className="text-[10px] text-gray-500">{c.tipo}</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {c.site && <a href={c.site.startsWith('http') ? c.site : `https://${c.site}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-gold truncate max-w-[160px]">{c.site}</a>}
                        {isAdmin && c.investimento_mensal && (
                          <span className="text-xs text-gray-500">Inv: {fmt(c.investimento_mensal)}</span>
                        )}
                        {isAdmin && c.nps && (
                          <span className="text-xs" style={{ color: c.nps >= 7 ? '#4ade80' : '#f87171' }}>NPS {c.nps}</span>
                        )}
                      </div>
                    </div>
                    {/* Responsáveis */}
                    <div className="flex-shrink-0">
                      <AvatarResponsaveis ids={c.responsaveis} usuarios={usuarios} />
                    </div>
                    {/* Ações */}
                    {isAdmin && (
                      <button onClick={() => abrirEdicao(c)}
                        className="text-gray-600 hover:text-yellow-400 transition-colors text-xs flex-shrink-0"
                        title="Editar">✏️</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ══ KANBAN por status ══ */}
          {visualizacao === 'kanban' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {STATUS_OPTS.map(status => {
                const lista = filtrados.filter(c => c.status === status)
                const cor = STATUS_COR[status] ?? { bg: '#1A1A1A', text: '#888' }
                return (
                  <div key={status} className="rounded-xl p-3" style={{ background: '#141414' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: cor.bg, color: cor.text }}>{status}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{lista.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[60px]">
                      {lista.length === 0 && <p className="text-xs text-gray-700 text-center py-4">—</p>}
                      {lista.map(c => (
                        <div key={c.id} className="rounded-xl p-3"
                          style={{ background: '#0F0F0F', border: '1px solid #2A2A2A' }}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-gray-100 leading-tight">{c.nome}</p>
                            {isAdmin && (
                              <button onClick={() => abrirEdicao(c)}
                                className="text-gray-600 hover:text-yellow-400 transition-colors text-xs flex-shrink-0"
                                title="Editar">✏️</button>
                            )}
                          </div>
                          {c.tipo && <p className="text-xs text-gray-500 mb-2">{c.tipo}</p>}
                          {isAdmin && c.investimento_mensal && (
                            <p className="text-xs text-gray-400 mb-2">{fmt(c.investimento_mensal)}/mês</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <AvatarResponsaveis ids={c.responsaveis} usuarios={usuarios} />
                            {isAdmin && c.nps && (
                              <span className="text-xs font-bold"
                                style={{ color: c.nps >= 7 ? '#4ade80' : '#f87171' }}>NPS {c.nps}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ══ MODAL ══ */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={e => { if (e.target === e.currentTarget) fecharModal() }}>
          <div className="w-full max-w-xl rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#C9A84C', fontFamily: 'Nunito, sans-serif' }}>
                {isEdicao ? '✏️ Editar Cliente' : '+ Novo Cliente'}
              </h2>
              <button onClick={fecharModal} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
            </div>

            {erro && <div className="mb-3 p-2 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-xs">{erro}</div>}

            <div className="space-y-3">

              {/* ── Seção: Informações Gerais ── */}
              <div className="pb-0.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Informações Gerais</p>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
              </div>

              {/* Tipo + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                    <option value="">Selecionar</option>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }}>
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Responsáveis — multi-select dinâmico */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Responsáveis</label>
                <ResponsaveisSelect
                  usuarios={usuarios}
                  value={form.responsaveis}
                  onChange={ids => setForm(p => ({ ...p, responsaveis: ids }))}
                />
              </div>

              {/* Site */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Site</label>
                <input value={form.site} onChange={e => setForm(p => ({ ...p, site: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-yellow-600"
                  style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
              </div>

              {/* ── Seção: Plataformas de Ads ── */}
              <div className="pt-2 pb-0.5" style={{ borderTop: '1px solid #1E1E1E', marginTop: 4 }}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Plataformas de Ads</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Conta Meta Ads</label>
                  <input value={form.conta_meta_ads} onChange={e => setForm(p => ({ ...p, conta_meta_ads: e.target.value }))}
                    placeholder="ID da conta"
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5', fontFamily: 'DM Mono, monospace' }} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Conta Google Ads</label>
                  <input value={form.conta_google_ads} onChange={e => setForm(p => ({ ...p, conta_google_ads: e.target.value }))}
                    placeholder="ID da conta"
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5', fontFamily: 'DM Mono, monospace' }} />
                </div>
              </div>

              {/* ── Seção: Meta (visível para todos) ── */}
              <div className="pt-2 pb-0.5" style={{ borderTop: '1px solid #1E1E1E', marginTop: 4 }}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Meta</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Investimento/mês (R$)</label>
                  <input type="number" value={form.investimento_mensal} onChange={e => setForm(p => ({ ...p, investimento_mensal: e.target.value }))}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Meta faturamento (R$)</label>
                  <input type="number" value={form.meta_faturamento} onChange={e => setForm(p => ({ ...p, meta_faturamento: e.target.value }))}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Faturado até (R$)</label>
                  <input type="number" value={form.faturado_ate_data} onChange={e => setForm(p => ({ ...p, faturado_ate_data: e.target.value }))}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                    style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
                </div>
              </div>

              {/* ── Seção: Financeiro (só admin) ── */}
              {isAdmin && (
                <>
                  <div className="pt-2 pb-0.5" style={{ borderTop: '1px solid #C9A84C44', marginTop: 4 }}>
                    <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#C9A84C88' }}>
                      🔒 Financeiro
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Contrato/mês (R$)</label>
                      <input type="number" value={form.contrato_mensal} onChange={e => setForm(p => ({ ...p, contrato_mensal: e.target.value }))}
                        placeholder="0,00"
                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                        style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">NPS (0–10)</label>
                      <input type="number" min={0} max={10} value={form.nps} onChange={e => setForm(p => ({ ...p, nps: e.target.value }))}
                        placeholder="0–10"
                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                        style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Vigência início</label>
                      <input type="date" value={form.vigencia_inicio} onChange={e => setForm(p => ({ ...p, vigencia_inicio: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                        style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Vigência fim</label>
                      <input type="date" value={form.vigencia_fim} onChange={e => setForm(p => ({ ...p, vigencia_fim: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none"
                        style={{ background: '#0A0A0A', color: '#E5E5E5' }} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-between items-center mt-5">
              {isEdicao && isAdmin ? (
                <button onClick={() => handleExcluir((modal as Cliente).id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors" disabled={salvando}>
                  🗑 Excluir
                </button>
              ) : <span />}
              <div className="flex gap-3">
                <button onClick={fecharModal} disabled={salvando}
                  className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-gray-200">Cancelar</button>
                <button onClick={handleSalvar} disabled={salvando || !form.nome.trim()}
                  className="px-5 py-2 text-sm font-semibold rounded-lg hover:opacity-80 disabled:opacity-40"
                  style={{ background: '#C9A84C', color: '#0A0A0A' }}>
                  {salvando ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Criar Cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
