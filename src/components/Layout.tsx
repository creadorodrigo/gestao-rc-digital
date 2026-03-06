import React from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-dark">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
