import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { mcpTool, mcpClaudeProxy } from "../lib/mcpClient"

const SUPABASE_URL = "https://mtckfghzgynimptclvtd.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Y2tmZ2h6Z3luaW1wdGNsdnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjUyMzcsImV4cCI6MjA4ODM0MTIzN30.KmAd7UBD_3GTShGMK4ZQo5EszQSg1FETOfpBN65du18"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PERIODOS = [
  { value: 'today',               label: 'Hoje' },
  { value: 'yesterday',           label: 'Ontem' },
  { value: 'last_3d',             label: 'Últimos 3 Dias' },
  { value: 'last_7d',             label: 'Últimos 7 Dias' },
  { value: 'last_14d',            label: 'Últimos 14 Dias' },
  { value: 'last_28d',            label: 'Últimos 28 Dias' },
  { value: 'last_30d',            label: 'Últimos 30 Dias' },
  { value: 'last_90d',            label: 'Últimos 90 Dias' },
  { value: 'this_week_mon_today', label: 'Esta Semana (Seg–Hoje)' },
  { value: 'this_week_sun_today', label: 'Esta Semana (Dom–Hoje)' },
  { value: 'last_week_mon_sun',   label: 'Semana Passada (Seg–Dom)' },
  { value: 'last_week_sun_sat',   label: 'Semana Passada (Dom–Sáb)' },
  { value: 'this_month',          label: 'Este Mês' },
  { value: 'last_month',          label: 'Mês Passado' },
  { value: 'this_year',           label: 'Este Ano' },
]

type MetaInsight = {
  campaign_name?: string
  campaign_id?: string
  spend?: string
  impressions?: string
  reach?: string
  clicks?: string
  ctr?: string
  cpc?: string
  cpm?: string
  frequency?: string
  effective_status?: string
  status?: string
  actions?: Array<{ action_type: string; value: string }>
  website_purchase_roas?: Array<{ action_type: string; value: string }>
}

type Cliente = {
  id: string | number
  nome: string
  conta_meta_ads: string | null
  status: string | null
}

type DadosColetados = {
  kpis: {
    investimento: string
    alcance: string
    impressoes: string
    cpm: string
    ctr: string
    visualizacoes_pagina: string
    ver_conteudo: string
    carrinhos: string
    finalizacoes_compra: string
    compras: string
    roas: string
    mensagens_iniciadas: string
  }
  campanhas: Array<{
    nome: string
    spend: string
    impressoes: string
    ctr: string
    roas: string
    compras: string
    status: string
  }>
}

type AnaliseIA = {
  resumo_estrategico: string
  analise_funil: string
  gargalos_identificados: string[]
  plano_de_acao: string[]
  insights_campanhas: Array<{ nome_campanha: string; insight: string }>
}

