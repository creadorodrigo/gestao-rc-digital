import { useState, useEffect, useCallback, useMemo } from 'react'
import { Star, Users, TrendingUp, ThumbsUp, ThumbsDown, Minus, RefreshCw, Link2, Check } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../types'
import PesquisaNPS from '../components/PesquisaNPS'

type Filtro = 'Todos' | 'Promotores' | 'Passivos' | 'Detratores' | 'Não respondido'

const DONUT_COLORS = ['#22c55e', '#eab308', '#ef4444']

const STATUS_COR: Record<string, { bg: string; color: string }> = {
  Ativo:        { bg: '#22c55e20', color: '#22c55e' },
  Prospectando: { bg: '#3b82f620', color: '#3b82f6' },
  Encerrado:    { bg: '#ef444420', color: '#ef4444' },
}

function corScore(score: number): string {
  if (score >= 9) return '#22c55e'
  if (score >= 7) return '#eab308'
  return '#ef4444'
}

function classificar(score: number): string {
  if (score >= 9) return 'Promotor'
  if (score >= 7) return 'Passivo'
  return 'Detrator'
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function DashboardNPS() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('Todos')
  const [clienteNps, setClienteNps] = useState<Cliente | null>(null)
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { data, error } = await supabase!
        .from('clientes')
        .select('id, nome, status, nps_score, nps_pontos_fortes, nps_pontos_fracos, nps_respondido_em, nps_token')
        .eq('status', 'Ativo')
        .order('nome')
      if (error) throw new Error(error.message)
      setClientes((data as Cliente[]) ?? [])
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { buscar() }, [buscar])

  // Stats
  const responderam = useMemo(() => clientes.filter(c => c.nps_respondido_em), [clientes])
  const promotores = useMemo(() => responderam.filter(c => (c.nps_score ?? -1) >= 9), [responderam])
  const passivos = useMemo(() => responderam.filter(c => { const s = c.nps_score ?? -1; return s >= 7 && s <= 8 }), [responderam])
  const detratores = useMemo(() => responderam.filter(c => { const s = c.nps_score ?? -1; return s >= 0 && s <= 6 }), [responderam])
  const naoResponderam = useMemo(() => clientes.filter(c => !c.nps_respondido_em), [clientes])

  const npsGeral = useMemo(() => {
    if (!responderam.length) return '—'
    const pct = (v: number) => (v / responderam.length) * 100
    return Math.round(pct(promotores.length) - pct(detratores.length))
  }, [responderam, promotores, detratores])

  const taxaResposta = useMemo(() => {
    if (!clientes.length) return '0%'
    return `${Math.round((responderam.length / clientes.length) * 100)}%`
  }, [clientes, responderam])

  const donutData = [
    { name: 'Promotores', value: promotores.length },
    { name: 'Passivos', value: passivos.length },
    { name: 'Detratores', value: detratores.length },
  ]

  const stats = [
    { label: 'NPS Geral', value: npsGeral, icon: Star, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Taxa de Resposta', value: taxaResposta, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Promotores', value: promotores.length, icon: ThumbsUp, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Passivos', value: passivos.length, icon: Minus, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Detratores', value: detratores.length, icon: ThumbsDown, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Não responderam', value: naoResponderam.length, icon: Users, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  ]

  // Filtered list
  const listaFiltrada = useMemo(() => {
    if (filtro === 'Promotores') return promotores
    if (filtro === 'Passivos') return passivos
    if (filtro === 'Detratores') return detratores
    if (filtro === 'Não respondido') return naoResponderam
    return clientes
  }, [filtro, clientes, promotores, passivos, detratores, naoResponderam])

  const filtros: Filtro[] = ['Todos', 'Promotores', 'Passivos', 'Detratores', 'Não respondido']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Carregando NPS...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Star size={20} className="text-gold" /> Dashboard NPS
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">Net Promoter Score — RC Digital</p>
        </div>
        <button
          onClick={buscar}
          className="btn-ghost flex items-center gap-1.5 text-xs"
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {erro && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 10, padding: '10px 14px' }}>
          <p className="text-red-400 text-sm">{erro}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
            </div>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + info */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card flex flex-col items-center">
          <h2 className="text-sm font-bold text-gray-200 mb-2 self-start">Distribuição NPS</h2>
          {responderam.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-gray-600 text-sm">
              Nenhuma resposta ainda
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={(props: any) => props.percent && props.percent > 0 ? `${(props.percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 12, fontSize: 12 }}
                    itemStyle={{ color: '#ccc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-1 w-full px-2">
                {donutData.map((g, i) => (
                  <div key={g.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                    <span className="text-gray-400">{g.name}</span>
                    <span className="font-mono font-bold text-gray-200 ml-auto">{g.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* NPS score context */}
        <div className="xl:col-span-2 card">
          <h2 className="text-sm font-bold text-gray-200 mb-4">Como interpretar o NPS</h2>
          <div className="space-y-3">
            {[
              { range: '9–10', label: 'Promotores', desc: 'Clientes leais que recomendam ativamente.', color: '#22c55e' },
              { range: '7–8', label: 'Passivos', desc: 'Satisfeitos, mas não entusiasmados.', color: '#eab308' },
              { range: '0–6', label: 'Detratores', desc: 'Insatisfeitos que podem prejudicar a reputação.', color: '#ef4444' },
            ].map(item => (
              <div
                key={item.label}
                style={{ background: `${item.color}10`, border: `1px solid ${item.color}25`, borderRadius: 10, padding: '10px 14px' }}
                className="flex items-center gap-3"
              >
                <span className="font-mono font-bold text-lg w-12 flex-shrink-0" style={{ color: item.color }}>{item.range}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-600 pt-1">
              Fórmula NPS: <span className="font-mono text-gray-500">% Promotores − % Detratores</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div>
        <div className="flex gap-1 flex-wrap mb-4">
          {filtros.map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={filtro === f ? 'btn-primary text-xs py-1.5 px-3' : 'btn-ghost text-xs py-1.5 px-3'}
            >
              {f}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                {f === 'Todos' ? clientes.length
                  : f === 'Promotores' ? promotores.length
                  : f === 'Passivos' ? passivos.length
                  : f === 'Detratores' ? detratores.length
                  : naoResponderam.length}
              </span>
            </button>
          ))}
        </div>

        {/* Client list */}
        {listaFiltrada.length === 0 ? (
          <div
            style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 12 }}
            className="flex items-center justify-center py-12 text-gray-600 text-sm"
          >
            Nenhum cliente nesta categoria
          </div>
        ) : (
          <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header */}
            <div
              className="grid text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3"
              style={{ borderBottom: '1px solid #1E1E1E', gridTemplateColumns: '1.5fr 100px 90px 1fr 1fr 110px 120px 120px' }}
            >
              <span>Cliente</span>
              <span>Status</span>
              <span>NPS</span>
              <span>Pontos fortes</span>
              <span>Melhorias</span>
              <span>Respondido em</span>
              <span></span>
              <span>Link</span>
            </div>
            {listaFiltrada.map((c, idx) => (
              <div
                key={c.id}
                className="grid items-center px-4 py-3 text-sm hover:bg-dark-300 transition-colors"
                style={{
                  gridTemplateColumns: '1.5fr 100px 90px 1fr 1fr 110px 120px 120px',
                  borderBottom: idx < listaFiltrada.length - 1 ? '1px solid #1E1E1E' : 'none',
                }}
              >
                {/* Nome */}
                <span className="font-medium text-gray-200 truncate pr-2">{c.nome}</span>

                {/* Status */}
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
                  style={STATUS_COR[c.status] ?? { bg: '#33333320', color: '#888' }}
                >
                  {c.status}
                </span>

                {/* NPS score */}
                {c.nps_score != null ? (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-lg font-bold font-mono"
                      style={{ color: corScore(c.nps_score) }}
                    >
                      {c.nps_score}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `${corScore(c.nps_score)}20`,
                        color: corScore(c.nps_score),
                      }}
                    >
                      {classificar(c.nps_score)}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600 text-xs">—</span>
                )}

                {/* Pontos fortes */}
                <span className="text-gray-400 text-xs truncate pr-2" title={c.nps_pontos_fortes ?? ''}>
                  {c.nps_pontos_fortes || <span className="text-gray-600">—</span>}
                </span>

                {/* Pontos fracos */}
                <span className="text-gray-400 text-xs truncate pr-2" title={c.nps_pontos_fracos ?? ''}>
                  {c.nps_pontos_fracos || <span className="text-gray-600">—</span>}
                </span>

                {/* Data */}
                <span className="text-gray-500 text-xs">
                  {c.nps_respondido_em ? fmtData(c.nps_respondido_em) : <span className="text-gray-600">Não respondeu</span>}
                </span>

                {/* Action: Coletar NPS */}
                <button
                  onClick={() => setClienteNps(c)}
                  className="btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                >
                  <Star size={11} className="text-gold" />
                  Coletar NPS
                </button>

                {/* Action: Copiar Link */}
                {c.nps_token && (
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/pesquisa/${c.nps_token}`
                      navigator.clipboard.writeText(link)
                      setLinkCopiado(c.id)
                      setTimeout(() => setLinkCopiado(null), 2000)
                    }}
                    className="btn-ghost text-xs py-1 px-2 flex items-center gap-1"
                    title={`${window.location.origin}/pesquisa/${c.nps_token}`}
                    style={linkCopiado === c.id ? { color: '#22c55e' } : {}}
                  >
                    {linkCopiado === c.id
                      ? <><Check size={11} /> Copiado!</>
                      : <><Link2 size={11} /> Copiar Link</>
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NPS Modal */}
      {clienteNps && (
        <PesquisaNPS
          clienteId={clienteNps.id}
          clienteNome={clienteNps.nome}
          onClose={() => setClienteNps(null)}
          onSuccess={buscar}
        />
      )}
    </div>
  )
}
