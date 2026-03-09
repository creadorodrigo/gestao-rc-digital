import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://mtckfghzgynimptclvtd.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Y2tmZ2h6Z3luaW1wdGNsdnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjUyMzcsImV4cCI6MjA4ODM0MTIzN30.KmAd7UBD_3GTShGMK4ZQo5EszQSg1FETOfpBN65du18'

const USUARIOS = [
  { id: '503dbfa3-9cee-4d12-9aa2-3ce935b03acf', nome: 'Rodrigo Creado' },
  { id: '955f0af9-3dfc-4b18-82c5-6f477518eca6', nome: 'Thuany Moreira' },
  { id: 'c6bc281a-0369-4bea-be02-d4bc3107e5ec', nome: 'Davi Ermorgenes' },
  { id: 'cfc9967e-7fdb-46a2-8cf7-a4772d778380', nome: 'Yoselin Velarde' },
]

interface Cliente { id: string; nome: string }

interface TarefaGerada {
  titulo: string
  descricao: string | null
  cliente_id: string | null
  cliente_nome: string
  responsavel_id: string | null
  responsavel_nome: string
  solicitante_id: string
  solicitante: string
  prioridade: 'baixa' | 'média' | 'alta' | 'urgente'
  status: 'A Fazer'
  data_vencimento: string | null
  recorrencia: 'não' | 'semanal' | 'mensal'
}

interface Reuniao {
  id: string
  titulo: string
  cliente_id: string | null
  data_reuniao: string
  anotacoes: string
  resumo_ia: string | null
  status: 'Anotada' | 'Processada' | 'Tarefas Criadas'
  tarefas_geradas: TarefaGerada[] | null
  criado_em: string
  clientes?: { nome: string } | null
}

const PRIORIDADE_COR: Record<string, string> = {
  baixa: '#22c55e', média: '#eab308', alta: '#f97316', urgente: '#ef4444',
}

const STATUS_COR: Record<string, { bg: string; text: string }> = {
  'Anotada':        { bg: '#1a1a2e', text: '#6366f1' },
  'Processada':     { bg: '#1a2a1a', text: '#eab308' },
  'Tarefas Criadas':{ bg: '#0a1a0a', text: '#22c55e' },
}

function buildSystemPrompt(clientes: Cliente[]) {
  return `Você é o assistente de operações da RC Digital, agência de tráfego pago de Rodrigo Creado (Joinville/SC).

Sua função: interpretar anotações de reuniões e criar tarefas estruturadas.

## TIME DA AGÊNCIA
${USUARIOS.map(u => `- ${u.nome} (ID: ${u.id})`).join('\n')}

## CLIENTES ATIVOS
${clientes.map(c => `- ${c.nome} (ID: ${c.id})`).join('\n')}

## REGRAS DE NEGÓCIO
- Rodrigo Creado = dono, estratégia e tráfego
- Thuany Moreira = criativos, design, conteúdo
- Davi Ermorgenes = suporte técnico, implementações
- Yoselin Velarde = atendimento, relatórios, suporte
- Prioridade padrão: "média". Use "urgente" para prazo ≤2 dias ou palavras urgente/rápido/hoje
- Se não mencionar data, deixe null
- Se não mencionar responsável, deixe null

## FORMATO DE RESPOSTA OBRIGATÓRIO

RESUMO:
[resumo executivo da reunião em 2-4 linhas com emojis, destacando decisões e próximos passos]

TAREFAS:
[array JSON]

O JSON deve seguir exatamente:
[
  {
    "titulo": "string",
    "descricao": "string ou null",
    "cliente_id": "uuid ou null",
    "cliente_nome": "string",
    "responsavel_id": "uuid ou null",
    "responsavel_nome": "string ou vazio",
    "solicitante_id": "503dbfa3-9cee-4d12-9aa2-3ce935b03acf",
    "solicitante": "Rodrigo Creado",
    "prioridade": "baixa|média|alta|urgente",
    "status": "A Fazer",
    "data_vencimento": "YYYY-MM-DD ou null",
    "recorrencia": "não|semanal|mensal"
  }
]

Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`
}

