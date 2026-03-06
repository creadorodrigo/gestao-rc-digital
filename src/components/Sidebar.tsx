import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Users, UserCheck, TrendingUp, LogOut, Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()

    const handleSignOut = () => {
        signOut()
        navigate('/')
    }

    const navItems = [
        { to: '/tarefas', icon: CheckSquare, label: 'Tarefas', adminOnly: false },
        { to: '/clientes', icon: Building2, label: 'Clientes', adminOnly: false },
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
        { to: '/time', icon: UserCheck, label: 'Time', adminOnly: true },
        { to: '/crm', icon: TrendingUp, label: 'CRM', adminOnly: true },
    ]

    const visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin')

    return (
        <aside className="w-60 bg-dark-200 border-r border-dark-500 flex flex-col h-screen sticky top-0">
            {/* Logo */}
            <div className="p-5 border-b border-dark-500">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-dark-400 border border-gold/40 rounded-lg flex items-center justify-center rotate-45 flex-shrink-0">
                        <span className="font-bold text-gold text-sm -rotate-45" style={{ fontFamily: 'Nunito' }}>RC</span>
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm leading-tight">RC Digital</p>
                        <p className="text-gray-500 text-xs">Gestão</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {visibleItems.map(({ to, icon: Icon, label, adminOnly }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item-inactive'}
                    >
                        <Icon size={16} className="flex-shrink-0" />
                        <span>{label}</span>
                        {adminOnly && (
                            <span className="ml-auto text-[9px] font-bold text-gold/60 uppercase tracking-wider">Admin</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User footer */}
            <div className="p-3 border-t border-dark-500">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-dark-300 mb-2">
                    <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-gold font-bold text-xs">
                            {user?.nome?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-gray-200 text-xs font-semibold truncate">{user?.nome}</p>
                        <p className="text-gray-500 text-[10px] capitalize">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 text-xs font-medium"
                >
                    <LogOut size={13} />
                    Sair
                </button>
            </div>
        </aside>
    )
}
