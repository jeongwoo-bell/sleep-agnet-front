'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { IconRail } from '@/components/IconRail'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <IconRail />
        <div className="flex flex-1 min-w-0">
          {children}
        </div>
      </div>
    </AuthGuard>
  )
}
