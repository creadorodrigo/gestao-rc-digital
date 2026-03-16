import React, { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  clienteId: string
  clienteNome: string
  onClose: () => void
  onSuccess?: () => void
}

type Classificacao = 'Promotor' | 'Passivo' | 'Detrator' | null

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

export default function PesquisaNPS({ clienteId, clienteNome, onClose, onSuccess }: Props) {
  const [etapa, setEtapa] = useState(1)
  const [score, setScore] = useState<number | null>(null)
  const [pontosFortes, setPontosFortes] = useState('')
  const [pontosFracos, setPontosFracos] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const classificacao = classificar(score)

  async function confirmar() {
    if (score === null) return
    setSalvando(true)
    setErro(null)
    try {
      const { error } = await supabase!
        .from('clientes')
        .update({
          nps_score: score,
          nps_pontos_fortes: pontosFortes.trim() || null,
          nps_pontos_fracos: pontosFracos.trim() || null,
          nps_respondido_em: new Date().toISOString(),
        })
        .eq('id', clienteId)
      if (error) throw new Error(error.message)
      setEtapa(5)
      onSuccess?.()
      setTimeout(onClose, 2500)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal-box"
        style={{ maxWidth: 520, width: '100%' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid #1E1E1E' }}>
          <div className="flex items-center gap-2">
            <Star size={16} className="text-gold" />
            <span className="font-semibold text-sm text-gray-200">Pesquisa NPS</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '24px' }}>

          {/* Etapa 1: Score */}
          {etapa === 1 && (
            <div>
              <h3 className="text-lg font-bold text-gray-100 mb-1" style={{ fontFamily: 'Nunito' }}>
                Olá, {clienteNome}! 👋
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Em uma escala de 0 a 10, qual a probabilidade de você recomendar a RC Digital a um amigo ou colega?
              </p>
              {/* Scale labels */}
              <div className="flex justify-between text-xs text-gray-500 mb-2 px-0.5">
                <span>Muito improvável</span>
                <span>Muito provável</span>
              </div>
              {/* Score buttons */}
              <div className="flex gap-1.5 flex-wrap justify-center mb-4">
                {Array.from({ length: 11 }, (_, i) => i).map(n => (
                  <button
                    key={n}
                    onClick={() => setScore(n)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      border: score === n ? `2px solid ${corScore(n)}` : '2px solid #2A2A2A',
                      background: score === n ? `${corScore(n)}20` : '#1A1A1A',
                      color: score === n ? corScore(n) : '#888',
                      fontWeight: score === n ? 700 : 500,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {/* Classification badge */}
              {classificacao && (
                <div
                  className="text-center text-sm font-semibold py-2 rounded-lg"
                  style={{
                    background: classificacao === 'Promotor' ? '#22c55e15' : classificacao === 'Passivo' ? '#eab30815' : '#ef444415',
                    color: classificacao === 'Promotor' ? '#22c55e' : classificacao === 'Passivo' ? '#eab308' : '#ef4444',
                    border: `1px solid ${classificacao === 'Promotor' ? '#22c55e30' : classificacao === 'Passivo' ? '#eab30830' : '#ef444430'}`,
                  }}
                >
                  {classificacao === 'Promotor' ? '🌟 Promotor' : classificacao === 'Passivo' ? '😐 Passivo' : '😟 Detrator'}
                </div>
              )}
            </div>
          )}

          {/* Etapa 2: Pontos Fortes */}
          {etapa === 2 && (
            <div>
              <h3 className="text-lg font-bold text-gray-100 mb-1" style={{ fontFamily: 'Nunito' }}>
                ✅ O que você mais gostou?
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Compartilhe o que tem funcionado bem no nosso trabalho. (opcional)
              </p>
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
              <p className="text-gray-400 text-sm mb-4">
                Sua opinião nos ajuda a crescer. (opcional)
              </p>
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
                <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 16px' }}>
                  <p className="text-xs text-gray-500 mb-1">Nota NPS</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-bold font-mono"
                      style={{ color: corScore(score!) }}
                    >
                      {score}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: classificacao === 'Promotor' ? '#22c55e20' : classificacao === 'Passivo' ? '#eab30820' : '#ef444420',
                        color: classificacao === 'Promotor' ? '#22c55e' : classificacao === 'Passivo' ? '#eab308' : '#ef4444',
                      }}
                    >
                      {classificacao}
                    </span>
                  </div>
                </div>
                {pontosFortes && (
                  <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 16px' }}>
                    <p className="text-xs text-gray-500 mb-1">✅ Pontos fortes</p>
                    <p className="text-sm text-gray-300">{pontosFortes}</p>
                  </div>
                )}
                {pontosFracos && (
                  <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 16px' }}>
                    <p className="text-xs text-gray-500 mb-1">📈 O que melhorar</p>
                    <p className="text-sm text-gray-300">{pontosFracos}</p>
                  </div>
                )}
                {!pontosFortes && !pontosFracos && (
                  <p className="text-xs text-gray-500 italic">Nenhum comentário adicional.</p>
                )}
              </div>
              {erro && (
                <p className="text-red-400 text-xs mt-3 text-center">{erro}</p>
              )}
            </div>
          )}

          {/* Etapa 5: Sucesso */}
          {etapa === 5 && (
            <div className="text-center py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#22c55e20', border: '2px solid #22c55e40' }}
              >
                <Check size={28} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-100 mb-2" style={{ fontFamily: 'Nunito' }}>
                Obrigado! 🎉
              </h3>
              <p className="text-gray-400 text-sm">
                Sua resposta foi registrada com sucesso. Valorizamos muito o seu feedback!
              </p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {etapa < 5 && (
          <div className="modal-footer" style={{ borderTop: '1px solid #1E1E1E', justifyContent: 'space-between' }}>
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
                {salvando ? 'Salvando...' : (
                  <><Check size={15} /> Confirmar</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
