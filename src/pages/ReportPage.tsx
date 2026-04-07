import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { API_URL } from '../lib/api'

interface Props {
  onBack: () => void
}

export function ReportPage({ onBack }: Props) {
  const { token } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요')
      return
    }

    setSending(true)
    try {
      const res = await fetch(`${API_URL}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      })
      if (!res.ok) throw new Error()
      toast.success('피드백을 보냈어요!')
      setTitle('')
      setContent('')
      onBack()
    } catch {
      toast.error('전송에 실패했어요. 다시 시도해주세요.')
    }
    setSending(false)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            개발자에게 의견 보내기
          </h1>
        </div>

        {/* 폼 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="어떤 내용인가요?"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-secondary)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="버그 리포트, 기능 제안, 불편한 점 등 자유롭게 적어주세요"
              rows={6}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-secondary)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={sending || !title.trim() || !content.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
            style={{
              background: (!title.trim() || !content.trim()) ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
              color: (!title.trim() || !content.trim()) ? 'var(--text-muted)' : '#fff',
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? '보내는 중...' : '보내기'}
          </button>

          <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            jeongwoo.lee@belltherapeutics.com으로 전송됩니다
          </p>
        </div>
      </div>
    </div>
  )
}
