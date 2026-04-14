'use client'

import { usePathname } from 'next/navigation'
import { useChatStore } from '@/store/chat'
import { AuthGuard } from '@/components/AuthGuard'
import { Sidebar } from '@/components/Sidebar'
import { BranchBadge } from '@/components/BranchBadge'
import { PrButton } from '@/components/PrButton'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MainShell>{children}</MainShell>
    </AuthGuard>
  )
}

function MainShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen)
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen)
  const isProcessing = useChatStore((s) => s.isProcessing)
  const messages = useChatStore((s) => s.messages)
  const pathname = usePathname()

  const isChat = !pathname.startsWith('/mypage') && !pathname.startsWith('/report')

  const currentBranch = messages
    .slice()
    .reverse()
    .find((m) => m.branchName)?.branchName || null

  return (
    <div className="flex h-screen w-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="flex items-center justify-between px-4 h-14 sticky top-0 z-10 shrink-0 backdrop-blur-md"
          style={{ borderBottom: '1px solid var(--border-primary)', background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)' }}
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 -ml-1 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {currentBranch && isChat && <BranchBadge branchName={currentBranch} />}

            {isProcessing && isChat && (
              <span
                className="text-[11px] rounded-full px-2 py-0.5"
                style={{ color: 'var(--text-tertiary)', background: 'var(--bg-hover)', border: '1px solid var(--border-secondary)' }}
              >
                처리 중...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentBranch && isChat && <PrButton branchName={currentBranch} />}
          </div>
        </header>

        <div className="flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}
