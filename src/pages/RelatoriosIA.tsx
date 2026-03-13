import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://mtckfghzgynimptclvtd.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Y2tmZ2h6Z3luaW1wdGNsdnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjUyMzcsImV4cCI6MjA4ODM0MTIzN30.KmAd7UBD_3GTShGMK4ZQo5EszQSg1FETOfpBN65du18"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SUGESTOES = [
  "Quais campanhas estão puxando o ROAS para baixo?",
  "Onde está o gargalo do funil: clique, página ou carrinho?",
  "Como otimizar o orçamento para o fim de semana?",
  "Análise de custo por aquisição (CPA) atual",
]

type Cliente = {
  id: string | number
  nome: string
  conta_meta_ads: string | null
  status: string | null
}

// Tipagem da Fase 1 (Haiku)
type DadosColetados = {
  kpis: {
    investimento: string
    alcance: string
    impressoes: string
    ctr: string
    cpc: string
    cpm: string
    visualizacoes_pagina: string
    carrinhos: string
    compras: string
    roas: string
    mensagens_iniciadas: string
  }
  campanhas: Array<{
    nome: string
    spend: string
    roas: string
    compras: string
    status: string
  }>
}

// Tipagem da Fase 2 (Sonnet 4.5)
type AnaliseIA = {
  resumo_estrategico: string
  analise_funil: string
  gargalos_identificados: string[]
  plano_de_acao: string[]
  insights_campanhas: Array<{
    nome_campanha: string
    insight: string
  }>
}

