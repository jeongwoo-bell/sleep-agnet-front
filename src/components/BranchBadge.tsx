'use client'

import { useState } from 'react'

export function BranchBadge({ branchName }: { branchName: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(branchName)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 min-w-0"
      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-primary)' }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: 'var(--text-tertiary)' }}>
        <path d="M5 2.5v7M11 6.5v7M5 9.5a3 3 0 013-3h0a3 3 0 013 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="5" cy="2.5" r="1.5" fill="currentColor" />
        <circle cx="11" cy="6.5" r="1.5" fill="currentColor" />
        <circle cx="11" cy="13.5" r="1.5" fill="currentColor" />
      </svg>
      <span className="text-[11px] font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>
        {branchName}
      </span>
      <button
        onClick={handleCopy}
        className="shrink-0 cursor-pointer w-[13px] h-[13px] relative"
        onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-muted)' }}
        style={{ color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="absolute inset-0 transition-all duration-200"
          style={{ opacity: copied ? 0 : 1, transform: copied ? 'scale(0.5)' : 'scale(1)' }}
        >
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="absolute inset-0 transition-all duration-200"
          style={{ opacity: copied ? 1 : 0, transform: copied ? 'scale(1)' : 'scale(0.5)' }}
        >
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
