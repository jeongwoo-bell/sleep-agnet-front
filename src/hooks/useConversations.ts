import { useCallback, useEffect } from 'react'
import { useChatStore, type Message } from '../store/chat'
import { getDeviceId } from '../lib/device'

const API_URL = '/api'

export function useConversations() {
  const {
    conversations,
    setConversations,
    setActiveConversation,
    loadMessages,
    setThreadId,
    reset,
  } = useChatStore()

  const fetchConversations = useCallback(async () => {
    try {
      const deviceId = getDeviceId()
      const res = await fetch(`${API_URL}/conversations?deviceId=${deviceId}`)
      const { conversations } = await res.json()
      setConversations(conversations || [])
    } catch (err) {
      console.error('[CONVERSATIONS] 목록 불러오기 실패:', err)
    }
  }, [setConversations])

  const selectConversation = useCallback(async (conversationId: string) => {
    const state = useChatStore.getState()

    // 이미 활성 대화면 무시
    if (state.activeConversationId === conversationId) return

    // 캐시된 메시지가 있으면 API 호출 스킵
    const cached = state.conversationMessages[conversationId]
    if (cached && cached.length > 0) {
      setActiveConversation(conversationId)
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (conv?.thread_id) setThreadId(conv.thread_id)
      return
    }

    // 처음 로드하는 대화만 fetch
    try {
      const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`)
      const { messages: dbMessages } = await res.json()

      const mapped: Message[] = (dbMessages || []).map((m: Record<string, unknown>, i: number) => ({
        id: (m.id as string) || `db-${i}`,
        type: m.role === 'user' ? 'user' : 'bot',
        content: m.content as string,
        timestamp: new Date(m.created_at as string).getTime(),
        previewUrl: (m.metadata as Record<string, unknown>)?.previewUrl as string | undefined,
        branchName: (m.metadata as Record<string, unknown>)?.branchName as string | undefined,
        changedFiles: (m.metadata as Record<string, unknown>)?.changedFiles as string[] | undefined,
      }))

      loadMessages(conversationId, mapped)
      setActiveConversation(conversationId)

      const conv = useChatStore.getState().conversations.find((c) => c.id === conversationId)
      if (conv?.thread_id) setThreadId(conv.thread_id)
    } catch (err) {
      console.error('[CONVERSATIONS] 메시지 불러오기 실패:', err)
    }
  }, [loadMessages, setActiveConversation, setThreadId])

  const startNewChat = useCallback(() => {
    reset()
  }, [reset])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return { conversations, fetchConversations, selectConversation, startNewChat }
}
