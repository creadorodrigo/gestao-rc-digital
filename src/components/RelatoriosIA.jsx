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
  "SUA_CHAVE_AQUI"

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
          }
        )

        if (!res.ok) {
          const textoErro = await res.text()
          throw new Error(
            `Erro HTTP ${res.status}${textoErro ? `: ${textoErro}` : ""}`
          )
        }

        const data = await res.json()

        if (!ativo) return

        if (Array.isArray(data)) {
          const clientesValidos = data.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              "id" in item &&
              "nome" in item
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
        setErro(err?.message || "Erro ao carregar clientes")
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
        3000
      ),
      window.setTimeout(
        () => setProgresso("Dados coletados. Sonnet está analisando..."),
        10000
      ),
      window.setTimeout(
        () => setProgresso("Gerando insights e recomendações..."),
        18000
      ),
      window.setTimeout(
        () => setProgresso("Quase pronto, finalizando o relatório..."),
        25000
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

      const data = await res.json()

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
      setErro(err?.message || "Erro desconhecido")
    } finally {
      timers.forEach((timer) => clearTimeout(timer))
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

  const dadosGraficoCampanhas =
    relatorio?.campanhas?.map((c) => ({
      nome:
        c.nome?.length && c.nome.length > 25
          ? `${c.nome.substring(0, 25)}...`
          : c.nome ?? "Sem nome",
      spend:
        parseFloat(c.spend?.replace(/[R$\s.]/g, "").replace(",", ".") || "0") ||
        0,
      roas: parseFloat(c.roas?.replace("x", "").replace(",", ".") || "0") || 0,
    })) || []

  return (
    <div>
      {/* seu restante do JSX continua aqui */}
    </div>
  )
}
