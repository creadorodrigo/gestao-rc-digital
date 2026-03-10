import React from 'react'
import Sidebar, { SidebarProvider } from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: '#0A0A0A' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
