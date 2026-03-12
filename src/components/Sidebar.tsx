import React, { createContext, useContext, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, UserCheck, TrendingUp, LogOut, Building2, NotebookPen, PanelLeftClose, PanelLeftOpen, BarChart3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ── Context para expor o estado collapsed ao Layout ──────────────────────────
interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true' } catch { return false }
  })

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    try { localStorage.setItem('sidebar_collapsed', String(v)) } catch {}
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}

// ── Componente Sidebar ────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { collapsed, setCollapsed } = useSidebar()

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const navItems = [
    { to: '/tarefas', icon: CheckSquare, label: 'Tarefas', adminOnly: false },
    { to: '/clientes', icon: Building2, label: 'Clientes', adminOnly: false },
    { to: '/reunioes', icon: NotebookPen, label: 'Reuniões', adminOnly: false },
    { to: '/relatoriosia', icon: BarChart3, label: 'Relatórios IA', adminOnly: false },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
    { to: '/time', icon: UserCheck, label: 'Time', adminOnly: true },
    { to: '/crm', icon: TrendingUp, label: 'CRM', adminOnly: true },
  ]

  const visibleItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin')

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
      className="bg-dark-200 border-r border-dark-500 flex flex-col h-screen sticky top-0"
    >
      {/* Header: logo + botão toggle — sempre visível */}
      <div
        className="border-b border-dark-500 flex items-center"
        style={{
          minHeight: 64,
          padding: collapsed ? '0 12px' : '0 12px 0 16px',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
        }}
      >
        {/* Logo RC — sempre visível */}
        <div className="w-9 h-9 bg-dark-400 border border-gold/40 rounded-lg flex items-center justify-center rotate-45 flex-shrink-0">
          <span className="font-bold text-gold text-sm -rotate-45" style={{ fontFamily: 'Nunito' }}>RC</span>
        </div>

        {/* Nome — some quando collapsed */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">RC Digital</p>
            <p className="text-gray-500 text-xs">Gestão</p>
          </div>
        )}

        {/* Botão toggle — SEMPRE visível */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
          className="flex-shrink-0 text-gray-500 hover:text-gold transition-colors rounded-lg p-1.5 hover:bg-dark-400"
        >
          {collapsed
            ? <PanelLeftOpen size={15} />
            : <PanelLeftClose size={15} />
          }
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {visibleItems.map(({ to, icon: Icon, label, adminOnly }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item-inactive'}
            style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '8px' : undefined }}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
            {!collapsed && adminOnly && (
              <span className="ml-auto text-[9px] font-bold text-gold/60 uppercase tracking-wider">Admin</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-2 border-t border-dark-500">
        {!collapsed ? (
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
        ) : (
          <div className="flex justify-center mb-2">
            <div
              className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center"
              title={user?.nome}
            >
              <span className="text-gold font-bold text-xs">
                {user?.nome?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sair' : undefined}
          className="w-full flex items-center gap-2 px-2 py-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 text-xs font-medium"
          style={{ justifyContent: collapsed ? 'center' : undefined }}
        >
          <LogOut size={13} />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  )
}