function parseRespostaIA(texto: string): { resumo: string; tarefas: TarefaGerada[] | null } {
  try {
    const jsonMatch = texto.match(/TAREFAS:\s*(\[[\s\S]*?\])/i)
    const resumoMatch = texto.match(/RESUMO:\s*([\s\S]*?)(?=TAREFAS:|$)/i)
    if (!jsonMatch) return { resumo: texto, tarefas: null }
    const tarefas = JSON.parse(jsonMatch[1]) as TarefaGerada[]
    const resumo = resumoMatch ? resumoMatch[1].trim() : ''
    return { resumo, tarefas }
  } catch {
    return { resumo: texto, tarefas: null }
  }
}

// ─── Componente principal ────────────────────────────────────────────────────

type Etapa = 'lista' | 'nova' | 'processando' | 'revisao' | 'historico'

export default function Reunioes() {
  const [etapa, setEtapa] = useState<Etapa>('lista')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [reunioes, setReunioes] = useState<Reuniao[]>([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Form nova reunião
  const [formTitulo, setFormTitulo] = useState('')
  const [formCliente, setFormCliente] = useState('')
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0])
  const [formAnotacoes, setFormAnotacoes] = useState('')

  // Estado de processamento
  const [processando, setProcessando] = useState(false)
  const [resumoIA, setResumoIA] = useState('')
  const [tarefasGeradas, setTarefasGeradas] = useState<TarefaGerada[]>([])
  const [reuniaoAtualId, setReuniaoAtualId] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [sucessoCriacao, setSucessoCriacao] = useState<number | null>(null)

  // Reunião selecionada no histórico
  const [reuniaoHistorico, setReuniaoHistorico] = useState<Reuniao | null>(null)

  const buscarDados = useCallback(async () => {
    setLoadingLista(true)
    try {
      const [{ data: cs }, { data: rs }] = await Promise.all([
        supabase!.from('clientes').select('id,nome').eq('status', 'Ativo').order('nome'),
        supabase!.from('reunioes').select('*,clientes(nome)').order('criado_em', { ascending: false }).limit(30),
      ])
      setClientes(cs ?? [])
      setReunioes((rs as Reuniao[]) ?? [])
    } finally {
      setLoadingLista(false)
    }
  }, [])

  useEffect(() => { buscarDados() }, [buscarDados])

  function resetForm() {
    setFormTitulo(''); setFormCliente(''); setFormAnotacoes('')
    setFormData(new Date().toISOString().split('T')[0])
    setResumoIA(''); setTarefasGeradas([]); setReuniaoAtualId(null)
    setErro(null); setSucessoCriacao(null)
  }

  // ETAPA 1 → 2: Salva rascunho e chama IA
  async function processarReuniao() {
    if (!formTitulo.trim() || !formAnotacoes.trim()) {
      setErro('Preencha o título e as anotações.'); return
    }
    setErro(null)
    setEtapa('processando')
    setProcessando(true)

    try {
      // Salva rascunho no Supabase
      const { data: reuniao, error: erroSave } = await supabase!
        .from('reunioes')
        .insert([{
          titulo: formTitulo.trim(),
          cliente_id: formCliente || null,
          data_reuniao: formData,
          anotacoes: formAnotacoes.trim(),
          status: 'Anotada',
          criado_por: '503dbfa3-9cee-4d12-9aa2-3ce935b03acf',
        }])
        .select()
        .single()

      if (erroSave) throw new Error(erroSave.message)
      setReuniaoAtualId(reuniao.id)

      // Chama Claude via proxy seguro (Edge Function)
      const { data: { session } } = await supabase!.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch('https://mtckfghzgynimptclvtd.supabase.co/functions/v1/claude-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Y2tmZ2h6Z3luaW1wdGNsdnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjUyMzcsImV4cCI6MjA4ODM0MTIzN30.KmAd7UBD_3GTShGMK4ZQo5EszQSg1FETOfpBN65du18',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: buildSystemPrompt(clientes),
          messages: [{ role: 'user', content: formAnotacoes.trim() }],
        }),
      })
      const dataIA = await res.json()
      const textoIA = dataIA.content?.[0]?.text ?? ''
      const { resumo, tarefas } = parseRespostaIA(textoIA)

      setResumoIA(resumo)
      setTarefasGeradas(tarefas ?? [])

      // Atualiza reunião com resultado da IA
      await supabase!.from('reunioes').update({
        resumo_ia: resumo,
        tarefas_geradas: tarefas,
        status: 'Processada',
      }).eq('id', reuniao.id)

      setEtapa('revisao')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao processar')
      setEtapa('nova')
    } finally {
      setProcessando(false)
    }
  }

  // ETAPA 2: Editar tarefa inline
  function editarTarefa(idx: number, campo: keyof TarefaGerada, valor: string) {
    setTarefasGeradas(prev => prev.map((t, i) => {
      if (i !== idx) return t
      if (campo === 'responsavel_id') {
        const user = USUARIOS.find(u => u.id === valor)
        return { ...t, responsavel_id: valor || null, responsavel_nome: user?.nome ?? '' }
      }
      if (campo === 'cliente_id') {
        const cli = clientes.find(c => c.id === valor)
        return { ...t, cliente_id: valor || null, cliente_nome: cli?.nome ?? '' }
      }
      return { ...t, [campo]: valor }
    }))
  }

  function removerTarefa(idx: number) {
    setTarefasGeradas(prev => prev.filter((_, i) => i !== idx))
  }

  // ETAPA 3: Criar tarefas no banco
  async function criarTarefas() {
    if (!tarefasGeradas.length) return
    setCriando(true); setErro(null)
    try {
      let sucesso = 0
      for (const t of tarefasGeradas) {
        const { error } = await supabase!.from('tarefas').insert([{
          titulo: t.titulo,
          descricao: t.descricao || null,
          cliente_id: t.cliente_id || null,
          responsavel_id: t.responsavel_id || null,
          responsavel: t.responsavel_nome || null,
          solicitante_id: t.solicitante_id || null,
          solicitante: t.solicitante || null,
          prioridade: t.prioridade,
          status: 'A Fazer',
          data_vencimento: t.data_vencimento || null,
          recorrencia: t.recorrencia || 'não',
          ativa: true,
        }])
        if (!error) sucesso++
      }

      if (reuniaoAtualId) {
        await supabase!.from('reunioes').update({
          status: 'Tarefas Criadas',
          tarefas_geradas: tarefasGeradas,
        }).eq('id', reuniaoAtualId)
      }

      setSucessoCriacao(sucesso)
      await buscarDados()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar tarefas')
    } finally {
      setCriando(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0A0A0A', color: '#E5E5E5', fontFamily: 'Nunito, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#C9A84C' }}>Reuniões</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
            Registre reuniões e crie tarefas automaticamente com IA
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {etapa !== 'lista' && (
            <button onClick={() => { setEtapa('lista'); resetForm() }}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>
              ← Voltar
            </button>
          )}
          {etapa === 'lista' && (
            <button onClick={() => { resetForm(); setEtapa('nova') }}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#0A0A0A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + Nova Reunião
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#1a0a0a', border: '1px solid #ef444444', color: '#ef4444', fontSize: 13 }}>
          {erro}
        </div>
      )}

      {/* ── ETAPA: LISTA ──────────────────────────────────────────────────── */}
      {etapa === 'lista' && (
        <div>
          {loadingLista ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <div style={{ width: 32, height: 32, border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : reunioes.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p style={{ color: '#444', fontSize: 14 }}>Nenhuma reunião registrada ainda.</p>
              <button onClick={() => { resetForm(); setEtapa('nova') }}
                style={{ marginTop: 12, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#0A0A0A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Registrar primeira reunião
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reunioes.map(r => {
                const sc = STATUS_COR[r.status] ?? STATUS_COR['Anotada']
                return (
                  <div key={r.id}
                    onClick={() => { setReuniaoHistorico(r); setEtapa('historico') }}
                    style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#C9A84C44')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E1E')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#E5E5E5' }}>{r.titulo}</span>
                          {r.clientes && (
                            <span style={{ fontSize: 11, color: '#666' }}>· {r.clientes.nome}</span>
                          )}
                        </div>
                        {r.resumo_ia && (
                          <p style={{ margin: 0, fontSize: 12, color: '#555', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {r.resumo_ia.slice(0, 120)}{r.resumo_ia.length > 120 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700, background: sc.bg, color: sc.text }}>
                          {r.status}
                        </span>
                        <span style={{ fontSize: 11, color: '#444' }}>
                          {new Date(r.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        {r.tarefas_geradas && (
                          <span style={{ fontSize: 11, color: '#555' }}>
                            {r.tarefas_geradas.length} tarefa{r.tarefas_geradas.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ETAPA: NOVA REUNIÃO ────────────────────────────────────────────── */}
      {etapa === 'nova' && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 16, padding: 24 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#C9A84C' }}>📝 Nova Reunião</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Título da reunião *</label>
                <input value={formTitulo} onChange={e => setFormTitulo(e.target.value)}
                  placeholder="Ex: Alinhamento mensal SuperKoch"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Cliente</label>
                  <select value={formCliente} onChange={e => setFormCliente(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 13, outline: 'none' }}>
                    <option value=''>Selecionar</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Data da reunião</label>
                  <input type='date' value={formData} onChange={e => setFormData(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>Anotações da reunião *</label>
                <textarea value={formAnotacoes} onChange={e => setFormAnotacoes(e.target.value)}
                  rows={10}
                  placeholder={'Cole aqui as anotações da reunião de forma livre.\nA IA vai interpretar tudo e identificar as tarefas automaticamente.\n\nExemplo:\n"Alinhamento com cliente — precisamos criar campanha de remarketing para maio, urgente. Thuany cuida dos criativos até sexta. Rodrigo configura o pixel até quarta. Cliente quer relatório semanal todo domingo."'}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'Nunito, sans-serif', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={processarReuniao}
                disabled={!formTitulo.trim() || !formAnotacoes.trim()}
                style={{ padding: '11px 28px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#0A0A0A', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (!formTitulo.trim() || !formAnotacoes.trim()) ? 0.4 : 1 }}>
                ✨ Analisar com IA →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ETAPA: PROCESSANDO ────────────────────────────────────────────── */}
      {etapa === 'processando' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 20 }}>
          <div style={{ width: 48, height: 48, border: '3px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#C9A84C', fontSize: 16, fontWeight: 600 }}>Analisando anotações...</p>
          <p style={{ color: '#444', fontSize: 13 }}>A IA está identificando as tarefas da reunião</p>
        </div>
      )}

      {/* ── ETAPA: REVISÃO ────────────────────────────────────────────────── */}
      {etapa === 'revisao' && (
        <div style={{ maxWidth: 740, margin: '0 auto' }}>

          {/* Resumo IA */}
          {resumoIA && (
            <div style={{ background: '#0f1a0f', border: '1px solid #C9A84C33', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#C9A84C', letterSpacing: 1 }}>✨ RESUMO DA REUNIÃO</p>
              <p style={{ margin: 0, fontSize: 13, color: '#C5C5A0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{resumoIA}</p>
            </div>
          )}

          {/* Tarefas para revisar */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#E5E5E5' }}>
              {tarefasGeradas.length} tarefa{tarefasGeradas.length !== 1 ? 's' : ''} identificada{tarefasGeradas.length !== 1 ? 's' : ''} — revise antes de criar
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tarefasGeradas.map((t, i) => (
                <TarefaCard
                  key={i}
                  tarefa={t}
                  index={i}
                  clientes={clientes}
                  onEditar={editarTarefa}
                  onRemover={removerTarefa}
                />
              ))}
            </div>
          </div>

          {/* Botões de confirmação */}
          {sucessoCriacao === null ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setEtapa('lista'); resetForm(); buscarDados() }}
                style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#666', fontSize: 13, cursor: 'pointer' }}>
                Descartar
              </button>
              <button onClick={criarTarefas} disabled={criando || tarefasGeradas.length === 0}
                style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#0A0A0A', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: criando ? 0.6 : 1 }}>
                {criando ? 'Criando...' : `🚀 Criar ${tarefasGeradas.length} tarefa${tarefasGeradas.length !== 1 ? 's' : ''} no sistema`}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 10, background: '#0a1a0a', border: '1px solid #22c55e44', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#22c55e' }}>
                ✅ {sucessoCriacao} tarefa{sucessoCriacao !== 1 ? 's' : ''} criada{sucessoCriacao !== 1 ? 's' : ''} com sucesso!
              </p>
              <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#444' }}>Reunião salva no histórico.</p>
              <button onClick={() => { setEtapa('lista'); resetForm() }}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#0A0A0A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Ver histórico
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ETAPA: HISTÓRICO DE REUNIÃO ───────────────────────────────────── */}
      {etapa === 'historico' && reuniaoHistorico && (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#E5E5E5' }}>{reuniaoHistorico.titulo}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555' }}>
                  {new Date(reuniaoHistorico.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {reuniaoHistorico.clientes && ` · ${reuniaoHistorico.clientes.nome}`}
                </p>
              </div>
              <span style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 700,
                background: STATUS_COR[reuniaoHistorico.status]?.bg ?? '#1a1a1a',
                color: STATUS_COR[reuniaoHistorico.status]?.text ?? '#888',
              }}>{reuniaoHistorico.status}</span>
            </div>

            {reuniaoHistorico.resumo_ia && (
              <div style={{ background: '#0f1a0f', border: '1px solid #C9A84C22', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#C9A84C' }}>✨ RESUMO IA</p>
                <p style={{ margin: 0, fontSize: 13, color: '#C5C5A0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{reuniaoHistorico.resumo_ia}</p>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Anotações originais</p>
              <p style={{ margin: 0, fontSize: 13, color: '#888', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#0A0A0A', padding: '12px 14px', borderRadius: 8 }}>
                {reuniaoHistorico.anotacoes}
              </p>
            </div>

            {reuniaoHistorico.tarefas_geradas && reuniaoHistorico.tarefas_geradas.length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Tarefas geradas ({reuniaoHistorico.tarefas_geradas.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reuniaoHistorico.tarefas_geradas.map((t, i) => (
                    <div key={i} style={{ background: '#0A0A0A', borderRadius: 8, padding: '8px 12px', borderLeft: `3px solid ${PRIORIDADE_COR[t.prioridade] ?? '#888'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5' }}>{t.titulo}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: (PRIORIDADE_COR[t.prioridade] ?? '#888') + '22', color: PRIORIDADE_COR[t.prioridade] ?? '#888', fontWeight: 700 }}>
                          {t.prioridade}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                        {t.cliente_nome && <span style={{ fontSize: 11, color: '#555' }}>📁 {t.cliente_nome}</span>}
                        {t.responsavel_nome && <span style={{ fontSize: 11, color: '#555' }}>👤 {t.responsavel_nome}</span>}
                        {t.data_vencimento && <span style={{ fontSize: 11, color: '#555' }}>📅 {new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, textarea { font-family: 'Nunito', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
      `}</style>
    </div>
  )
}

// ─── Card de Tarefa Editável ─────────────────────────────────────────────────

interface TarefaCardProps {
  tarefa: TarefaGerada
  index: number
  clientes: Cliente[]
  onEditar: (idx: number, campo: keyof TarefaGerada, valor: string) => void
  onRemover: (idx: number) => void
}

function TarefaCard({ tarefa, index, clientes, onEditar, onRemover }: TarefaCardProps) {
  const [expandido, setExpandido] = useState(true)

  return (
    <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 10, borderLeft: `3px solid ${PRIORIDADE_COR[tarefa.prioridade] ?? '#888'}`, overflow: 'hidden' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpandido(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 13, color: '#888' }}>{expandido ? '▾' : '▸'}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5' }}>{tarefa.titulo || '(sem título)'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: (PRIORIDADE_COR[tarefa.prioridade] ?? '#888') + '22', color: PRIORIDADE_COR[tarefa.prioridade] ?? '#888', fontWeight: 700 }}>
            {tarefa.prioridade}
          </span>
          <button onClick={e => { e.stopPropagation(); onRemover(index) }}
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 14, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
            ✕
          </button>
        </div>
      </div>

      {/* Campos editáveis */}
      {expandido && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Título</label>
            <input value={tarefa.titulo} onChange={e => onEditar(index, 'titulo', e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Descrição</label>
            <textarea value={tarefa.descricao ?? ''} onChange={e => onEditar(index, 'descricao', e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'Nunito, sans-serif', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Cliente</label>
              <select value={tarefa.cliente_id ?? ''} onChange={e => onEditar(index, 'cliente_id', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 12, outline: 'none' }}>
                <option value=''>—</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Responsável</label>
              <select value={tarefa.responsavel_id ?? ''} onChange={e => onEditar(index, 'responsavel_id', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 12, outline: 'none' }}>
                <option value=''>—</option>
                {USUARIOS.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Prioridade</label>
              <select value={tarefa.prioridade} onChange={e => onEditar(index, 'prioridade', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 12, outline: 'none' }}>
                <option value='baixa'>Baixa</option>
                <option value='média'>Média</option>
                <option value='alta'>Alta</option>
                <option value='urgente'>Urgente</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4 }}>Data de entrega</label>
              <input type='date' value={tarefa.data_vencimento ?? ''} onChange={e => onEditar(index, 'data_vencimento', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #2A2A2A', background: '#0A0A0A', color: '#E5E5E5', fontSize: 12, outline: 'none' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
