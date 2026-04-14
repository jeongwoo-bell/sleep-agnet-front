'use client'

import { useState, useCallback } from 'react'
import { API_URL } from '@/lib/api'

export function PrButton({ branchName }: { branchName: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [prUrl, setPrUrl] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    if (state === 'done' && prUrl) {
      window.open(prUrl, '_blank')
      return
    }
    setState('loading')
    try {
      const prToken = localStorage.getItem('st-agent-token')
      const res = await fetch(`${API_URL}/pr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(prToken ? { Authorization: `Bearer ${prToken}` } : {}),
        },
        body: JSON.stringify({ branchName }),
      })
      const data = await res.json()
      if (data.prUrl) {
        setPrUrl(data.prUrl)
        setState('done')
        window.open(data.prUrl, '_blank')
      } else {
        setState('error')
        setTimeout(() => setState('idle'), 3000)
      }
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }, [branchName, state, prUrl])

  const prGreen = '#1f883d'
  const colors = {
    idle: { color: '#fff', bg: prGreen, border: prGreen },
    loading: { color: '#fff', bg: prGreen, border: prGreen },
    done: { color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-bg)', border: 'var(--accent-emerald-border)' },
    error: { color: 'var(--accent-red)', bg: 'var(--accent-red-bg)', border: 'var(--accent-red-border)' },
  }[state]

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50"
      style={{ color: colors.color, background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      {state === 'loading' ? (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="7" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
        </svg>
      )}
      {state === 'loading' ? 'PR 생성 중...' : state === 'done' ? 'PR 열기' : state === 'error' ? '실패' : 'Pull Request'}
    </button>
  )
}
