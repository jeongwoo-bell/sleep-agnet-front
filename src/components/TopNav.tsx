'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { href: '/agent', label: 'Agent', icon: AgentIcon },
  { href: '/logs', label: 'Logs', icon: LogsIcon },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <header
      className="flex items-center justify-between h-12 px-4 shrink-0 z-20"
      style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}
    >
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Sleep Agent
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium no-underline transition-colors"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-tertiary)' }}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Right: Profile */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer"
          style={{ background: showMenu ? 'var(--bg-hover)' : 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => { if (!showMenu) e.currentTarget.style.background = 'transparent' }}
        >
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--accent-emerald-bg)', color: 'var(--accent-emerald)' }}
            >
              {user?.name?.[0] || '?'}
            </div>
          )}
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-lg py-1 z-40"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
            >
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button
                onClick={() => { setShowMenu(false); router.push('/mypage') }}
                className="w-full text-left px-3 py-2 text-[12px] cursor-pointer transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                마이페이지
              </button>
              <button
                onClick={() => { setShowMenu(false); router.push('/report') }}
                className="w-full text-left px-3 py-2 text-[12px] cursor-pointer transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                피드백 보내기
              </button>
              <div style={{ borderTop: '1px solid var(--border-secondary)' }}>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-[12px] cursor-pointer transition-colors"
                  style={{ color: 'var(--accent-red)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  로그아웃
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

function AgentIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" /><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M2 12h20" /><path d="M12 2v20" />
    </svg>
  )
}

function LogsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}
