import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Classificacao = 'Promotor' | 'Passivo' | 'Detrator' | null
type PageState = 'loading' | 'error' | 'survey' | 'success'

function classificar(score: number | null): Classificacao {
  if (score === null) return null
  if (score >= 9) return 'Promotor'
  if (score >= 7) return 'Passivo'
  return 'Detrator'
}

function corScore(score: number): string {
  if (score >= 9) return '#22c55e'
  if (score >= 7) return '#eab308'
  return '#ef4444'
}

export default function PesquisaPublica() {
  const { token } = useParams<{ token: string }>()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [clienteNome, setClienteNome] = useState('')

  const [etapa, setEtapa] = useState(1)
  const [score, setScore] = useState<number | null>(null)
  const [pontosFortes, setPontosFortes] = useState('')
  const [pontosFracos, setPontosFracos] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)

  const classificacao = classificar(score)

  useEffect(() => {
    if (!token) {
      setErrorMsg('Link inválido.')
      setPageState('error')
      return
    }
    supabase!
      .rpc('get_nps_client', { p_token: token })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setErrorMsg('Link inválido ou expirado. Solicite um novo link à RC Digital.')
          setPageState('error')
          return
        }
        setClienteNome(data[0].nome)
        setPageState('survey')
      })
  }, [token])

  async function confirmar() {
    if (score === null || !token) return
    setSalvando(true)
    setErroSalvar(null)
    try {
      const { data, error } = await supabase!.rpc('submit_nps_response', {
        p_token: token,
        p_score: score,
        p_pontos_fortes: pontosFortes.trim() || null,
        p_pontos_fracos: pontosFracos.trim() || null,
      })
      if (error) throw new Error(error.message)
      if (!data) throw new Error('Token inválido.')
      setPageState('success')
    } catch (e: unknown) {
      setErroSalvar(e instanceof Error ? e.message : 'Erro ao salvar resposta.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#0A0A0A' }}
    >
      {/* Logo RC Digital */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 flex items-center justify-center rounded-xl rotate-45 flex-shrink-0"
          style={{ background: '#141414', border: '1px solid #C9A84C40' }}
        >
          <span className="-rotate-45 font-bold text-sm" style={{ color: '#C9A84C', fontFamily: 'Nunito' }}>RC</span>
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight" style={{ fontFamily: 'Nunito' }}>RC Digital</p>
          <p className="text-xs" style={{ color: '#888' }}>Pesquisa de satisfação</p>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full rounded-2xl shadow-2xl"
        style={{ maxWidth: 520, background: '#141414', border: '1px solid #1E1E1E' }}
      >
        {/* Loading */}
        {pageState === 'loading' && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {pageState === 'error' && (
          <div className="text-center py-12 px-8">
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="text-lg font-bold text-gray-200 mb-2" style={{ fontFamily: 'Nunito' }}>Link não encontrado</h2>
            <p className="text-sm text-gray-500">{errorMsg}</p>
          </div>
        )}

        {/* Success */}
        {pageState === 'success' && (
          <div className="text-center py-12 px-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#22c55e20', border: '2px solid #22c55e40' }}
            >
              <Check size={28} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-100 mb-2" style={{ fontFamily: 'Nunito' }}>
              Obrigado, {clienteNome}! 🎉
            </h2>
            <p className="text-sm text-gray-400">
              Sua resposta foi registrada com sucesso. Valorizamos muito o seu feedback — ele nos ajuda a melhorar continuamente!
            </p>
            <p className="text-xs text-gray-600 mt-6">RC Digital</p>
          </div>
        )}

        {/* Survey */}
        {pageState === 'survey' && (
          <>
            {/* Header */}
            <div
              className="flex items-center gap-2 px-6 py-4"
              style={{ borderBottom: '1px solid #1E1E1E' }}
            >
              <Star size={15} style={{ color: '#C9A84C' }} />
              <span className="text-sm font-semibold text-gray-200">Pesquisa NPS</span>
              {/* Progress dots */}
              <div className="ml-auto flex gap-1.5">
                {[1, 2, 3, 4].map(n => (
                  <div
                    key={n}
                    className="rounded-full"
                    style={{
                      width: 6, height: 6,
                      background: n <= etapa ? '#C9A84C' : '#2A2A2A',
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>

              {/* Etapa 1: Score */}
              {etapa === 1 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-100 mb-1" style={{ fontFamily: 'Nunito' }}>
                    Olá, {clienteNome}! 👋
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Em uma escala de 0 a 10, qual a probabilidade de você recomendar a <strong className="text-gray-300">RC Digital</strong> a um amigo ou colega?
                  </p>
                  <div className="flex justify-between text-xs text-gray-500 mb-2 px-0.5">
                    <span>Muito improvável</span>
                    <span>Muito provável</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-center mb-4">
                    {Array.from({ length: 11 }, (_, i) => i).map(n => (
                      <button
                        key={n}
                        onClick={() => setScore(n)}
                        style={{
                          width: 42, height: 42, borderRadius: 8,
                          border: score === n ? `2px solid ${corScore(n)}` : '2px solid #2A2A2A',
                          background: score === n ? `${corScore(n)}20` : '#1A1A1A',
                          color: score === n ? corScore(n) : '#888',
                          fontWeight: score === n ? 700 : 500,
                          fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Etapa 2: Pontos Fortes */}
              {etapa === 2 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-100 mb-1" style={{ fontFamily: 'Nunito' }}>
                    ✅ O que você mais gostou?
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">Compartilhe o que tem funcionado bem. (opcional)</p>
                  <textarea
                    value={pontosFortes}
                    onChange={e => setPontosFortes(e.target.value)}
                    placeholder="Ex: Comunicação clara, resultados consistentes, atendimento..."
                    rows={5}
                    className="form-input w-full resize-none"
                    style={{ fontFamily: 'inherit', lineHeight: 1.6 }}
                  />
                </div>
              )}

              {/* Etapa 3: Pontos Fracos */}
              {etapa === 3 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-100 mb-1" style={{ fontFamily: 'Nunito' }}>
                    📈 O que pode melhorar?
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">Sua opinião nos ajuda a crescer. (opcional)</p>
                  <textarea
                    value={pontosFracos}
                    onChange={e => setPontosFracos(e.target.value)}
                    placeholder="Ex: Relatórios mais detalhados, maior frequência de contato..."
                    rows={5}
                    className="form-input w-full resize-none"
                    style={{ fontFamily: 'inherit', lineHeight: 1.6 }}
                  />
                </div>
              )}

              {/* Etapa 4: Confirmação */}
              {etapa === 4 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-100 mb-4" style={{ fontFamily: 'Nunito' }}>
                    Confirmar respostas
                  </h3>
                  <div className="space-y-3">
                    <div style={{ background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 16px' }}>
                      <p className="text-xs text-gray-500 mb-1">Nota NPS</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold font-mono" style={{ color: corScore(score!) }}>{score}</span>
                      </div>
                    </div>
                    {pontosFortes && (
                      <div style={{ background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 16px' }}>
                        <p className="text-xs text-gray-500 mb-1">✅ Pontos fortes</p>
                        <p className="text-sm text-gray-300">{pontosFortes}</p>
                      </div>
                    )}
                    {pontosFracos && (
                      <div style={{ background: '#0F0F0F', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 16px' }}>
                        <p className="text-xs text-gray-500 mb-1">📈 O que melhorar</p>
                        <p className="text-sm text-gray-300">{pontosFracos}</p>
                      </div>
                    )}
                    {!pontosFortes && !pontosFracos && (
                      <p className="text-xs text-gray-500 italic">Nenhum comentário adicional.</p>
                    )}
                  </div>
                  {erroSalvar && (
                    <p className="text-red-400 text-xs mt-3 text-center">{erroSalvar}</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer navigation */}
            <div
              className="flex items-center justify-between px-6 pb-6"
              style={{ paddingTop: 0 }}
            >
              <button
                onClick={() => setEtapa(e => e - 1)}
                disabled={etapa === 1}
                className="btn-ghost flex items-center gap-1.5 text-sm"
                style={{ visibility: etapa === 1 ? 'hidden' : 'visible' }}
              >
                <ChevronLeft size={15} /> Voltar
              </button>

              {etapa < 4 ? (
                <button
                  onClick={() => setEtapa(e => e + 1)}
                  disabled={etapa === 1 && score === null}
                  className="btn-primary flex items-center gap-1.5 text-sm"
                >
                  Próximo <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={confirmar}
                  disabled={salvando}
                  className="btn-primary flex items-center gap-1.5 text-sm"
                  style={{ background: '#22c55e', borderColor: '#22c55e' }}
                >
                  {salvando ? 'Salvando...' : <><Check size={15} /> Confirmar</>}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-700 mt-6">
        © {new Date().getFullYear()} RC Digital
      </p>
    </div>
  )
}
