import { useState, useEffect, useRef } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const SUPABASE_URL = "https://mtckfghzgynimptclvtd.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Y2tmZ2h6Z3luaW1wdGNsdnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjUyMzcsImV4cCI6MjA4ODM0MTIzN30.KmAd7UBD_3GTShGMK4ZQo5EszQSg1FETOfpBN65du18"

const SUGESTOES = [
  "Overview geral da conta dos últimos 7 dias",
  "Relatório das campanhas ativas dos últimos 30 dias",
  "Análise de ROAS por campanha da última semana",
  "Comparar performance desta semana com a semana passada",
  "Quais campanhas devo pausar ou escalar?",
  "Relatório das campanhas de semana do consumidor",
  "Análise de custo por conversão dos últimos 14 dias",
]

const STATUS_CORES: Record<string, string> = {
  bom: "#22c55e",
  neutro: "#eab308",
  ruim: "#ef4444",
  excelente: "#C9A84C",
  medio: "#f97316",
}

const AVALIACAO_BADGE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  excelente: { bg: "#C9A84C22", color: "#C9A84C", label: "Excelente" },
  bom: { bg: "#22c55e22", color: "#22c55e", label: "Bom" },
  medio: { bg: "#f9731622", color: "#f97316", label: "Médio" },
  ruim: { bg: "#ef444422", color: "#ef4444", label: "Ruim" },
}

type Cliente = {
  id: string | number
  nome: string
  conta_meta_ads: string | null
  status: string | null
}

type HistoricoItem = {
  comando: string
  cliente: string
  timestamp: Date
}

type Campanha = {
  nome?: string
  spend?: string
  roas?: string
  ctr?: string
  cpc?: string
  compras?: number | string | null
  status?: string
  avaliacao?: string
}

type MetricaPrincipal = {
  label: string
  valor: string
  variacao?: string
  status?: string
}

type Relatorio = {
  titulo?: string
  periodo?: string
  resumo_executivo?: string
  metricas_principais?: MetricaPrincipal[]
  campanhas?: Campanha[]
  analise_detalhada?: string
  recomendacoes?: string[]
}

type RelatorioResponse = {
  success?: boolean
  error?: string
  details?: string
  relatorio?: Relatorio
}

