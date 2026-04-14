'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '@/store/chat'
import { useAgent } from '@/hooks/useAgent'
import { useConversations } from '@/hooks/useConversations'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput, type ChatInputHandle, type ImageAttachment } from '@/components/ChatInput'
import { EmptyState } from '@/components/EmptyState'
import { API_URL } from '@/lib/api'

interface Props {
  conversationId?: string
}

export function ChatView({ conversationId }: Props) {
  const messages = useChatStore((s) => s.messages)
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages)
  const { send } = useAgent()
  const { fetchConversations, selectConversation } = useConversations()
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)

  // conversationId 변경 시 대화 로드 + 폴링
  useEffect(() => {
    if (!conversationId) return
    const state = useChatStore.getState()
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

      syncProgressMsgId()

      try {
        const res = await fetch(`${API_URL}/conversations/${conversationId}/status`, { headers })
        const status = await res.json()
        if (cancelled) return

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

        if (!status.processing && status.completed) {
          await selectConversation(conversationId, true)
          return
        }

        if (!status.processing && status.error) {
          await selectConversation(conversationId, true)
          return
        }

        if (!status.processing && progressMsgId) {
          await selectConversation(conversationId, true)
          return
        }
      } catch {
        if (!cancelled) setTimeout(pollStatus, 3000)
      }
    }

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
  }, [conversationId, selectConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (message: string, figmaUrl?: string, images?: ImageAttachment[]) => {
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
    <>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: 'var(--text-muted)', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-5">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="px-4 pb-6 pt-2 shrink-0">
        <div className="max-w-2xl mx-auto">
          <ChatInput ref={chatInputRef} onSend={handleSend} />
          <p className="text-[11px] text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
            SleepThera 개발팀 AI 에이전트
          </p>
        </div>
      </div>
    </>
  )
}
