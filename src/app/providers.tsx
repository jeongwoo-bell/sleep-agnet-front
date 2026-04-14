'use client'

import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeInitializer } from '@/lib/theme'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeInitializer />
      <AuthProvider>
        {children}
      </AuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            boxShadow: 'var(--shadow-md)',
            fontSize: '13px',
          },
        }}
        theme="system"
      />
    </>
  )
}
