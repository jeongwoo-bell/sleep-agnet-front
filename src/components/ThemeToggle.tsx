'use client'

import { useState } from 'react'
import { type Theme, getStoredTheme, setStoredTheme, applyTheme } from '../lib/theme'

const THEMES: { value: Theme; icon: React.ReactNode }[] = [
  {
    value: 'system',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 14h5M8 11v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.7 3.7l1 1M11.3 11.3l1 1M3.7 12.3l1-1M11.3 4.7l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M13.5 9.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const INDICATOR_COLOR = '#a78bfa' // 연보라색

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const activeIndex = THEMES.findIndex((t) => t.value === theme)

  const select = (t: Theme) => {
    if (t === theme) return
    setTheme(t)
    setStoredTheme(t)
    applyTheme(t)
  }

  return (
    <div
      className="relative flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}
    >
      {/* 슬라이딩 인디케이터 — 연보라색 */}
      <div
        className="absolute top-0.5 h-[calc(100%-4px)] rounded-md"
        style={{
          width: 'calc((100% - 4px) / 3)',
          left: `calc(2px + ${activeIndex} * (100% - 4px) / 3)`,
          background: INDICATOR_COLOR,
          boxShadow: `0 1px 4px ${INDICATOR_COLOR}40`,
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {THEMES.map((t) => (
        <button
          key={t.value}
          onClick={() => select(t.value)}
          className="relative z-10 flex items-center justify-center w-7 h-6 rounded-md cursor-pointer"
          style={{
            color: theme === t.value ? '#ffffff' : 'var(--text-muted)',
            transition: 'color 0.3s ease',
          }}
          title={t.value === 'system' ? '시스템' : t.value === 'light' ? '라이트' : '다크'}
        >
          {t.icon}
        </button>
      ))}
    </div>
  )
}
