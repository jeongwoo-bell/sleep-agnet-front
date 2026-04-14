'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { TopNav } from '@/components/TopNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <TopNav />
        <div className="flex flex-1 min-h-0">
          {children}
        </div>
      </div>
    </AuthGuard>
  )
}