export default function RelatoriosIA() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [comando, setComando] = useState("")
  
  // Estados de Carregamento Separados
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [coletandoDados, setColetandoDados] = useState(false)
  const [analisandoIA, setAnalisandoIA] = useState(false)
  
  // Dados Retornados
  const [dadosBase, setDadosBase] = useState<DadosColetados | null>(null)
  const [analiseProfunda, setAnaliseProfunda] = useState<AnaliseIA | null>(null)
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

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/clientes?select=id,nome,conta_meta_ads,status&conta_meta_ads=not.is.null&order=nome`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } },
        )

        if (!res.ok) throw new Error("Erro ao carregar clientes")
        const data: any = await res.json()

        if (!ativo) return
        if (Array.isArray(data)) {
          setClientes(data)
          if (data.length > 0) setClienteSelecionado(data[0])
        }
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro desconhecido")
      } finally {
        if (ativo) setCarregandoClientes(false)
      }
    }
    carregarClientes()
    return () => { ativo = false }
  }, [])

  // FASE 1: APENAS COLETAR DADOS (Rápido)
  async function handleColetarDados() {
    if (!clienteSelecionado) return

    setColetandoDados(true)
    setErro(null)
    setDadosBase(null)
    setAnaliseProfunda(null)
    setProgresso("Acessando Meta Ads e formatando KPIs...")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || SUPABASE_KEY

      const res = await fetch(`${SUPABASE_URL}/functions/v1/relatorios-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          account_id: clienteSelecionado.conta_meta_ads,
          cliente_nome: clienteSelecionado.nome,
          acao: "coletar" // Rota 1
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Erro ao coletar dados")

      setDadosBase(data.dados)
      setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setColetandoDados(false)
      setProgresso("")
    }
  }

  // FASE 2: ANÁLISE PROFUNDA COM IA (Sonnet)
  async function handleAnalisarIA() {
    if (!clienteSelecionado || !dadosBase) return

    setAnalisandoIA(true)
    setErro(null)
    setProgresso("Sonnet 4.5 analisando gargalos do funil...")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || SUPABASE_KEY

      const res = await fetch(`${SUPABASE_URL}/functions/v1/relatorios-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          account_id: clienteSelecionado.conta_meta_ads,
          cliente_nome: clienteSelecionado.nome,
          comando: comando.trim() || "Analisar funil geral",
          acao: "analisar", // Rota 2
          dados_coletados: dadosBase
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Erro na análise da IA")

      setAnaliseProfunda(data.analise)
      setTimeout(() => analiseRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setAnalisandoIA(false)
      setProgresso("")
    }
  }

  // Componente de Card de KPI reaproveitável
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
          <p style={{ margin: 0, fontSize: 12, color: "#999" }}>Extração Rápida + Consultoria IA</p>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* CONTROLES PRINCIPAIS */}
        <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 14, padding: 20, marginBottom: 24 }}>
          
          {/* 1. Seleção de Cliente */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#FFFFFF", display: "block", marginBottom: 8, fontWeight: 600 }}>1. SELECIONE A CONTA</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {clientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setClienteSelecionado(c)}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: `1px solid ${clienteSelecionado?.id === c.id ? "#C9A84C" : "#1E1E1E"}`,
                    background: clienteSelecionado?.id === c.id ? "#C9A84C15" : "#141414", color: clienteSelecionado?.id === c.id ? "#C9A84C" : "#888",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.status === "Ativo" ? "#22c55e" : "#eab308", flexShrink: 0 }} />
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Campo de Texto (O Comando) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#FFFFFF", display: "block", marginBottom: 6, fontWeight: 600 }}>2. O QUE VOCÊ QUER VER?</label>
            <textarea
                ref={inputRef}
                value={comando}
                onChange={(e) => setComando(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Ex: "Dados das campanhas ativas de Dia do Consumidor dos últimos 7 dias"'
                rows={2}
                disabled={coletandoDados || analisandoIA}
                style={{
                  width: "100%", padding: "14px", borderRadius: 10, border: "1px solid #2A2A2A", background: "#141414",
                  color: "#E5E5E5", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5, marginBottom: 12
                }}
              />
              
              {/* Sugestões Rápidas */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SUGESTOES.map((sug, i) => (
                  <button
                    key={i} onClick={() => usarSugestao(sug)} disabled={coletandoDados || analisandoIA}
                    style={{
                      padding: "5px 10px", borderRadius: 16, border: "1px solid #1E1E1E", background: "transparent",
                      color: "#BBB", fontSize: 11, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
          </div>

          {/* 3. Botão de Coleta */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #1E1E1E", paddingTop: 20 }}>
            <button
              onClick={handleColetarDados}
              disabled={coletandoDados || analisandoIA || !clienteSelecionado || !comando.trim()}
              style={{
                padding: "12px 24px", borderRadius: 10, border: "none", background: "#22c55e", color: "#000",
                fontSize: 14, fontWeight: 800, cursor: (coletandoDados || !comando.trim()) ? "not-allowed" : "pointer", 
                display: "flex", alignItems: "center", gap: 8, transition: "0.2s", opacity: !comando.trim() ? 0.5 : 1
              }}
            >
              {coletandoDados ? "⏳ EXTRAINDO..." : "⚡ COLETAR DADOS"}
            </button>
            <span style={{ fontSize: 12, color: "#666" }}>O Haiku vai filtrar os dados com base no seu pedido acima.</span>
          </div>
        </div>

        {/* MENSAGEM DE ERRO */}
        {erro && (
          <div style={{ background: "#1A0A0A", border: "1px solid #ef444444", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontWeight: 700 }}>❌ Erro</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef444499" }}>{erro}</p>
          </div>
        )}

        {/* FASE 1: PAINEL DE KPIS (Raio-X) */}
        {dadosBase && (
          <div ref={resultadoRef} style={{ animation: "fadeIn 0.5s ease-in-out", marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFF" }}>Visão Geral (Raio-X)</h2>
              <span style={{ fontSize: 12, color: "#888", background: "#1E1E1E", padding: "4px 10px", borderRadius: 12 }}>Dados Brutos</span>
            </div>

            {/* GRID DOS 11 KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              <KpiCard title="Investimento" value={dadosBase.kpis.investimento} icon="💰" />
              <KpiCard title="ROAS" value={dadosBase.kpis.roas} icon="🚀" />
              <KpiCard title="Compras" value={dadosBase.kpis.compras} icon="🛍️" />
              <KpiCard title="Carrinhos" value={dadosBase.kpis.carrinhos} icon="🛒" />
              <KpiCard title="Visitas (LPV)" value={dadosBase.kpis.visualizacoes_pagina} icon="👁️" />
              <KpiCard title="Cliques" value={dadosBase.kpis.alcance} icon="🖱️" /> {/* Usando alcance provisoriamente se não tiver cliques diretos */}
              <KpiCard title="CTR" value={dadosBase.kpis.ctr} icon="🎯" />
              <KpiCard title="CPC" value={dadosBase.kpis.cpc} icon="👆" />
              <KpiCard title="CPM" value={dadosBase.kpis.cpm} icon="📢" />
              <KpiCard title="Impressões" value={dadosBase.kpis.impressoes} icon="📱" />
              <KpiCard title="Mensagens" value={dadosBase.kpis.mensagens_iniciadas} icon="💬" />
            </div>

            {/* BOTÃO MÁGICO PARA FASE 2 */}
            <div style={{ background: "linear-gradient(135deg, #1A1500 0%, #0F0F0F 100%)", border: "1px solid #C9A84C66", borderRadius: 14, padding: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 8px", color: "#C9A84C", fontSize: 16 }}>Deseja uma análise profunda destes números?</h3>
                <p style={{ margin: 0, color: "#888", fontSize: 13, maxWidth: 500 }}>Acione o Gestor de Tráfego de IA. Ele cruzará o CPM com o CTR, analisará as quebras do funil e criará um plano de ação para a sua loja.</p>
              </div>
              
              <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", maxWidth: 600 }}>
                <input 
                  type="text" 
                  value={comando} 
                  onChange={e => setComando(e.target.value)}
                  placeholder="Ex: Foque na campanha de Dia do Consumidor"
                  style={{ flex: 1, padding: "14px", borderRadius: 8, background: "#0A0A0A", border: "1px solid #333", color: "#FFF", outline: "none" }}
                />
                <button
                  onClick={handleAnalisarIA}
                  disabled={analisandoIA}
                  style={{
                    padding: "14px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #C9A84C, #A88B3A)", color: "#000",
                    fontSize: 14, fontWeight: 800, cursor: analisandoIA ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "0.2s", whiteSpace: "nowrap"
                  }}
                >
                  {analisandoIA ? "🧠 PENSANDO..." : "✨ ANALISAR COM IA"}
                </button>
              </div>
              {analisandoIA && <p style={{ margin: 0, color: "#C9A84C", fontSize: 12, animation: "pulse 1.5s infinite" }}>{progresso}</p>}
            </div>
          </div>
        )}

        {/* FASE 2: RESULTADO DA ANÁLISE IA (Sonnet) */}
        {analiseProfunda && (
          <div ref={analiseRef} style={{ animation: "fadeIn 0.8s ease-in-out" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#FFF", borderBottom: "2px solid #1E1E1E", paddingBottom: 16, marginBottom: 24 }}>
              🧠 Diagnóstico do Gestor Sênior
            </h2>

            {/* Resumo e Funil */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 20, marginBottom: 20 }}>
              <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 14, padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 13, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 1 }}>Visão Estratégica</h3>
                <p style={{ margin: 0, color: "#DDD", fontSize: 14, lineHeight: 1.6 }}>{analiseProfunda.resumo_estrategico}</p>
              </div>
              <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 14, padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 13, color: "#60A5FA", textTransform: "uppercase", letterSpacing: 1 }}>Análise de Funil</h3>
                <p style={{ margin: 0, color: "#DDD", fontSize: 14, lineHeight: 1.6 }}>{analiseProfunda.analise_funil}</p>
              </div>
            </div>

            {/* Gargalos e Plano de Ação */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 20, marginBottom: 24 }}>
              <div style={{ background: "#1A0F0F", border: "1px solid #ef444444", borderRadius: 14, padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 13, color: "#ef4444", textTransform: "uppercase", letterSpacing: 1, display: "flex", gap: 8 }}>
                  <span>⚠️</span> Gargalos Identificados
                </h3>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#FCA5A5", fontSize: 14, lineHeight: 1.6 }}>
                  {analiseProfunda.gargalos_identificados?.map((gargalo, i) => <li key={i} style={{ marginBottom: 8 }}>{gargalo}</li>)}
                </ul>
              </div>

              <div style={{ background: "#0F1A12", border: "1px solid #22c55e44", borderRadius: 14, padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 13, color: "#22c55e", textTransform: "uppercase", letterSpacing: 1, display: "flex", gap: 8 }}>
                  <span>✅</span> Plano de Ação (Próximos Passos)
                </h3>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#86EFAC", fontSize: 14, lineHeight: 1.6 }}>
                  {analiseProfunda.plano_de_acao?.map((acao, i) => <li key={i} style={{ marginBottom: 8 }}>{acao}</li>)}
                </ul>
              </div>
            </div>

            {/* Insights por Campanha Específica */}
            {analiseProfunda.insights_campanhas && analiseProfunda.insights_campanhas.length > 0 && (
              <div style={{ background: "#0F0F0F", border: "1px solid #1E1E1E", borderRadius: 14, padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 13, color: "#A855F7", textTransform: "uppercase", letterSpacing: 1 }}>Micro-Gestão: Insights por Campanha</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {analiseProfunda.insights_campanhas.map((camp, idx) => (
                    <div key={idx} style={{ background: "#141414", padding: "16px", borderRadius: 8, borderLeft: "4px solid #A855F7" }}>
                      <strong style={{ color: "#FFF", display: "block", marginBottom: 6 }}>{camp.nome_campanha}</strong>
                      <span style={{ color: "#AAA", fontSize: 13, lineHeight: 1.5 }}>{camp.insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ESTADO INICIAL VAZIO */}
        {!coletandoDados && !dadosBase && !erro && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 40, gap: 16 }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>📦</div>
            <p style={{ color: "#555", textAlign: "center", maxWidth: 420, fontSize: 13, lineHeight: 1.6 }}>
              Selecione o cliente e clique em <b>Coletar Dados</b> para montar o seu Dashboard instantâneo.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #1E1E1E; border-radius: 4px; }
      `}</style>
    </div>
  )
}