export default function RelatoriosIA() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(
    null,
  )
  const [comando, setComando] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState("")
  const [historico, setHistorico] = useState<HistoricoItem[]>([])

  const resultadoRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregarClientes() {
      try {
        setCarregandoClientes(true)
        setErro(null)

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/clientes?select=id,nome,conta_meta_ads,status&conta_meta_ads=not.is.null&order=nome`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          },
        )

        if (!res.ok) {
          const textoErro = await res.text()
          throw new Error(
            `Erro HTTP ${res.status}${textoErro ? `: ${textoErro}` : ""}`,
          )
        }

        const data: unknown = await res.json()

        if (!ativo) return

        if (Array.isArray(data)) {
          const clientesValidos = data.filter(
            (item): item is Cliente =>
              !!item &&
              typeof item === "object" &&
              "id" in item &&
              "nome" in item,
          )

          setClientes(clientesValidos)

          setClienteSelecionado((prev) => {
            if (
              prev &&
              clientesValidos.some((cliente) => cliente.id === prev.id)
            ) {
              return prev
            }
            return clientesValidos.length > 0 ? clientesValidos[0] : null
          })
        } else {
          console.error("Resposta inesperada ao carregar clientes:", data)
          setClientes([])
          setClienteSelecionado(null)
          setErro("Resposta inesperada ao carregar clientes")
        }
      } catch (err) {
        if (!ativo) return
        console.error("Erro ao carregar clientes:", err)
        setClientes([])
        setClienteSelecionado(null)
        setErro(
          err instanceof Error ? err.message : "Erro ao carregar clientes",
        )
      } finally {
        if (ativo) {
          setCarregandoClientes(false)
        }
      }
    }

    carregarClientes()

    return () => {
      ativo = false
    }
  }, [])

  async function gerarRelatorio() {
    if (!clienteSelecionado || !comando.trim()) return

    setCarregando(true)
    setErro(null)
    setRelatorio(null)
    setProgresso("Conectando ao Meta Ads via MCP...")

    const timers = [
      window.setTimeout(
        () => setProgresso("Haiku está buscando dados das campanhas..."),
        3000,
      ),
      window.setTimeout(
        () => setProgresso("Dados coletados. Sonnet está analisando..."),
        10000,
      ),
      window.setTimeout(
        () => setProgresso("Gerando insights e recomendações..."),
        18000,
      ),
      window.setTimeout(
        () => setProgresso("Quase pronto, finalizando o relatório..."),
        25000,
      ),
    ]

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/relatorios-ia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          account_id: clienteSelecionado.conta_meta_ads,
          cliente_nome: clienteSelecionado.nome,
          comando: comando.trim(),
        }),
      })

      const data: RelatorioResponse = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || "Erro ao gerar relatório")
      }

      setRelatorio(data.relatorio || null)
      setHistorico((prev) => [
        {
          comando: comando.trim(),
          cliente: clienteSelecionado.nome,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ])

      window.setTimeout(() => {
        resultadoRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 200)
    } catch (err) {
      console.error("Erro ao gerar relatório:", err)
      setErro(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      timers.forEach((timer) => clearTimeout(timer))
      setCarregando(false)
      setProgresso("")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) gerarRelatorio()
  }

  function usarSugestao(sug: string) {
    setComando(sug)
    inputRef.current?.focus()
  }

  const dadosGraficoCampanhas =
    relatorio?.campanhas?.map((c) => ({
      nome:
        c.nome?.length && c.nome.length > 25
          ? `${c.nome.substring(0, 25)}...`
          : (c.nome ?? "Sem nome"),
      spend:
        parseFloat(c.spend?.replace(/[R$\s.]/g, "").replace(",", ".") || "0") ||
        0,
      roas: parseFloat(c.roas?.replace("x", "").replace(",", ".") || "0") || 0,
    })) || []

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: "#E5E5E5",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #1E1E1E",
          background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #C9A84C, #8B6914)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          📊
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#C9A84C",
            }}
          >
            Relatórios IA
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
            Haiku coleta · Sonnet analisa · Meta Ads + Claude AI
          </p>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            background: "#0F0F0F",
            border: "1px solid #1E1E1E",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 12,
                color: "#FFFFFF",
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              CLIENTE
            </label>

            {carregandoClientes ? (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#141414",
                  border: "1px solid #1E1E1E",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#888",
                }}
              >
                Carregando clientes...
              </div>
            ) : clientes.length === 0 ? (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#141414",
                  border: "1px solid #1E1E1E",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#888",
                }}
              >
                Nenhum cliente com conta Meta Ads foi encontrado.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {clientes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClienteSelecionado(c)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: `1px solid ${
                        clienteSelecionado?.id === c.id ? "#C9A84C" : "#1E1E1E"
                      }`,
                      background:
                        clienteSelecionado?.id === c.id
                          ? "#C9A84C15"
                          : "#141414",
                      color:
                        clienteSelecionado?.id === c.id ? "#C9A84C" : "#888",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'Nunito', sans-serif",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: c.status === "Ativo" ? "#22c55e" : "#eab308",
                        flexShrink: 0,
                      }}
                    />
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                color: "#FFFFFF",
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              O QUE VOCÊ QUER SABER?
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={comando}
                onChange={(e) => setComando(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Ex: "Relatório das campanhas de semana do consumidor dos últimos 7 dias"'
                rows={3}
                disabled={carregando}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #2A2A2A",
                  background: "#141414",
                  color: "#E5E5E5",
                  fontSize: 13,
                  resize: "none",
                  fontFamily: "'Nunito', sans-serif",
                  lineHeight: 1.5,
                  outline: "none",
                }}
              />
              <button
                onClick={gerarRelatorio}
                disabled={carregando || !comando.trim() || !clienteSelecionado}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  border: "none",
                  background:
                    comando.trim() && !carregando && clienteSelecionado
                      ? "linear-gradient(135deg, #C9A84C, #A88B3A)"
                      : "#1E1E1E",
                  color:
                    comando.trim() && !carregando && clienteSelecionado
                      ? "#0A0A0A"
                      : "#444",
                  fontSize: 20,
                  cursor:
                    comando.trim() && !carregando && clienteSelecionado
                      ? "pointer"
                      : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                {carregando ? "⏳" : "🚀"}
              </button>
            </div>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "#AAA",
              }}
            >
              Ctrl+Enter para gerar · Descreva livremente o que precisa
            </p>
          </div>

          <div>
            <label
              style={{
                fontSize: 10,
                color: "#AAA",
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              SUGESTÕES RÁPIDAS
            </label>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              {SUGESTOES.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => usarSugestao(sug)}
                  disabled={carregando}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 16,
                    border: "1px solid #1E1E1E",
                    background: "transparent",
                    color: "#BBB",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "'Nunito', sans-serif",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C9A84C44"
                    e.currentTarget.style.color = "#C9A84C"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#1E1E1E"
                    e.currentTarget.style.color = "#555"
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>

        {carregando && (
          <div
            style={{
              background: "#0F0F0F",
              border: "1px solid #C9A84C33",
              borderRadius: 14,
              padding: 32,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "3px solid #1E1E1E",
                borderTopColor: "#C9A84C",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: "#C9A84C",
                fontWeight: 600,
              }}
            >
              {progresso}
            </p>
          </div>
        )}

        {erro && (
          <div
            style={{
              background: "#1A0A0A",
              border: "1px solid #ef444444",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontWeight: 700 }}>
              ❌ Erro
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef444499" }}>
              {erro}
            </p>
          </div>
        )}

        {relatorio && (
          <div ref={resultadoRef}>
            <div
              style={{
                background: "linear-gradient(135deg, #141414 0%, #0F0F0F 100%)",
                border: "1px solid #C9A84C44",
                borderRadius: 14,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#C9A84C" }}>
                {relatorio.titulo || "Relatório de Performance"}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>
                📁 {clienteSelecionado?.nome}
                {relatorio.periodo && ` · 📅 ${relatorio.periodo}`}
              </p>
            </div>

            {dadosGraficoCampanhas.length > 1 && (
              <div
                style={{
                  background: "#0F0F0F",
                  border: "1px solid #1E1E1E",
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                  INVESTIMENTO POR CAMPANHA
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosGraficoCampanhas}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                    <XAxis dataKey="nome" tick={{ fill: "#555", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#555", fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="spend" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {!carregando && !relatorio && !erro && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 40,
              gap: 16,
            }}
          >
            <div style={{ fontSize: 48, opacity: 0.3 }}>🤖</div>
            <p
              style={{
                color: "#333",
                textAlign: "center",
                maxWidth: 420,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Selecione um cliente e descreva o que precisa.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #444; }
      `}</style>
    </div>
  )
}
