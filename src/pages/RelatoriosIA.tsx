import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { mcpTool, mcpClaudeProxy } from "../lib/mcpClient"

const SUPABASE_URL = "https://mtckfghzgynimptclvtd.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Y2tmZ2h6Z3luaW1wdGNsdnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjUyMzcsImV4cCI6MjA4ODM0MTIzN30.KmAd7UBD_3GTShGMK4ZQo5EszQSg1FETOfpBN65du18"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SUGESTOES = [
  "Filtrar campanhas de Dia do Consumidor",
  "Apenas campanhas ativas com gasto > 0",
  "Análise de funil: clique, página e carrinho",
  "Como otimizar o orçamento para o fim de semana?",
]

type Cliente = {
  id: string | number
  nome: string
  conta_meta_ads: string | null
  status: string | null
}

type DadosColetados = {
  kpis: {
    investimento: string; alcance: string; impressoes: string; ctr: string; cpc: string;
    cpm: string; visualizacoes_pagina: string; carrinhos: string; compras: string;
    roas: string; mensagens_iniciadas: string;
  }
  campanhas: Array<{ nome: string; spend: string; roas: string; compras: string; status: string; }>
}

type AnaliseIA = {
  resumo_estrategico: string; analise_funil: string; gargalos_identificados: string[];
  plano_de_acao: string[]; insights_campanhas: Array<{ nome_campanha: string; insight: string; }>
}

