import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useChatStore, type Message } from '../store/chat'
import { useAuth } from '../contexts/AuthContext'
import { API_URL } from '../lib/api'

export function useConversations() {
  const {
    conversations,
    setConversations,
    setActiveConversation,
    loadMessages,
    setThreadId,
    reset,
  } = useChatStore()
  const { token } = useAuth()

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const { conversations } = await res.json()
      setConversations(conversations || [])
    } catch (err) {
      console.error('[CONVERSATIONS] 목록 불러오기 실패:', err)
    }
  }, [setConversations, token])

  const selectConversation = useCallback(async (conversationId: string, forceRefresh = false) => {
    const state = useChatStore.getState()

    // 이미 활성 대화면 무시 (강제 새로고침 아닌 경우)
    if (state.activeConversationId === conversationId && !forceRefresh) return

    // 캐시된 메시지가 있고 처리 중이면 캐시 사용 (progress 유지)
    const cached = state.conversationMessages[conversationId]
    const isProcessing = state.processingConversationId === conversationId
    if (cached && cached.length > 0 && isProcessing && !forceRefresh) {
      setActiveConversation(conversationId)
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (conv?.thread_id) setThreadId(conv.thread_id)
      return
    }

    // DB에서 메시지 로드 — 대화 전환 + 로딩 + 메시지 비우기를 한 번에 (깜빡임 방지)
    useChatStore.setState({
      activeConversationId: conversationId,
      messages: [],
      isLoadingMessages: true,
      threadId: null,
    })
    try {
      const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const { messages: dbMessages } = await res.json()

      const mapped: Message[] = (dbMessages || []).map((m: Record<string, unknown>, i: number) => {
        const meta = (m.metadata || {}) as Record<string, unknown>
        const dbType = m.type as string | null
        let content = m.content as string

        // 이미지가 첨부됐던 메시지면 표시
        if (meta.hasImages && m.role === 'user') {
          content = content || `\u{1F4CE} \uC774\uBBF8\uC9C0 ${meta.imageCount || 1}\uC7A5 \uCCA8\uBD80`
        }

        // DB type → 프론트 type 매핑
        let frontendType: 'user' | 'bot' | 'error' = m.role === 'user' ? 'user' : 'bot'
        if (m.role === 'assistant' && (dbType === 'build_failed' || dbType === 'error')) {
          frontendType = 'error'
        }

        // build_failed는 에러 상세 포맷 복원
        if (dbType === 'build_failed' && meta.rawError) {
          content = content + '\n---detail---\n' + (meta.rawError as string)
        }

        return {
          id: (m.id as string) || `db-${i}`,
          type: frontendType,
          content,
          timestamp: new Date(m.created_at as string).getTime(),
          previewUrl: meta.previewUrl as string | undefined,
          branchName: meta.branchName as string | undefined,
          changedFiles: meta.changedFiles as string[] | undefined,
        }
      })

      loadMessages(conversationId, mapped)

      const conv = useChatStore.getState().conversations.find((c) => c.id === conversationId)
      if (conv?.thread_id) setThreadId(conv.thread_id)
    } catch (err) {
      console.error('[CONVERSATIONS] 메시지 불러오기 실패:', err)
    } finally {
      useChatStore.getState().setLoadingMessages(false)
    }
  }, [loadMessages, setActiveConversation, setThreadId])

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`${API_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status}`)
      // 삭제된 대화가 현재 활성이면 새 대화로
      if (useChatStore.getState().activeConversationId === conversationId) {
        reset()
      }
      fetchConversations()
      toast.success('대화가 삭제됐어요')
    } catch {
      toast.error('대화 삭제에 실패했어요')
    }
  }, [token, reset, fetchConversations])

  const startNewChat = useCallback(() => {
    reset()
  }, [reset])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return { conversations, fetchConversations, selectConversation, deleteConversation, startNewChat }
}
