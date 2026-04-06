import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore, type Conversation } from '../store/chat'
import { useConversations } from '../hooks/useConversations'
import { getDeviceId } from '../lib/device'

const API_URL = '/api'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function groupConversations(conversations: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = []
  const today: Conversation[] = []
  const week: Conversation[] = []
  const older: Conversation[] = []

  const now = new Date()
  for (const c of conversations) {
    const diff = now.getTime() - new Date(c.updated_at).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) today.push(c)
    else if (days < 7) week.push(c)
    else older.push(c)
  }

  if (today.length) groups.push({ label: '오늘', items: today })
  if (week.length) groups.push({ label: '이번 주', items: week })
  if (older.length) groups.push({ label: '이전', items: older })

  return groups
}

/** 대화 내용을 디버깅용 텍스트로 변환 — 가능한 모든 정보 포함 */
async function copyDebugLog(conv: Conversation) {
  try {
    const res = await fetch(`${API_URL}/conversations/${conv.id}/messages`)
    const { messages } = await res.json()

    const store = useChatStore.getState()
    const frontMessages = store.conversationMessages[conv.id] || []

    const lines = [
      `=== Design Agent 디버그 로그 ===`,
      ``,
      `## 대화 정보`,
      `- ID: ${conv.id}`,
      `- Thread: ${conv.thread_id || '없음'}`,
      `- Branch: ${conv.branch_name || '없음'}`,
      `- Title: ${conv.title || '없음'}`,
      `- Created: ${conv.created_at}`,
      `- Updated: ${conv.updated_at}`,
      `- Device: ${getDeviceId()}`,
      `- Active: ${store.activeConversationId === conv.id}`,
      `- Processing: ${store.processingConversationId === conv.id}`,
      ``,
      `## 프론트 상태`,
      `- 프론트 메시지 수: ${frontMessages.length}`,
      `- DB 메시지 수: ${(messages as unknown[]).length}`,
      `- isProcessing: ${store.isProcessing}`,
      `- processingConvId: ${store.processingConversationId || '없음'}`,
      ``,
      `## DB 메시지 (서버 저장)`,
      ``,
    ]

    for (const m of messages as Record<string, unknown>[]) {
      const role = m.role === 'user' ? '👤 USER' : '🤖 BOT'
      const type = m.type ? ` [${m.type}]` : ''
      const time = (m.created_at as string) || ''
      const meta = m.metadata && Object.keys(m.metadata as object).length > 0
        ? JSON.stringify(m.metadata)
        : null

      lines.push(`### ${role}${type} — ${time}`)
      lines.push(`\`\`\``)
      lines.push((m.content as string) || '(빈 내용)')
      lines.push(`\`\`\``)
      if (meta) {
        lines.push(`metadata: \`${meta}\``)
      }
      lines.push(``)
    }

    // 프론트 메시지 (DB와 다를 수 있음 — 진행 중 메시지, progress 등)
    if (frontMessages.length > 0) {
      lines.push(`## 프론트 메시지 (현재 UI 상태)`)
      lines.push(``)
      for (const m of frontMessages) {
        const role = m.type === 'user' ? '👤 USER' : m.type === 'progress' ? '⏳ PROGRESS' : m.type === 'error' ? '❌ ERROR' : '🤖 BOT'
        lines.push(`### ${role} — ${new Date(m.timestamp).toISOString()}`)

        if (m.type === 'progress' && m.progress) {
          lines.push(`steps:`)
          for (const s of m.progress) {
            lines.push(`  - [${s.state}] ${s.step}${s.detail ? ` (${s.detail})` : ''}`)
          }
        } else {
          lines.push(`\`\`\``)
          lines.push(m.content?.slice(0, 800) || '(빈 내용)')
          lines.push(`\`\`\``)
        }

        if (m.branchName) lines.push(`branch: ${m.branchName}`)
        if (m.previewUrl) lines.push(`preview: ${m.previewUrl}`)
        if (m.changedFiles?.length) lines.push(`files: ${m.changedFiles.join(', ')}`)
        lines.push(``)
      }
    }

    lines.push(`--- end of debug log ---`)

    await navigator.clipboard.writeText(lines.join('\n'))
    return true
  } catch (err) {
    console.error('[DEBUG] 복사 실패:', err)
    return false
  }
}

export function Sidebar() {
  const { sidebarOpen, activeConversationId } = useChatStore()
  const { conversations, selectConversation, startNewChat } = useConversations()
  const groups = groupConversations(conversations)

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="h-screen flex flex-col overflow-hidden shrink-0"
          style={{ background: 'var(--bg-primary)', borderRight: '1px solid var(--border-secondary)' }}
        >
          <div className="p-3">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-hover)', border: '1px solid var(--border-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.borderColor = 'var(--border-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-secondary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              새 대화
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {groups.length === 0 && (
              <div className="text-center text-xs mt-8" style={{ color: 'var(--text-muted)' }}>
                대화 기록이 없어요
              </div>
            )}

            {groups.map((group) => (
              <div key={group.label} className="mt-3 first:mt-0">
                <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {group.label}
                </div>
                {group.items.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeConversationId === conv.id}
                    onSelect={() => selectConversation(conv.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function ConversationItem({ conv, isActive, onSelect }: { conv: Conversation; isActive: boolean; onSelect: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyDebugLog(conv)
    if (ok) {
      setCopied(true)
      setTimeout(() => { setCopied(false); setMenuOpen(false) }, 1200)
    }
  }

  return (
    <div className="relative group mb-0.5">
      <button
        onClick={onSelect}
        className="w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors cursor-pointer pr-8"
        style={{
          background: isActive ? 'var(--bg-active)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }
        }}
      >
        <div className="truncate leading-snug">{conv.title || '새 대화'}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {formatDate(conv.updated_at)}
          </span>
          {conv.branch_name && (
            <span className="text-[10px] truncate max-w-[120px]" style={{ color: 'var(--accent-blue)', opacity: 0.6 }}>
              {conv.branch_name}
            </span>
          )}
        </div>
      </button>

      {/* 더보기 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md cursor-pointer"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3.5" r="1.2" fill="currentColor" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          <circle cx="8" cy="12.5" r="1.2" fill="currentColor" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-50 rounded-lg py-1 min-w-[140px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
          >
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer"
              style={{ color: copied ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  복사됨
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4V2.5A1.5 1.5 0 015.5 1h7A1.5 1.5 0 0114 2.5v7a1.5 1.5 0 01-1.5 1.5H11" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="1.5" y="5.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  디버그 로그 복사
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
