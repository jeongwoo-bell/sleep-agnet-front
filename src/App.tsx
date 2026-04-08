import { useEffect, useRef, useState, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useChatStore } from './store/chat'
import { useAgent } from './hooks/useAgent'
import { useConversations } from './hooks/useConversations'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput, type ChatInputHandle, type ImageAttachment } from './components/ChatInput'
import { Sidebar } from './components/Sidebar'
// ProfileMenu moved to Sidebar
import { MyPage } from './pages/MyPage'
import { ReportPage } from './pages/ReportPage'
import { API_URL } from './lib/api'

function App() {
  return (
    <Routes>
      <Route path="/*" element={<Layout />} />
    </Routes>
  )
}

function Layout() {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen)
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen)
  const isProcessing = useChatStore((s) => s.isProcessing)
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const messages = useChatStore((s) => s.messages)
  // reset은 Sidebar에서 처리
  const { send } = useAgent()
  const { fetchConversations, selectConversation } = useConversations()
  const navigate = useNavigate()
  const location = useLocation()
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)
  const [globalDrag, setGlobalDrag] = useState(false)
  const dragCountRef = useRef(0)

  const isMyPage = location.pathname === '/mypage'
  const isReportPage = location.pathname === '/report'
  const isChat = !isMyPage && !isReportPage
  // /chat/:id에서 conversationId 추출
  const conversationId = location.pathname.startsWith('/chat/') ? location.pathname.split('/chat/')[1] : undefined

  const currentBranch = messages
    .slice()
    .reverse()
    .find((m) => m.branchName)?.branchName || null

  // URL의 conversationId가 바뀌면 대화 로드 → 상태 확인 → 필요 시 폴링
  useEffect(() => {
    if (!conversationId) return
    const state = useChatStore.getState()
    // WS로 추적 중인 대화면 스킵 (이미 실시간 업데이트 중)
    if (state.processingConversationId === conversationId) return

    let cancelled = false
    let pollCount = 0
    let progressMsgId: string | null = null

    const token = localStorage.getItem('st-agent-token')
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

    const STEP_LABELS: Record<string, string> = {
      branch: '브랜치 준비', figma: '피그마 분석', image: '이미지 분석',
      analyze_image: '이미지 분석', fetch_figma: '피그마 분석',
      analyze_files: '파일 분석', check_docs: '스펙 문서 확인',
      generate_code: '코드 수정', docs: '스펙 문서 확인', analyze: '파일 분석',
      codegen: '코드 수정', build: '빌드 검증', verify: '검증',
      push: '커밋 & 푸시', deploy: '배포',
    }

    // 매 폴링 시 현재 store 상태에서 progress 메시지 재탐색 (stale 참조 방지)
    const syncProgressMsgId = () => {
      const msgs = useChatStore.getState().conversationMessages[conversationId] || []
      progressMsgId = msgs.find((m) => m.type === 'progress')?.id || null
    }

    const pollStatus = async () => {
      if (cancelled) return
      pollCount++
      if (pollCount > 150) {
        syncProgressMsgId()
        if (progressMsgId) {
          useChatStore.getState().updateMessage(progressMsgId, {
            type: 'error',
            content: '처리 시간이 초과됐어요. 페이지를 새로고침해주세요.',
            progress: undefined,
          }, conversationId)
        }
        return
      }

      // 매번 현재 store에서 progress 메시지 동기화 → selectConversation이 메시지를 교체해도 안전
      syncProgressMsgId()

      try {
        const res = await fetch(`${API_URL}/conversations/${conversationId}/status`, { headers })
        const status = await res.json()
        if (cancelled) return

        // 케이스 1: 처리 중 → 프로그레스 표시 + 계속 폴링
        if (status.processing && status.steps?.length > 0) {
          const progressSteps = status.steps
            .filter((s: Record<string, string>) => s.step !== 'classify')
            .map((s: Record<string, string>) => ({
              step: STEP_LABELS[s.step] || s.step,
              state: s.state,
              detail: s.detail || undefined,
            }))

          if (!progressMsgId) {
            progressMsgId = useChatStore.getState().addMessage({
              type: 'progress', content: '', progress: progressSteps,
            }, conversationId)
          } else {
            useChatStore.getState().updateMessage(progressMsgId, {
              progress: progressSteps,
            }, conversationId)
          }

          setTimeout(pollStatus, 2000)
          return
        }

        // 케이스 2: 완료됨 → DB에서 최신 메시지 로드
        if (!status.processing && status.completed) {
          await selectConversation(conversationId, true)
          return
        }

        // 케이스 3: 에러 → DB 리로드
        if (!status.processing && status.error) {
          await selectConversation(conversationId, true)
          return
        }

        // 케이스 4: processing 중이었다가 null이 됨 (완료 후 정리됨)
        if (!status.processing && progressMsgId) {
          await selectConversation(conversationId, true)
          return
        }

        // 케이스 5: 처음부터 처리 중 아님 → 폴링 중단
      } catch {
        if (!cancelled) setTimeout(pollStatus, 3000)
      }
    }

    // Sidebar에서 이미 로드했으면 DB 재호출 없이 바로 폴링 시작
    const currentState = useChatStore.getState()
    if (currentState.activeConversationId === conversationId) {
      syncProgressMsgId()
      pollStatus()
    } else {
      selectConversation(conversationId).then(() => {
        if (!cancelled) {
          syncProgressMsgId()
          pollStatus()
        }
      })
    }

    return () => { cancelled = true }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 전역 드래그 감지 (이미지 기능 비활성화 — 추후 활성화 시 조건 제거)
  const IMAGE_DISABLED = true
  useEffect(() => {
    if (IMAGE_DISABLED) return
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

  // handleNewChat는 Sidebar로 이동

  const handleSend = async (message: string, figmaUrl?: string, images?: ImageAttachment[]) => {
    // 새 대화면 즉시 사이드바에 표시
    const state = useChatStore.getState()
    if (!state.activeConversationId) {
      const tempId = '_new'
      const tempConv = {
        id: tempId,
        user_id: '',
        thread_id: null,
        branch_name: null,
        title: (message || '새 대화').slice(0, 60),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      state.setConversations([tempConv, ...state.conversations])
    }

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
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>이미지를 놓으세요</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>JPEG, PNG, GIF, WebP · 최대 5MB</span>
          </div>
        </div>
      )}

      <Sidebar onMyPage={() => navigate('/mypage')} />

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

            {currentBranch && isChat && (
              <BranchBadge branchName={currentBranch} />
            )}

            {isProcessing && isChat && (
              <span
                className="text-[11px] rounded-full px-2 py-0.5"
                style={{ color: 'var(--text-tertiary)', background: 'var(--bg-hover)', border: '1px solid var(--border-secondary)' }}
              >
                처리 중...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentBranch && isChat && <PrButton branchName={currentBranch} />}
          </div>
        </header>

        {/* 페이지 컨텐츠 */}
        {isMyPage ? (
          <MyPage onBack={() => navigate('/')} onReport={() => navigate('/report')} />
        ) : isReportPage ? (
          <ReportPage onBack={() => navigate('/mypage')} />
        ) : (
          <>
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-8">
                {messages.length === 0 && !isLoadingMessages && <EmptyState />}
                {isLoadingMessages && (
                  <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="text-sm">대화를 불러오는 중...</span>
                  </div>
                )}
                <div className="space-y-5">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                </div>
                <div ref={bottomRef} />
              </div>
            </main>

            <div className="px-4 pb-6 pt-2 shrink-0">
              <div className="max-w-2xl mx-auto">
                <ChatInput ref={chatInputRef} onSend={handleSend} />
                <p className="text-[11px] text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
                  SleepThera 랜딩페이지 전용 AI 에이전트
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BranchBadge({ branchName }: { branchName: string }) {
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
