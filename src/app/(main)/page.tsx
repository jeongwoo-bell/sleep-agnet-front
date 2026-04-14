'use client'

import Link from 'next/link'

const TOOLS = [
  {
    href: '/agent',
    title: 'AI Agent',
    description: '자연어로 SleepThera 랜딩페이지 UI를 수정하고, 피그마 디자인을 코드로 구현합니다.',
    icon: AgentIcon,
    color: '#3ECF8E',
  },
  {
    href: '/logs',
    title: 'Logs',
    description: '유저 행동 로그와 서버 로그를 통합 조회하고, 에러 원인을 추적합니다.',
    icon: LogsIcon,
    color: '#60a5fa',
    badge: 'Coming soon',
  },
]

export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            개발팀 도구
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            AI 에이전트와 디버깅 도구로 개발 워크플로우를 가속합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group block rounded-xl p-5 transition-all no-underline"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${tool.color}15`, color: tool.color }}
                >
                  <tool.icon />
                </div>
                {tool.badge && (
                  <span
                    className="text-[10px] font-medium rounded-full px-2 py-0.5"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)', border: '1px solid var(--border-secondary)' }}
                  >
                    {tool.badge}
                  </span>
                )}
              </div>
              <h2 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {tool.title}
              </h2>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function AgentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" /><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M2 12h20" /><path d="M12 2v20" />
    </svg>
  )
}

function LogsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}
