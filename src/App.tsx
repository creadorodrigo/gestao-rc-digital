import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tarefas from './pages/Tarefas'
import Clientes from './pages/Clientes'
import RelatoriosIA from './pages/RelatoriosIA'
import Time from './pages/Time'
import CRM from './pages/CRM'
import Reunioes from './pages/Reunioes'

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  if (requiredRole && user.role !== requiredRole) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-200 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500">Esta área é exclusiva para administradores.</p>
      </div>
    </Layout>
  )
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/dashboard' : '/tarefas'} replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>} />
      <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/reunioes" element={<ProtectedRoute><Reunioes /></ProtectedRoute>} />
      <Route path="/relatorios-ia" element={<ProtectedRoute><RelatoriosIA /></ProtectedRoute>} />
      <Route path="/time" element={<ProtectedRoute requiredRole="admin"><Time /></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute requiredRole="admin"><CRM /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
