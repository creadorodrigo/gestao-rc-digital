import { useMemo } from 'react'
import { Users, DollarSign, AlertTriangle, Star } from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import { mockClientes, mockTarefas } from '../lib/mockData'

const TODAY = new Date('2026-03-05')

function brl(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

const DONUT_COLORS = ['#22c55e', '#eab308', '#ef4444']

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-dark-300 border border-dark-500 rounded-xl p-3 shadow-xl text-xs">
                <p className="font-semibold text-gray-200 mb-1">{label}</p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color }} className="font-mono">
                        {p.name}: {brl(p.value)}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export default function Dashboard() {
    const ativos = useMemo(() => mockClientes.filter(c => c.status === 'Ativo'), [])

    const receitaMensal = useMemo(() =>
        ativos.reduce((sum, c) => sum + (c.contrato_mensal || 0), 0), [ativos])

    const atrasadas = useMemo(() =>
        mockTarefas.filter(t => {
            if (!t.data_vencimento || t.status === 'Concluído') return false
            return new Date(t.data_vencimento + 'T00:00:00') < TODAY
        }).length, [])

    const npsMedia = useMemo(() => {
        const com = ativos.filter(c => c.nps !== undefined)
        if (!com.length) return 0
        return (com.reduce((s, c) => s + (c.nps || 0), 0) / com.length).toFixed(1)
    }, [ativos])

    const barData = useMemo(() =>
        ativos.map(c => ({
            name: c.nome.length > 12 ? c.nome.slice(0, 12) + '…' : c.nome,
            Meta: c.meta_faturamento,
            Faturado: c.faturado_ate_data,
        })), [ativos])

    const npsGroups = useMemo(() => {
        const com = ativos.filter(c => c.nps !== undefined)
        const promotores = com.filter(c => (c.nps || 0) >= 9).length
        const neutros = com.filter(c => (c.nps || 0) >= 7 && (c.nps || 0) <= 8).length
        const detratores = com.filter(c => (c.nps || 0) <= 6).length
        return [
            { name: 'Promotores', value: promotores },
            { name: 'Neutros', value: neutros },
            { name: 'Detratores', value: detratores },
        ]
    }, [ativos])

    const stats = [
        { label: 'Clientes Ativos', value: ativos.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Receita Mensal', value: brl(receitaMensal), icon: DollarSign, color: 'text-gold', bg: 'bg-gold/10' },
        { label: 'Tarefas Atrasadas', value: atrasadas, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
        { label: 'NPS Médio', value: npsMedia, icon: Star, color: 'text-green-400', bg: 'bg-green-400/10' },
    ]

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-500 text-xs mt-0.5">Visão geral da agência · Março 2026</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                                <s.icon size={18} className={s.color} />
                            </div>
                        </div>
                        <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                        <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Bar chart */}
                <div className="xl:col-span-2 card">
                    <h2 className="text-sm font-bold text-gray-200 mb-4">Faturado vs Meta — Clientes Ativos</h2>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={barData} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#666', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                            <Bar dataKey="Meta" fill="#333" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Faturado" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* NPS donut */}
                <div className="card flex flex-col">
                    <h2 className="text-sm font-bold text-gray-200 mb-4">NPS — Distribuição</h2>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={npsGroups}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name: _name, percent }: { name: string; percent?: number }) => percent && percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                                    labelLine={false}
                                >
                                    {npsGroups.map((_, i) => (
                                        <Cell key={i} fill={DONUT_COLORS[i]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 12, fontSize: 12 }}
                                    itemStyle={{ color: '#ccc' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-1.5 mt-2">
                            {npsGroups.map((g, i) => (
                                <div key={g.name} className="flex items-center gap-2 text-xs">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                                    <span className="text-gray-400">{g.name}</span>
                                    <span className="font-mono font-bold text-gray-200 ml-auto">{g.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent tasks */}
            <div className="card">
                <h2 className="text-sm font-bold text-gray-200 mb-4">Tarefas Atrasadas</h2>
                <div className="space-y-2">
                    {mockTarefas
                        .filter(t => t.data_vencimento && t.status !== 'Concluído' && new Date(t.data_vencimento + 'T00:00:00') < TODAY)
                        .slice(0, 5)
                        .map(t => (
                            <div key={t.id} className="flex items-center justify-between py-2 border-b border-dark-500/50 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-300">{t.titulo}</p>
                                    <p className="text-xs text-gray-600">{t.cliente_nome} · {t.responsavel}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="badge bg-red-500/20 text-red-400">
                                        {t.data_vencimento?.split('-').reverse().join('/')}
                                    </span>
                                    <span className={`badge ${t.prioridade === 'alta' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {t.prioridade}
                                    </span>
                                </div>
                            </div>
                        ))}
                    {atrasadas === 0 && <p className="text-gray-600 text-sm text-center py-4">Nenhuma tarefa atrasada 🎉</p>}
                </div>
            </div>
        </div>
    )
}
