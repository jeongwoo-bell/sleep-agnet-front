'use client'

export default function TeamPage() {
  return <Placeholder title="Team" description="팀원 관리 기능을 준비 중이에요." />
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-primary)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
        <span
          className="inline-block mt-4 text-[11px] font-medium rounded-full px-3 py-1"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)', border: '1px solid var(--border-secondary)' }}
        >
          준비 중
        </span>
      </div>
    </div>
  )
}
