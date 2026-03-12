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

const STATUS_CORES = {
  bom: "#22c55e",
  neutro: "#eab308",
  ruim: "#ef4444",
  excelente: "#C9A84C",
  medio: "#f97316",
}

const AVALIACAO_BADGE = {
  excelente: { bg: "#C9A84C22", color: "#C9A84C", label: "Excelente" },
  bom: { bg: "#22c55e22", color: "#22c55e", label: "Bom" },
  medio: { bg: "#f9731622", color: "#f97316", label: "Médio" },
  ruim: { bg: "#ef444422", color: "#ef4444", label: "Ruim" },
}

export default function RelatoriosIA() {
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [comando, setComando] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [relatorio, setRelatorio] = useState(null)
  const [erro, setErro] = useState(null)
  const [progresso, setProgresso] = useState("")
  const [historico, setHistorico] = useState([])
  const resultadoRef = useRef(null)
  const inputRef = useRef(null)

  // Buscar clientes do Supabase que tenham conta Meta
  useEffect(() => {
    async function carregarClientes() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/clientes?select=id,nome,conta_meta_ads,status&conta_meta_ads=not.is.null&order=nome`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          },
        )
        const data = await res.json()
        setClientes(data || [])
        if (data?.length > 0) setClienteSelecionado(data[0])
      } catch {
        setErro("Erro ao carregar clientes")
      } finally {
        setCarregandoClientes(false)
      }
    }
    carregarClientes()
  }, [])

  async function gerarRelatorio() {
    if (!clienteSelecionado || !comando.trim()) return
    setCarregando(true)
    setErro(null)
    setRelatorio(null)
    setProgresso("Conectando ao Meta Ads via MCP...")

    const timers = [
      setTimeout(
        () => setProgresso("Haiku está buscando dados das campanhas..."),
        3000,
      ),
      setTimeout(
        () => setProgresso("Dados coletados. Sonnet está analisando..."),
        10000,
      ),
      setTimeout(
        () => setProgresso("Gerando insights e recomendações..."),
        18000,
      ),
      setTimeout(
        () => setProgresso("Quase pronto, finalizando o relatório..."),
        25000,
      ),
    ]

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/relatorios-ia`,
        {
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
        },
      )

      timers.forEach(clearTimeout)

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || "Erro ao gerar relatório")
      }

      setRelatorio(data.relatorio)
      setHistorico((prev) => [
        {
          comando: comando.trim(),
          cliente: clienteSelecionado.nome,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ])

      setTimeout(() => {
        resultadoRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 200)
    } catch (err) {
      setErro(err.message || "Erro desconhecido")
    } finally {
      timers.forEach(clearTimeout)
      setCarregando(false)
      setProgresso("")
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) gerarRelatorio()
  }

  function usarSugestao(sug) {
    setComando(sug)
    inputRef.current?.focus()
  }

  // Dados para gráfico
  const dadosGraficoCampanhas =
    relatorio?.campanhas?.map((c) => ({
      nome:
        c.nome?.length > 25 ? c.nome.substring(0, 25) + "..." : c.nome,
      spend:
        parseFloat(
          c.spend?.replace(/[R$\s.]/g, "").replace(",", "."),
        ) || 0,
      roas:
        parseFloat(c.roas?.replace("x", "").replace(",", ".")) || 0,
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
      {/* Header */}
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
        {/* Painel de Configuração */}
        <div
          style={{
            background: "#0F0F0F",
            border: "1px solid #1E1E1E",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
          }}
        >
          {/* Seletor de Cliente */}
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
                  color: "#444",
                }}
              >
                Carregando clientes...
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
                        clienteSelecionado?.id === c.id
                          ? "#C9A84C"
                          : "#1E1E1E"
                      }`,
                      background:
                        clienteSelecionado?.id === c.id
                          ? "#C9A84C15"
                          : "#141414",
                      color:
                        clienteSelecionado?.id === c.id
                          ? "#C9A84C"
                          : "#888",
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
                        background:
                          c.status === "Ativo" ? "#22c55e" : "#eab308",
                        flexShrink: 0,
                      }}
                    />
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campo de Comando */}
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

          {/* Sugestões rápidas */}
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

        {/* Loading State */}
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
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#AAA" }}>
              Haiku coleta os dados do Meta · Sonnet gera a análise
            </p>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 12,
                  background: "#141414",
                  border: "1px solid #1E1E1E",
                  fontSize: 10,
                  color: "#AAA",
                }}
              >
                📡 MCP Meta Ads
              </span>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 12,
                  background: "#141414",
                  border: "1px solid #1E1E1E",
                  fontSize: 10,
                  color: "#AAA",
                }}
              >
                ⚡ Haiku 4.5
              </span>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 12,
                  background: "#141414",
                  border: "1px solid #1E1E1E",
                  fontSize: 10,
                  color: "#AAA",
                }}
              >
                🧠 Sonnet 4
              </span>
            </div>
          </div>
        )}

        {/* Erro */}
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
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#ef4444",
                fontWeight: 700,
              }}
            >
              ❌ Erro ao gerar relatório
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 12,
                color: "#ef444499",
              }}
            >
              {erro}
            </p>
          </div>
        )}

        {/* ═══════════ RELATÓRIO ═══════════ */}
        {relatorio && (
          <div ref={resultadoRef}>
            {/* Título */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, #141414 0%, #0F0F0F 100%)",
                border: "1px solid #C9A84C44",
                borderRadius: 14,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#C9A84C",
                    }}
                  >
                    {relatorio.titulo || "Relatório de Performance"}
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "#666",
                    }}
                  >
                    📁 {clienteSelecionado?.nome}
                    {relatorio.periodo && ` · 📅 ${relatorio.periodo}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: "#14141488",
                      border: "1px solid #1E1E1E",
                      color: "#666",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    Coleta: Haiku 4.5
                  </span>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: "#C9A84C22",
                      color: "#C9A84C",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    Análise: Sonnet 4
                  </span>
                </div>
              </div>
              {relatorio.resumo_executivo && (
                <p
                  style={{
                    margin: "16px 0 0",
                    padding: "12px 16px",
                    background: "#0A0A0A",
                    borderRadius: 8,
                    borderLeft: "3px solid #C9A84C",
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#D0D0D0",
                  }}
                >
                  {relatorio.resumo_executivo}
                </p>
              )}
            </div>

            {/* Métricas Principais */}
            {relatorio.metricas_principais?.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {relatorio.metricas_principais.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#0F0F0F",
                      border: "1px solid #1E1E1E",
                      borderRadius: 12,
                      padding: "16px 18px",
                      borderTop: `2px solid ${
                        STATUS_CORES[m.status] || "#1E1E1E"
                      }`,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "#555",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {m.label}
                    </p>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 22,
                        fontWeight: 700,
                        color: STATUS_CORES[m.status] || "#E5E5E5",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {m.valor}
                    </p>
                    {m.variacao && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11,
                          color: m.variacao.startsWith("+")
                            ? "#22c55e"
                            : m.variacao.startsWith("-")
                              ? "#ef4444"
                              : "#666",
                        }}
                      >
                        {m.variacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Gráfico de Campanhas */}
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
                <h3
                  style={{
                    margin: "0 0 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    letterSpacing: 0.5,
                  }}
                >
                  INVESTIMENTO POR CAMPANHA
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={dadosGraficoCampanhas}
                    margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                    <XAxis
                      dataKey="nome"
                      tick={{ fill: "#555", fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: "#555", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#141414",
                        border: "1px solid #2A2A2A",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#C9A84C" }}
                    />
                    <Bar
                      dataKey="spend"
                      fill="#C9A84C"
                      radius={[4, 4, 0, 0]}
                      name="Investimento (R$)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabela de Campanhas */}
            {relatorio.campanhas?.length > 0 && (
              <div
                style={{
                  background: "#0F0F0F",
                  border: "1px solid #1E1E1E",
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                  overflowX: "auto",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    letterSpacing: 0.5,
                  }}
                >
                  DETALHAMENTO POR CAMPANHA
                </h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1E1E1E" }}>
                      {[
                        "Campanha",
                        "Status",
                        "Invest.",
                        "CTR",
                        "CPC",
                        "ROAS",
                        "Compras",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 10px",
                            textAlign: "left",
                            color: "#444",
                            fontWeight: 700,
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.campanhas.map((c, i) => {
                      const badge =
                        AVALIACAO_BADGE[c.avaliacao] ||
                        AVALIACAO_BADGE.medio
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid #141414",
                          }}
                        >
                          <td
                            style={{
                              padding: "10px",
                              color: "#E5E5E5",
                              fontWeight: 600,
                              maxWidth: 220,
                            }}
                          >
                            {c.nome}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 10,
                                background:
                                  c.status === "ACTIVE"
                                    ? "#22c55e22"
                                    : "#eab30822",
                                color:
                                  c.status === "ACTIVE"
                                    ? "#22c55e"
                                    : "#eab308",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              color: "#D0D0D0",
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {c.spend}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              color: "#D0D0D0",
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {c.ctr}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              color: "#D0D0D0",
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {c.cpc}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              color: "#C9A84C",
                              fontWeight: 700,
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {c.roas || "—"}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              color: "#D0D0D0",
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {c.compras ?? "—"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 10,
                                background: badge.bg,
                                color: badge.color,
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Análise Detalhada */}
            {relatorio.analise_detalhada && (
              <div
                style={{
                  background: "#0F0F0F",
                  border: "1px solid #1E1E1E",
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    letterSpacing: 0.5,
                  }}
                >
                  ANÁLISE DETALHADA
                </h3>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.8,
                    color: "#BBBBBB",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {relatorio.analise_detalhada}
                </div>
              </div>
            )}

            {/* Recomendações */}
            {relatorio.recomendacoes?.length > 0 && (
              <div
                style={{
                  background: "#0F1A0A",
                  border: "1px solid #C9A84C33",
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#C9A84C",
                    letterSpacing: 0.5,
                  }}
                >
                  💡 RECOMENDAÇÕES
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {relatorio.recomendacoes.map((rec, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 14px",
                        background: "#141414",
                        borderRadius: 8,
                        borderLeft: "3px solid #C9A84C",
                        fontSize: 13,
                        color: "#D0D0D0",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          color: "#C9A84C",
                          fontWeight: 700,
                          marginRight: 6,
                        }}
                      >
                        {i + 1}.
                      </span>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div
              style={{
                textAlign: "center",
                padding: "12px 0 24px",
                fontSize: 11,
                color: "#888",
              }}
            >
              Relatório gerado por Claude AI · RC Digital ·{" "}
              {new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>
        )}

        {/* Estado vazio */}
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
              <br />
              Pode ser desde "overview dos últimos 7 dias" até "analise o ROAS
              das campanhas de remarketing de março".
            </p>
          </div>
        )}

        {/* Histórico */}
        {historico.length > 0 && !carregando && (
          <div
            style={{
              marginTop: 24,
              padding: "16px 0",
              borderTop: "1px solid #1E1E1E",
            }}
          >
            <h4
              style={{
                margin: "0 0 10px",
                fontSize: 11,
                color: "#888",
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              HISTÓRICO RECENTE
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {historico.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setComando(h.comando)
                    const cl = clientes.find(
                      (c) => c.nome === h.cliente,
                    )
                    if (cl) setClienteSelecionado(cl)
                  }}
                  style={{
                    padding: "6px 10px",
                    background: "transparent",
                    border: "1px solid #141414",
                    borderRadius: 6,
                    color: "#CCC",
                    fontSize: 11,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'Nunito', sans-serif",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    {h.cliente} — {h.comando}
                  </span>
                  <span style={{ color: "#888", fontSize: 10 }}>
                    {h.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        select option { background: #141414; color: #E5E5E5; }
        textarea::placeholder { color: #444; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
      `}</style>
    </div>
  )
}
