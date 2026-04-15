'use client'

import { use } from 'react'
import Link from 'next/link'
import { getApp, ORG_NAME } from '@/lib/apps'

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const app = getApp(projectId)

  if (!app) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-red-bg)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            프로젝트를 찾을 수 없어요
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            <code className="text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>{projectId}</code> 프로젝트가 존재하지 않습니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] rounded-md px-3 py-1.5 no-underline"
            style={{ color: 'var(--accent-emerald)', background: 'var(--accent-emerald-bg)', border: '1px solid var(--accent-emerald-border)' }}
          >
            ← 프로젝트 목록으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Breadcrumb bar */}
      <div
        className="flex items-center gap-2 h-11 px-4 shrink-0 text-[12px]"
        style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}
      >
        <Link
          href="/"
          className="no-underline transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          {ORG_NAME}
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{app.name}</span>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">{children}</div>
    </div>
  )
}
