import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Phone, Briefcase } from 'lucide-react'
import type { MembroTime } from '../types'
import { supabase } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import MemberModal from '../components/team/MemberModal'

function getInitials(nome: string) {
    return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const BG_COLORS = [
    'bg-blue-500/30 text-blue-300',
    'bg-purple-500/30 text-purple-300',
    'bg-green-500/30 text-green-300',
    'bg-pink-500/30 text-pink-300',
    'bg-orange-500/30 text-orange-300',
]

export default function Time() {
    const [members, setMembers] = useState<MembroTime[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<MembroTime | null>(null)

    const fetchMembers = async () => {
        setLoading(true)
        const { data } = await supabase!
            .from('membros_time')
            .select('*')
            .order('criado_em', { ascending: true })
        setMembers((data || []) as MembroTime[])
        setLoading(false)
    }

    useEffect(() => { fetchMembers() }, [])

    const openNew = () => { setEditing(null); setShowModal(true) }
    const openEdit = (m: MembroTime) => { setEditing(m); setShowModal(true) }
    const closeModal = () => { setShowModal(false); setEditing(null) }

    const handleSave = async (data: Omit<MembroTime, 'id'>) => {
        if (editing) {
            await supabase!.from('membros_time').update(data).eq('id', editing.id)
            await fetchMembers()
        }
        closeModal()
    }

    const handleSaveNew = async (data: Omit<MembroTime, 'id'> & { email: string; password: string; role: 'admin' | 'team' }) => {
        const { email, password, role, ...memberData } = data

        // Use a separate client so signUp doesn't replace the current admin session
        const tempClient = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            { auth: { storageKey: 'rc-temp-signup', persistSession: false } }
        )

        // signUp passes nome + role via metadata → DB trigger creates usuarios row automatically
        const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
            email,
            password,
            options: { data: { nome: memberData.nome, role } },
        })

        if (signUpError) throw new Error(signUpError.message)
        if (!signUpData.user) throw new Error('Falha ao criar usuário. Verifique se o e-mail já está cadastrado.')

        const newUserId = signUpData.user.id

        // Explicitly upsert usuarios record — safety net if DB trigger is missing
        await supabase!.from('usuarios').upsert({
            id: newUserId,
            email,
            nome: memberData.nome,
            role,
        }, { onConflict: 'id' })

        // Create the team display card using the admin's session
        const { error: insertError } = await supabase!.from('membros_time').insert(memberData)
        if (insertError) {
            // Auth user was created OK but member card failed — give a clear message
            throw new Error(
                `Usuário de acesso criado, mas erro ao adicionar o card do time: ${insertError.message}. ` +
                `Execute o SQL de correção de RLS no Supabase e tente adicionar o card manualmente.`
            )
        }

        await fetchMembers()
        closeModal()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este membro?')) return
        await supabase!.from('membros_time').delete().eq('id', id)
        setMembers(prev => prev.filter(m => m.id !== id))
    }

    return (
        <div className="flex flex-col h-screen">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500 bg-dark-200/50 flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white">Time</h1>
                    <p className="text-gray-500 text-xs mt-0.5">{members.length} {members.length === 1 ? 'membro' : 'membros'}</p>
                </div>
                <button onClick={openNew} className="btn-primary"><Plus size={14} /> Adicionar Membro</button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">Carregando membros...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {members.map((m, i) => (
                            <div key={m.id} className="card flex flex-col items-center text-center group hover:border-gold/20 transition-all duration-200">
                                {m.foto_url ? (
                                    <img src={m.foto_url} alt={m.nome} className="w-20 h-20 rounded-2xl object-cover mb-4 border-2 border-dark-500" />
                                ) : (
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4 ${BG_COLORS[i % BG_COLORS.length]}`}>
                                        {getInitials(m.nome)}
                                    </div>
                                )}

                                <h3 className="font-bold text-gray-200 text-sm mb-1">{m.nome}</h3>
                                {m.funcao && (
                                    <p className="flex items-center gap-1 text-xs text-gold/70 mb-2">
                                        <Briefcase size={10} />{m.funcao}
                                    </p>
                                )}
                                {m.telefone && (
                                    <p className="flex items-center gap-1 text-xs text-gray-500">
                                        <Phone size={10} />{m.telefone}
                                    </p>
                                )}

                                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <button
                                        onClick={() => openEdit(m)}
                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gold px-2.5 py-1.5 rounded-lg bg-dark-500 hover:bg-gold/10 transition-all"
                                    >
                                        <Pencil size={11} /> Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg bg-dark-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 size={11} /> Remover
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={openNew}
                            className="card border-dashed border-dark-600 flex flex-col items-center justify-center gap-2 hover:border-gold/30 hover:bg-gold/5 transition-all duration-200 min-h-[180px] cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-full bg-dark-500 flex items-center justify-center">
                                <Plus size={18} className="text-gray-500" />
                            </div>
                            <span className="text-xs text-gray-500">Adicionar Membro</span>
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <MemberModal member={editing} onSave={handleSave} onSaveNew={handleSaveNew} onClose={closeModal} />
            )}
        </div>
    )
}
