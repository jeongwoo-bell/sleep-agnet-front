'use client'

import Link from 'next/link'
import { APPS, ORG_NAME, type App } from '@/lib/apps'

export default function ProjectsPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>{ORG_NAME}</div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Projects</h1>
          </div>
          <button
            disabled
            className="flex items-center gap-1.5 text-[13px] font-medium rounded-md px-3 py-1.5 cursor-not-allowed"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-primary)',
            }}
            title="추후 지원 예정"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New project
          </button>
        </div>

        {/* 프로젝트 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {APPS.map((app) => (
            <ProjectCard key={app.id} app={app} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ app }: { app: App }) {
  return (
    <Link
      href={`/project/${app.id}`}
      className="group block rounded-xl p-4 no-underline transition-all h-[120px] flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)' }}
    >
      <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {app.name}
      </h3>
      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        {app.description}
      </p>
    </Link>
  )
}
