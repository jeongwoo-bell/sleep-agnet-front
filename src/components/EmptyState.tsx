'use client'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center pt-32 pb-16">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'var(--accent-blue-bg)', border: '1px solid var(--border-secondary)' }}
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600" />
      </div>
      <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>무엇을 도와드릴까요?</h2>
      <p className="text-sm max-w-sm text-center leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        SleepThera 랜딩페이지의 UI를 자연어로 수정할 수 있어요.<br />
        피그마 링크를 첨부하면 디자인 기반으로 구현합니다.
      </p>

      <div className="grid grid-cols-2 gap-2 mt-8 w-full max-w-md">
        {[
          'Hero 섹션 타이틀 크기 키워줘',
          'FAQ 아코디언 추가해줘',
          'CTA 버튼 색상 바꿔줘',
          '모바일 반응형 수정해줘',
        ].map((example) => (
          <button
            key={example}
            className="text-left text-xs rounded-xl px-3.5 py-2.5 transition-all cursor-pointer"
            style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-secondary)' }}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}