export default function RelatoriosIA() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [comando, setComando] = useState("")
  
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [coletandoDados, setColetandoDados] = useState(false)
  const [analisandoIA, setAnalisandoIA] = useState(false)
  
  const [dadosBase, setDadosBase] = useState<DadosColetados | null>(null)
  const [analiseProfunda, setAnaliseProfunda] = useState<AnaliseIA | null>(null)
  const [debugMcp, setDebugMcp] = useState<string>("") // <--- NOVO: Estado para Debug
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState("")

  const resultadoRef = useRef<HTMLDivElement | null>(null)
  const analiseRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

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

  function usarSugestao(sug: string) {
    setComando(sug)
    inputRef.current?.focus()
  }

  // FASE 1: COLETAR — busca dados no MCP e estrutura com Haiku
  async function handleColetarDados() {
    if (!clienteSelecionado || !comando.trim()) return
    setColetandoDados(true)
    setErro(null)
    setDadosBase(null)
    setAnaliseProfunda(null)
    setDebugMcp("")
    setProgresso("Buscando insights no Meta Ads...")

    try {
      // 1. Busca dados brutos diretamente no servidor MCP
      const insightsResult = await mcpTool<{ data: unknown[] }>('get_insights', {
        account_id: clienteSelecionado.conta_meta_ads,
        level: 'campaign',
        date_preset: 'last_30d',
      })
      const dadosBrutos = JSON.stringify(insightsResult.data ?? insightsResult, null, 2)
      setDebugMcp(dadosBrutos.slice(0, 2000))

      setProgresso("Haiku calculando KPIs e estruturando dados...")

      // 2. Haiku estrutura os dados brutos
      const resProxy = await mcpClaudeProxy({
        model: 'claude-haiku-4-5',
        max_tokens: 1500,
        system: `Você é um analista de Meta Ads. Recebe dados brutos de insights e retorna um JSON estruturado.
Retorne APENAS JSON válido no seguinte formato, sem markdown, sem explicações:
{
  "kpis": {
    "investimento": "R$ X.XXX,XX",
    "alcance": "XXX.XXX",
    "impressoes": "X.XXX.XXX",
    "ctr": "X,XX%",
    "cpc": "R$ X,XX",
    "cpm": "R$ XX,XX",
    "visualizacoes_pagina": "XXX",
    "carrinhos": "XXX",
    "compras": "XXX",
    "roas": "X,XX",
    "mensagens_iniciadas": "XXX"
  },
  "campanhas": [
    { "nome": "Nome da Campanha", "spend": "R$ X.XXX,XX", "roas": "X,XX", "compras": "XXX", "status": "ACTIVE" }
  ]
}`,
        messages: [{
          role: 'user',
          content: `Cliente: ${clienteSelecionado.nome}\nFiltro do usuário: ${comando.trim()}\n\nDados brutos:\n${dadosBrutos.slice(0, 8000)}`
        }],
      })

      const textoHaiku = resProxy.content?.[0]?.text ?? '{}'
      const dados: DadosColetados = JSON.parse(textoHaiku)
      setDadosBase(dados)
      setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setColetandoDados(false)
      setProgresso("")
    }
  }

  // FASE 2: ANALISAR — Sonnet gera análise estratégica
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
Retorne APENAS JSON válido no seguinte formato, sem markdown, sem explicações:
{
  "resumo_estrategico": "Resumo executivo em 3-5 linhas com os principais destaques",
  "analise_funil": "Análise do funil de conversão identificando gargalos",
  "gargalos_identificados": ["gargalo 1", "gargalo 2"],
  "plano_de_acao": ["ação 1 com prazo e responsável", "ação 2"],
  "insights_campanhas": [
    { "nome_campanha": "Nome", "insight": "Insight específico da campanha" }
  ]
}`,
        messages: [{
          role: 'user',
          content: `Cliente: ${clienteSelecionado.nome}\nComando: ${comando.trim()}\n\nDados coletados:\n${JSON.stringify(dadosBase, null, 2)}`
        }],
      })

      const textoSonnet = resProxy.content?.[0]?.text ?? '{}'
      const analise: AnaliseIA = JSON.parse(textoSonnet)
      setAnaliseProfunda(analise)
      setTimeout(() => analiseRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setAnalisandoIA(false)
      setProgresso("")
    }
  }

  const KpiCard = ({ title, value, icon }: { title: string, value: string | undefined, icon: string }) => (
    <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 12, padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
        <span>{icon}</span> {title}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#FFF" }}>{value || "0"}</div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#E5E5E5", fontFamily: "'Nunito', sans-serif" }}>
      {/* HEADER */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1E1E1E", background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #C9A84C, #8B6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📊</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#C9A84C" }}>Painel de Performance</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#999" }}>Filtros Inteligentes + Gestão IA</p>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* CONTROLES */}
        <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 8, fontWeight: 700, textTransform: "uppercase" }}>1. Selecione a Conta</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {clientes.map((c) => (
                <button key={c.id} onClick={() => setClienteSelecionado(c)} style={{
                    padding: "8px 14px", borderRadius: 8, border: `1px solid ${clienteSelecionado?.id === c.id ? "#C9A84C" : "#1E1E1E"}`,
                    background: clienteSelecionado?.id === c.id ? "#C9A84C15" : "#141414", color: clienteSelecionado?.id === c.id ? "#C9A84C" : "#888",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.status === "Ativo" ? "#22c55e" : "#eab308" }} />
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 8, fontWeight: 700, textTransform: "uppercase" }}>2. O que deseja analisar? (Filtro IA)</label>
            <textarea ref={inputRef} value={comando} onChange={(e) => setComando(e.target.value)} placeholder='Ex: "Campanhas com nome CONSUMIDOR nos últimos 7 dias"' rows={2} style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "1px solid #2A2A2A", background: "#141414", color: "#E5E5E5", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5, marginBottom: 12
            }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SUGESTOES.map((sug, i) => (
                <button key={i} onClick={() => usarSugestao(sug)} style={{ padding: "5px 12px", borderRadius: 16, border: "1px solid #1E1E1E", background: "transparent", color: "#666", fontSize: 11, cursor: "pointer" }}>{sug}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #1E1E1E", paddingTop: 20 }}>
            <button onClick={handleColetarDados} disabled={coletandoDados || !clienteSelecionado || !comando.trim()} style={{
                padding: "12px 28px", borderRadius: 10, border: "none", background: "#22c55e", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
            }}>
              {coletandoDados ? "⏳ FILTRANDO..." : "⚡ COLETAR DADOS"}
            </button>
          </div>
        </div>

        {erro && (
          <div style={{ background: "#1A0A0A", border: "1px solid #ef444444", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontWeight: 700 }}>❌ Erro</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef444499" }}>{erro}</p>
          </div>
        )}

        {/* RESULTADOS FASE 1 */}
        {dadosBase && (
          <div ref={resultadoRef} style={{ animation: "fadeIn 0.5s ease-in-out", marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFF" }}>Raio-X da Operação</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              <KpiCard title="Investimento" value={dadosBase.kpis.investimento} icon="💰" />
              <KpiCard title="ROAS" value={dadosBase.kpis.roas} icon="🚀" />
              <KpiCard title="Compras" value={dadosBase.kpis.compras} icon="🛍️" />
              <KpiCard title="Mensagens" value={dadosBase.kpis.mensagens_iniciadas} icon="💬" />
              <KpiCard title="CTR" value={dadosBase.kpis.ctr} icon="🎯" />
              <KpiCard title="CPC" value={dadosBase.kpis.cpc} icon="👆" />
            </div>

            <div style={{ background: "linear-gradient(135deg, #1A1500 0%, #0F0F0F 100%)", border: "1px solid #C9A84C66", borderRadius: 14, padding: 32, textAlign: "center" }}>
              <h3 style={{ margin: "0 0 8px", color: "#C9A84C", fontSize: 18 }}>Análise Estratégica?</h3>
              <button onClick={handleAnalisarIA} disabled={analisandoIA} style={{
                  padding: "16px 40px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #C9A84C, #A88B3A)", color: "#000", fontSize: 15, fontWeight: 900, cursor: "pointer"
              }}>
                {analisandoIA ? "🧠 PENSANDO..." : "✨ GERAR DIAGNÓSTICO IA"}
              </button>
            </div>
          </div>
        )}

        {/* PAINEL DE DEBUG (BRUTO) */}
        {debugMcp && (
          <div style={{ marginTop: 40, background: "#080808", border: "1px dashed #333", borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 12, color: "#555", textTransform: "uppercase" }}>🛠 Debug: Resposta Bruta do MCP</h3>
            <textarea readOnly value={debugMcp} style={{
                width: "100%", height: 250, background: "#000", color: "#00FF00", fontFamily: "monospace", fontSize: 11, border: "1px solid #1A1A1A", padding: 10, borderRadius: 8
            }} />
          </div>
        )}

        {/* RESULTADOS FASE 2 */}
        {analiseProfunda && (
          <div ref={analiseRef} style={{ animation: "fadeIn 0.8s ease-in-out", marginTop: 40 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#FFF", borderBottom: "2px solid #1E1E1E", paddingBottom: 16, marginBottom: 24 }}>🧠 Diagnóstico do Gestor Sênior</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 20 }}>
              <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 14, padding: 24 }}>
                <h3 style={{ color: "#C9A84C", fontSize: 13, textTransform: "uppercase" }}>Visão Estratégica</h3>
                <p style={{ color: "#DDD", fontSize: 14, lineHeight: 1.6 }}>{analiseProfunda.resumo_estrategico}</p>
              </div>
              <div style={{ background: "#0F1A12", border: "1px solid #22c55e44", borderRadius: 14, padding: 24 }}>
                <h3 style={{ color: "#22c55e", fontSize: 13, textTransform: "uppercase" }}>✅ Plano de Ação</h3>
                <ul style={{ color: "#86EFAC", fontSize: 14, paddingLeft: 20 }}>
                  {analiseProfunda.plano_de_acao?.map((acao, i) => <li key={i}>{acao}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } * { box-sizing: border-box; }`}</style>
    </div>
  )
}
