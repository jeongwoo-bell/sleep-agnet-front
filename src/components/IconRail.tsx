'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getApp, getCurrentProjectId, ALL_TOOLS, isToolSupported } from '@/lib/apps'

type IconCmp = ({ size }: { size?: number }) => React.ReactElement

const TOOL_ICONS: Record<string, IconCmp> = {
  agent: AgentIcon,
  logs: LogsIcon,
}

export function IconRail() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const projectId = getCurrentProjectId(pathname)
  const app = projectId ? getApp(projectId) : null
  const inProject = !!app

  return (
    <div
      className="h-full flex flex-col shrink-0 z-30 transition-all duration-200"
      style={{
        width: expanded ? 200 : 48,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-primary)',
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); setShowProfileMenu(false) }}
    >
      {/* 로고 */}
      <Link
        href="/"
        className="flex items-center gap-2.5 h-12 px-3 no-underline shrink-0 overflow-hidden"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        {expanded && (
          <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
            Sleep Agent
          </span>
        )}
      </Link>

      {/* 네비게이션 */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-hidden">
        {inProject ? (
          <ProjectNav projectId={projectId!} pathname={pathname} expanded={expanded} />
        ) : (
          <OrgNav pathname={pathname} expanded={expanded} />
        )}
      </nav>

      {/* 하단 프로필 */}
      <div className="relative px-1.5 pb-2" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 mt-2 cursor-pointer transition-colors overflow-hidden"
          style={{ background: showProfileMenu ? 'var(--bg-hover)' : 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={(e) => { if (!showProfileMenu) e.currentTarget.style.background = 'transparent' }}
        >
          {user?.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.picture} alt="" className="w-5 h-5 rounded-full shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: 'var(--accent-emerald-bg)', color: 'var(--accent-emerald)' }}
            >
              {user?.name?.[0] || '?'}
            </div>
          )}
          {expanded && (
            <div className="min-w-0 text-left">
              <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</div>
            </div>
          )}
        </button>

        {showProfileMenu && expanded && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
            <div
              className="absolute left-1.5 bottom-full mb-1 w-44 rounded-lg py-1 z-50"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
            >
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button
                onClick={() => { setShowProfileMenu(false); router.push('/mypage') }}
                className="w-full text-left px-3 py-1.5 text-[12px] cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                마이페이지
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); router.push('/report') }}
                className="w-full text-left px-3 py-1.5 text-[12px] cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                피드백 보내기
              </button>
              <div style={{ borderTop: '1px solid var(--border-secondary)' }}>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-1.5 text-[12px] cursor-pointer"
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
    </div>
  )
}

function OrgNav({ pathname, expanded }: { pathname: string; expanded: boolean }) {
  const items = [
    { href: '/', label: 'Projects', icon: ProjectsIcon, match: (p: string) => p === '/' || p.startsWith('/project') },
    { href: '/team', label: 'Team', icon: TeamIcon, match: (p: string) => p === '/team' },
    { href: '/settings', label: 'Settings', icon: SettingsIcon, match: (p: string) => p === '/settings' },
  ]
  return (
    <>
      {items.map((item) => {
        const isActive = item.match(pathname)
        return <NavLink key={item.href} href={item.href} label={item.label} Icon={item.icon} isActive={isActive} expanded={expanded} />
      })}
    </>
  )
}

function ProjectNav({ projectId, pathname, expanded }: { projectId: string; pathname: string; expanded: boolean }) {
  return (
    <>
      {/* 뒤로가기 */}
      <NavLink href="/" label="Projects" Icon={BackIcon} isActive={false} expanded={expanded} />
      <div className="h-px my-1.5 mx-2" style={{ background: 'var(--border-secondary)' }} />

      {ALL_TOOLS.map((tool) => {
        const Icon = TOOL_ICONS[tool.id] || AgentIcon
        const href = `/project/${projectId}/${tool.id}`
        const isActive = pathname.startsWith(href)
        const supported = isToolSupported(projectId, tool.id)
        return (
          <NavLink
            key={tool.id}
            href={supported ? href : '#'}
            label={tool.label}
            Icon={Icon}
            isActive={isActive && supported}
            expanded={expanded}
            disabled={!supported}
          />
        )
      })}
    </>
  )
}

function NavLink({
  href, label, Icon, isActive, expanded, disabled = false,
}: {
  href: string
  label: string
  Icon: IconCmp
  isActive: boolean
  expanded: boolean
  disabled?: boolean
}) {
  const commonStyle = {
    color: disabled ? 'var(--text-muted)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
    background: isActive ? 'var(--bg-active)' : 'transparent',
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
  const className = 'flex items-center gap-2.5 rounded-md px-2.5 py-2 no-underline transition-colors overflow-hidden'
  const content = (
    <>
      <div className="shrink-0 w-[18px] h-[18px] flex items-center justify-center"><Icon /></div>
      {expanded && (
        <span className="text-[13px] font-medium whitespace-nowrap flex items-center gap-1.5">
          {label}
          {disabled && <span className="text-[9px] font-normal" style={{ color: 'var(--text-muted)' }}>· unsupported</span>}
        </span>
      )}
    </>
  )

  if (disabled) {
    return (
      <div className={className} style={commonStyle} title={`${label}은(는) 이 프로젝트에서 지원되지 않아요`}>
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={className}
      style={commonStyle}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
    >
      {content}
    </Link>
  )
}

function AgentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M9 3v18" /><path d="M3 9h6" /><path d="M3 15h6" />
    </svg>
  )
}

function LogsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function TeamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}
