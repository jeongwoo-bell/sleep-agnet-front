'use client'

export default function LogsPage() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(96, 165, 250, 0.1)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          로그 조회 도구
        </h2>
        <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-tertiary)' }}>
          유저 행동 로그와 서버 로그를 통합 조회하는 도구를 준비하고 있어요.
        </p>
        <span
          className="inline-block mt-4 text-[11px] font-medium rounded-full px-3 py-1"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)', border: '1px solid var(--border-secondary)' }}
        >
          DEV-19 · 개발 중
        </span>
      </div>
    </div>
  )
}