function extractJSON(text: string): string {
  // Remove markdown code fences
  let s = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Find first { or [ and last matching bracket
  const start = s.search(/[{[]/)
  if (start === -1) return '{}'
  const openChar = s[start]
  const closeChar = openChar === '{' ? '}' : ']'
  let depth = 0
  let end = -1
  for (let i = start; i < s.length; i++) {
    if (s[i] === openChar) depth++
    else if (s[i] === closeChar) { depth--; if (depth === 0) { end = i; break } }
  }
  return end === -1 ? s.slice(start) : s.slice(start, end + 1)
}

export default function RelatoriosIA() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [periodo, setPeriodo] = useState('last_30d')
  const [palavraChave, setPalavraChave] = useState('')
  const [comando, setComando] = useState("")

  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [coletandoDados, setColetandoDados] = useState(false)
  const [analisandoIA, setAnalisandoIA] = useState(false)

  const [dadosBase, setDadosBase] = useState<DadosColetados | null>(null)
  const [analiseProfunda, setAnaliseProfunda] = useState<AnaliseIA | null>(null)
  const [debugMcp, setDebugMcp] = useState<string>("")
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState("")

  const resultadoRef = useRef<HTMLDivElement | null>(null)
  const analiseRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let ativo = true
    async function carregarClientes() {
      try {
        setCarregandoClientes(true)
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || SUPABASE_KEY
        const res = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=id,nome,conta_meta_ads,status&conta_meta_ads=not.is.null&order=nome`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error("Erro ao carregar clientes")
        const data = await res.json()
        if (ativo && Array.isArray(data)) {
          setClientes(data)
          if (data.length > 0) setClienteSelecionado(data[0])
        }
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao carregar lista")
      } finally {
        if (ativo) setCarregandoClientes(false)
      }
    }
    carregarClientes()
    return () => { ativo = false }
  }, [])

  // FASE 1: COLETAR
  async function handleColetarDados() {
    if (!clienteSelecionado) return
    setColetandoDados(true)
    setErro(null)
    setDadosBase(null)
    setAnaliseProfunda(null)
    setDebugMcp("")
    setProgresso("Buscando insights no Meta Ads...")

    try {
      const accountId = clienteSelecionado.conta_meta_ads ?? ''
      const accountIdFormatado = accountId.startsWith('act_') ? accountId : `act_${accountId}`
      const insightsResult = await mcpTool<{ data: MetaInsight[]; total?: number }>('get_insights', {
        account_id: accountIdFormatado,
        level: 'campaign',
        date_preset: periodo,
      })

      // Extrair array de campanhas do resultado — suporte aos dois formatos (paginado e completo)
      const rawData: MetaInsight[] = (insightsResult as unknown as { data: { data: MetaInsight[] } })?.data?.data
        ?? (insightsResult.data as unknown as MetaInsight[])
        ?? []

      setDebugMcp(`Total campanhas recebidas: ${rawData.length}\n` + JSON.stringify(rawData.slice(0, 3), null, 2).slice(0, 1500))

      // --- Extrair campanhas DIRETAMENTE do dado bruto (sem Claude) ---
      const getAction = (actions: MetaInsight['actions'], type: string | string[]) => {
        const types = Array.isArray(type) ? type : [type]
        return actions?.find(a => types.some(t => a.action_type === t || a.action_type.includes(t)))?.value ?? '0'
      }
      const fmtBRL = (v: string | number) =>
        `R$ ${parseFloat(String(v) || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const fmtNum = (v: string | number) =>
        parseInt(String(v) || '0').toLocaleString('pt-BR')

      let campanhasExtraidas = rawData.map(c => ({
        nome: c.campaign_name ?? '',
        spend: fmtBRL(c.spend ?? '0'),
        impressoes: fmtNum(c.impressions ?? '0'),
        ctr: `${parseFloat(c.ctr ?? '0').toFixed(2)}%`,
        roas: c.website_purchase_roas?.[0]?.value
          ? parseFloat(c.website_purchase_roas[0].value).toFixed(2)
          : '0,00',
        compras: getAction(c.actions, ['purchase', 'offsite_conversion.fb_pixel_purchase']),
        status: c.effective_status ?? c.status ?? 'ACTIVE',
      }))

      // Filtro por palavra-chave (frontend)
      if (palavraChave.trim()) {
        campanhasExtraidas = campanhasExtraidas.filter(c =>
          c.nome.toLowerCase().includes(palavraChave.trim().toLowerCase())
        )
      }

      setProgresso("Calculando KPIs agregados...")

      // --- Usar Claude APENAS para KPIs agregados ---
      const dadosBrutos = JSON.stringify(rawData).slice(0, 80000)
      const resProxy = await mcpClaudeProxy({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `Você é um analista de Meta Ads. Recebe um array JSON de insights de campanhas e retorna APENAS os KPIs totais agregados.

Calcule somando/ponderando todos os itens do array:
- investimento: soma de "spend"
- alcance: soma de "reach"
- impressoes: soma de "impressions"
- cpm: (soma spend / soma impressions) * 1000
- ctr: (soma clicks / soma impressions) * 100
- visualizacoes_pagina: soma de actions onde action_type = "landing_page_view"
- ver_conteudo: soma de actions onde action_type contém "view_content"
- carrinhos: soma de actions onde action_type contém "add_to_cart"
- finalizacoes_compra: soma de actions onde action_type contém "initiate_checkout"
- compras: soma de actions onde action_type = "purchase" ou contém "fb_pixel_purchase"
- roas: soma(spend*roas) / soma(spend) usando website_purchase_roas[0].value
- mensagens_iniciadas: soma de actions onde action_type contém "messaging_conversation_started"

Retorne APENAS JSON válido sem markdown:
{"kpis":{"investimento":"R$ X.XXX,XX","alcance":"XXX.XXX","impressoes":"X.XXX.XXX","cpm":"R$ XX,XX","ctr":"X,XX%","visualizacoes_pagina":"XXX","ver_conteudo":"XXX","carrinhos":"XXX","finalizacoes_compra":"XXX","compras":"XXX","roas":"X,XX","mensagens_iniciadas":"XXX"}}`,
        messages: [{
          role: 'user',
          content: `Array de insights (${rawData.length} campanhas):\n${dadosBrutos}`
        }],
      })

      const kpisResult = JSON.parse(extractJSON(resProxy.content?.[0]?.text ?? '{}'))

      const dados: DadosColetados = {
        kpis: kpisResult.kpis ?? {},
        campanhas: campanhasExtraidas,
      }

      setDadosBase(dados)
      setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setColetandoDados(false)
      setProgresso("")
    }
  }

  // FASE 2: ANALISAR
  async function handleAnalisarIA() {
    if (!clienteSelecionado || !dadosBase) return
    setAnalisandoIA(true)
    setErro(null)
    setProgresso("Sonnet gerando análise estratégica e plano de ação...")

    try {
      const resProxy = await mcpClaudeProxy({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `Você é especialista em performance de tráfego pago. Analisa dados de Meta Ads e fornece insights estratégicos acionáveis.
Retorne APENAS JSON válido, sem markdown, sem explicações:
{
  "resumo_estrategico": "Resumo executivo em 3-5 linhas",
  "analise_funil": "Análise do funil de conversão identificando gargalos",
  "gargalos_identificados": ["gargalo 1", "gargalo 2"],
  "plano_de_acao": ["ação 1", "ação 2"],
  "insights_campanhas": [{ "nome_campanha": "Nome", "insight": "Insight" }]
}`,
        messages: [{
          role: 'user',
          content: `Cliente: ${clienteSelecionado.nome}\nPeríodo: ${PERIODOS.find(p => p.value === periodo)?.label ?? periodo}${comando.trim() ? `\nObservação: ${comando.trim()}` : ''}\n\nDados coletados:\n${JSON.stringify(dadosBase, null, 2)}`
        }],
      })

      const analise: AnaliseIA = JSON.parse(extractJSON(resProxy.content?.[0]?.text ?? '{}'))
      setAnaliseProfunda(analise)
      setTimeout(() => analiseRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setAnalisandoIA(false)
      setProgresso("")
    }
  }

  const KpiCard = ({ title, value, color = "#C9A84C" }: { title: string; value: string | undefined; color?: string }) => (
    <div style={{ background: "#0F0F0F", border: `1px solid ${color}33`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: "#666", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#FFF" }}>{value || "—"}</div>
    </div>
  )

  const periodoLabel = PERIODOS.find(p => p.value === periodo)?.label ?? periodo

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#E5E5E5", fontFamily: "'Nunito', sans-serif" }}>
      {/* HEADER */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1E1E1E", background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #C9A84C, #8B6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📊</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#C9A84C" }}>Painel de Performance</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#999" }}>Meta Ads · Filtros Inteligentes + Diagnóstico IA</p>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* CONTROLES */}
        <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 14, padding: 20, marginBottom: 24 }}>

          {/* 1. Conta */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>1. Conta</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {carregandoClientes ? (
                <span style={{ color: "#555", fontSize: 12 }}>Carregando...</span>
              ) : clientes.map((c) => (
                <button key={c.id} onClick={() => setClienteSelecionado(c)} style={{
                  padding: "8px 14px", borderRadius: 8, border: `1px solid ${clienteSelecionado?.id === c.id ? "#C9A84C" : "#1E1E1E"}`,
                  background: clienteSelecionado?.id === c.id ? "#C9A84C15" : "#141414",
                  color: clienteSelecionado?.id === c.id ? "#C9A84C" : "#888",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.status === "Ativo" ? "#22c55e" : "#eab308" }} />
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Período + 3. Palavra-chave */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>2. Período</label>
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={selectStyle}>
                {PERIODOS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>3. Palavra-chave da Campanha <span style={{ color: "#444", fontWeight: 400 }}>(opcional)</span></label>
              <input
                value={palavraChave}
                onChange={(e) => setPalavraChave(e.target.value)}
                placeholder='Ex: "BLACK", "REMARKETING", "CONSUMIDOR"'
                style={inputStyle}
              />
            </div>
          </div>

          {/* 4. Observação IA */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>4. Observação para a IA <span style={{ color: "#444", fontWeight: 400 }}>(opcional)</span></label>
            <textarea
              value={comando}
              onChange={(e) => setComando(e.target.value)}
              placeholder='Ex: "Foco no funil de compras" ou "Ignorar campanhas de branding"'
              rows={2}
              style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
            />
          </div>

          <div style={{ borderTop: "1px solid #1E1E1E", paddingTop: 16 }}>
            <button
              onClick={handleColetarDados}
              disabled={coletandoDados || !clienteSelecionado}
              style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: coletandoDados ? "#333" : "#22c55e", color: coletandoDados ? "#666" : "#000", fontSize: 14, fontWeight: 800, cursor: coletandoDados ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              {coletandoDados ? `⏳ ${progresso || "COLETANDO..."}` : "⚡ COLETAR DADOS"}
            </button>
          </div>
        </div>

        {erro && (
          <div style={{ background: "#1A0A0A", border: "1px solid #ef444444", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontWeight: 700 }}>❌ Erro</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef444499" }}>{erro}</p>
          </div>
        )}

        {/* RESULTADOS */}
        {dadosBase && (
          <div ref={resultadoRef} style={{ animation: "fadeIn 0.5s ease-in-out" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFF" }}>
                Performance · {clienteSelecionado?.nome}
                <span style={{ fontSize: 12, color: "#C9A84C", fontWeight: 400, marginLeft: 10 }}>{periodoLabel}{palavraChave ? ` · "${palavraChave}"` : ''}</span>
              </h2>
            </div>

            {/* KPI GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
              <KpiCard title="Alcance"              value={dadosBase.kpis.alcance}              color="#6366f1" />
              <KpiCard title="Impressões"           value={dadosBase.kpis.impressoes}           color="#6366f1" />
              <KpiCard title="Valor Investido"      value={dadosBase.kpis.investimento}         color="#22c55e" />
              <KpiCard title="CPM"                  value={dadosBase.kpis.cpm}                  color="#22c55e" />
              <KpiCard title="CTR (Link)"           value={dadosBase.kpis.ctr}                  color="#3b82f6" />
              <KpiCard title="Viz. Página Destino"  value={dadosBase.kpis.visualizacoes_pagina} color="#3b82f6" />
              <KpiCard title="Ver Conteúdo"         value={dadosBase.kpis.ver_conteudo}         color="#f59e0b" />
              <KpiCard title="Adições ao Carrinho"  value={dadosBase.kpis.carrinhos}            color="#f59e0b" />
              <KpiCard title="Fin. de Compra"       value={dadosBase.kpis.finalizacoes_compra}  color="#ef4444" />
              <KpiCard title="Compras"              value={dadosBase.kpis.compras}              color="#ef4444" />
              <KpiCard title="ROAS"                 value={dadosBase.kpis.roas}                 color="#C9A84C" />
              <KpiCard title="Mensagens Iniciadas"  value={dadosBase.kpis.mensagens_iniciadas}  color="#C9A84C" />
            </div>

            {/* TABELA DE CAMPANHAS */}
            {dadosBase.campanhas?.length > 0 && (
              <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #1E1E1E" }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>
                    Campanhas {palavraChave ? `· "${palavraChave}"` : ''} ({dadosBase.campanhas.length})
                  </h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#141414" }}>
                        {["#", "Campanha", "Status", "Investimento", "Impressões", "CTR", "ROAS", "Compras"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555", fontWeight: 700, textTransform: "uppercase", fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dadosBase.campanhas.map((c, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #141414" }}>
                          <td style={{ padding: "10px 14px", color: "#444" }}>{i + 1}</td>
                          <td style={{ padding: "10px 14px", color: "#DDD", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: c.status === "ACTIVE" ? "#22c55e22" : "#1A1A1A", color: c.status === "ACTIVE" ? "#22c55e" : "#555" }}>
                              {c.status === "ACTIVE" ? "ATIVA" : c.status === "PAUSED" ? "PAUSADA" : c.status}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "#22c55e", fontWeight: 700 }}>{c.spend}</td>
                          <td style={{ padding: "10px 14px", color: "#888" }}>{c.impressoes}</td>
                          <td style={{ padding: "10px 14px", color: "#888" }}>{c.ctr}</td>
                          <td style={{ padding: "10px 14px", color: "#C9A84C", fontWeight: 700 }}>{c.roas}</td>
                          <td style={{ padding: "10px 14px", color: "#888" }}>{c.compras}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BOTÃO ANÁLISE IA */}
            <div style={{ background: "linear-gradient(135deg, #1A1500 0%, #0F0F0F 100%)", border: "1px solid #C9A84C44", borderRadius: 14, padding: 28, textAlign: "center", marginBottom: 32 }}>
              <h3 style={{ margin: "0 0 8px", color: "#C9A84C", fontSize: 16 }}>Quer um diagnóstico estratégico?</h3>
              <p style={{ margin: "0 0 16px", color: "#666", fontSize: 12 }}>O Sonnet vai analisar os dados acima e gerar um plano de ação</p>
              <button onClick={handleAnalisarIA} disabled={analisandoIA} style={{
                padding: "14px 36px", borderRadius: 12, border: "none",
                background: analisandoIA ? "#333" : "linear-gradient(135deg, #C9A84C, #A88B3A)",
                color: analisandoIA ? "#666" : "#000", fontSize: 14, fontWeight: 900, cursor: analisandoIA ? "not-allowed" : "pointer"
              }}>
                {analisandoIA ? `🧠 ${progresso || "ANALISANDO..."}` : "✨ GERAR DIAGNÓSTICO IA"}
              </button>
            </div>
          </div>
        )}

        {/* DEBUG */}
        {debugMcp && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ cursor: "pointer", color: "#333", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>🛠 Debug MCP</summary>
            <textarea readOnly value={debugMcp} style={{ width: "100%", height: 200, background: "#000", color: "#00FF00", fontFamily: "monospace", fontSize: 11, border: "1px solid #1A1A1A", padding: 10, borderRadius: 8, marginTop: 8 }} />
          </details>
        )}

        {/* DIAGNÓSTICO IA */}
        {analiseProfunda && (
          <div ref={analiseRef} style={{ animation: "fadeIn 0.8s ease-in-out", marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#FFF", borderBottom: "2px solid #1E1E1E", paddingBottom: 14, marginBottom: 20 }}>🧠 Diagnóstico IA</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
              <div style={{ background: "#0F0F0F", border: "1px solid #C9A84C33", borderRadius: 14, padding: 20 }}>
                <h3 style={{ color: "#C9A84C", fontSize: 12, textTransform: "uppercase", margin: "0 0 10px" }}>Visão Estratégica</h3>
                <p style={{ color: "#DDD", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{analiseProfunda.resumo_estrategico}</p>
              </div>
              <div style={{ background: "#0F1A12", border: "1px solid #22c55e33", borderRadius: 14, padding: 20 }}>
                <h3 style={{ color: "#22c55e", fontSize: 12, textTransform: "uppercase", margin: "0 0 10px" }}>✅ Plano de Ação</h3>
                <ul style={{ color: "#86EFAC", fontSize: 13, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
                  {analiseProfunda.plano_de_acao?.map((acao, i) => <li key={i}>{acao}</li>)}
                </ul>
              </div>
              {analiseProfunda.gargalos_identificados?.length > 0 && (
                <div style={{ background: "#1A0A0A", border: "1px solid #ef444433", borderRadius: 14, padding: 20 }}>
                  <h3 style={{ color: "#ef4444", fontSize: 12, textTransform: "uppercase", margin: "0 0 10px" }}>⚠️ Gargalos</h3>
                  <ul style={{ color: "#FCA5A5", fontSize: 13, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
                    {analiseProfunda.gargalos_identificados.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              )}
              {analiseProfunda.insights_campanhas?.length > 0 && (
                <div style={{ background: "#0A0F1A", border: "1px solid #3b82f633", borderRadius: 14, padding: 20 }}>
                  <h3 style={{ color: "#3b82f6", fontSize: 12, textTransform: "uppercase", margin: "0 0 10px" }}>💡 Insights por Campanha</h3>
                  <ul style={{ color: "#93C5FD", fontSize: 13, paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
                    {analiseProfunda.insights_campanhas.map((ic, i) => <li key={i}><strong>{ic.nome_campanha}:</strong> {ic.insight}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .period-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "#888", display: "block", marginBottom: 8, fontWeight: 700, textTransform: "uppercase"
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #2A2A2A",
  background: "#141414", color: "#E5E5E5", fontSize: 13, outline: "none", cursor: "pointer"
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #2A2A2A",
  background: "#141414", color: "#E5E5E5", fontSize: 13, outline: "none"
}
