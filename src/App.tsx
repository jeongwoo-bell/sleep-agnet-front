import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore } from './store/chat'
import { useAgent } from './hooks/useAgent'
import { useConversations } from './hooks/useConversations'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput, type ChatInputHandle, type ImageAttachment } from './components/ChatInput'
import { Sidebar } from './components/Sidebar'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  const messages = useChatStore((s) => s.messages)
  const isProcessing = useChatStore((s) => s.isProcessing)
  const sidebarOpen = useChatStore((s) => s.sidebarOpen)
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen)
  const reset = useChatStore((s) => s.reset)
  const { send } = useAgent()
  const { fetchConversations } = useConversations()
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)
  const [globalDrag, setGlobalDrag] = useState(false)
  const dragCountRef = useRef(0)

  const currentBranch = messages
    .slice()
    .reverse()
    .find((m) => m.branchName)?.branchName || null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 전역 드래그 감지 — 페이지 어디서든 이미지를 끌면 감지
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCountRef.current++
      if (e.dataTransfer?.types.includes('Files')) setGlobalDrag(true)
    }
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCountRef.current--
      if (dragCountRef.current <= 0) { setGlobalDrag(false); dragCountRef.current = 0 }
    }
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      setGlobalDrag(false)
      dragCountRef.current = 0
      const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
      if (files.length > 0 && chatInputRef.current) {
        chatInputRef.current.addImages(files)
      }
    }
    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [])

  const handleSend = async (message: string, figmaUrl?: string, images?: ImageAttachment[]) => {
    await send(message, figmaUrl, images)
    fetchConversations()
  }

  return (
    <div className="flex h-screen w-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* 전역 드래그 오버레이 */}
      {globalDrag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '2px dashed var(--accent-blue)', boxShadow: 'var(--shadow-md)' }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent-blue)' }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              이미지를 놓으세요
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              JPEG, PNG, GIF, WebP · 최대 5MB
            </span>
          </div>
        </div>
      )}

      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        {/* 헤더 */}
        <header
          className="flex items-center justify-between px-4 h-14 sticky top-0 z-10 shrink-0 backdrop-blur-md"
          style={{ borderBottom: '1px solid var(--border-primary)', background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)' }}
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 -ml-1 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
              S
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sleep Agent</span>

            {currentBranch && (
              <div
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-primary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--text-tertiary)' }}>
                  <path d="M5 2.5v7M11 6.5v7M5 9.5a3 3 0 013-3h0a3 3 0 013 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="5" cy="2.5" r="1.5" fill="currentColor" />
                  <circle cx="11" cy="6.5" r="1.5" fill="currentColor" />
                  <circle cx="11" cy="13.5" r="1.5" fill="currentColor" />
                </svg>
                <span className="text-[11px] font-mono max-w-[200px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {currentBranch}
                </span>
              </div>
            )}

            {isProcessing && (
              <span
                className="text-[11px] rounded-full px-2 py-0.5"
                style={{ color: 'var(--text-tertiary)', background: 'var(--bg-hover)', border: '1px solid var(--border-secondary)' }}
              >
                처리 중...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {currentBranch && <PrButton branchName={currentBranch} />}
            <button
              onClick={() => { reset(); fetchConversations() }}
              className="text-xs rounded-lg px-3 py-1.5 transition-all cursor-pointer"
              style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
            >
              + 새 대화
            </button>
          </div>
        </header>

        {/* 메시지 영역 */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8">
            {messages.length === 0 && <EmptyState />}
            <div className="space-y-5">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
            </div>
            <div ref={bottomRef} />
          </div>
        </main>

        {/* 입력 */}
        <div className="px-4 pb-6 pt-2 shrink-0">
          <div className="max-w-2xl mx-auto">
            <ChatInput ref={chatInputRef} onSend={handleSend} />
            <p className="text-[11px] text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
              SleepThera 랜딩페이지 전용 AI 에이전트
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrButton({ branchName }: { branchName: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [prUrl, setPrUrl] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    if (state === 'done' && prUrl) {
      window.open(prUrl, '_blank')
      return
    }
    setState('loading')
    try {
      const res = await fetch('/api/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

function EmptyState() {
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

export default App
