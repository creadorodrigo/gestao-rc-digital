import { Globe, TrendingUp, Lock } from 'lucide-react'
import type { Cliente } from '../../types'

interface ClientCardProps {
    client: Cliente
    isAdmin: boolean
    onClick: () => void
}

const STATUS_BADGE: Record<string, string> = {
    Prospectando: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    Ativo: 'bg-green-500/20 text-green-400 border border-green-500/30',
    Encerrado: 'bg-red-500/20 text-red-400 border border-red-500/30',
}

const TYPE_BADGE: Record<string, string> = {
    'E-commerce': 'bg-blue-500/20 text-blue-400',
    'Negócio Local': 'bg-orange-500/20 text-orange-400',
    'Info Produto': 'bg-pink-500/20 text-pink-400',
    'Outros': 'bg-gray-500/20 text-gray-400',
}

function brl(val?: number) {
    if (!val) return 'R$ 0'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)
}

function pct(faturado: number, meta: number) {
    if (!meta) return 0
    return Math.min(100, Math.round((faturado / meta) * 100))
}

function progressColor(p: number) {
    if (p >= 90) return 'bg-green-500'
    if (p >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
}

export default function ClientCard({ client, isAdmin, onClick }: ClientCardProps) {
    const p = pct(client.faturado_ate_data, client.meta_faturamento)

    return (
        <div onClick={onClick} className="card-hover animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-200 text-sm leading-tight">{client.nome}</h3>
                    {client.site && (
                        <a href={'https://' + client.site} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                            className="text-xs text-gray-500 hover:text-gold transition-colors flex items-center gap-0.5 mt-0.5">
                            <Globe size={9} />{client.site}
                        </a>
                    )}
                </div>
                <span className={`badge ${STATUS_BADGE[client.status]}`}>{client.status}</span>
            </div>

            {/* Type */}
            <div className="flex items-center gap-1.5 mb-3">
                <span className={`badge ${TYPE_BADGE[client.tipo]}`}>{client.tipo}</span>
            </div>

            {/* Progress bar */}
            {client.meta_faturamento > 0 && (
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>Meta de faturamento</span>
                        <span className="font-mono font-bold text-gray-400">{p}%</span>
                    </div>
                    <div className="w-full bg-dark-500 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${progressColor(p)}`} style={{ width: `${p}%` }} />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-dark-500/50">
                <div className="flex items-center gap-1 text-xs font-mono text-gray-400">
                    <TrendingUp size={10} className="text-gold/60" />
                    {brl(client.investimento_mensal)}<span className="text-gray-600">/mês</span>
                </div>
                {isAdmin && client.contrato_mensal !== undefined && (
                    <span className="flex items-center gap-1 text-[10px] text-gold/70">
                        <Lock size={8} />{brl(client.contrato_mensal)}
                    </span>
                )}
            </div>
        </div>
    )
}
