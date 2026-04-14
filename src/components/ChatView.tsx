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
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const { send } = useAgent()
  const { fetchConversations, selectConversation } = useConversations()
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)

  // conversationId와 store가 아직 동기화 안 됐으면 즉시 스켈레톤 (useEffect 전)
  const isStale = !!conversationId && activeConversationId !== conversationId

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
          {isLoadingMessages || isStale ? (
            <ChatSkeleton />
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

function ChatSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* 유저 메시지 스켈레톤 */}
      <div className="flex justify-end">
        <div className="rounded-2xl rounded-br-sm px-4 py-3 w-48" style={{ background: 'var(--bg-hover)' }}>
          <div className="h-3 rounded-full w-full" style={{ background: 'var(--border-secondary)' }} />
        </div>
      </div>
      {/* 봇 메시지 스켈레톤 */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-xl shrink-0" style={{ background: 'var(--bg-hover)' }} />
        <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex-1 max-w-[70%] space-y-2" style={{ background: 'var(--bg-hover)' }}>
          <div className="h-3 rounded-full w-full" style={{ background: 'var(--border-secondary)' }} />
          <div className="h-3 rounded-full w-4/5" style={{ background: 'var(--border-secondary)' }} />
          <div className="h-3 rounded-full w-3/5" style={{ background: 'var(--border-secondary)' }} />
        </div>
      </div>
      {/* 유저 메시지 스켈레톤 2 */}
      <div className="flex justify-end">
        <div className="rounded-2xl rounded-br-sm px-4 py-3 w-36" style={{ background: 'var(--bg-hover)' }}>
          <div className="h-3 rounded-full w-full" style={{ background: 'var(--border-secondary)' }} />
        </div>
      </div>
      {/* 봇 메시지 스켈레톤 2 */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-xl shrink-0" style={{ background: 'var(--bg-hover)' }} />
        <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex-1 max-w-[60%] space-y-2" style={{ background: 'var(--bg-hover)' }}>
          <div className="h-3 rounded-full w-full" style={{ background: 'var(--border-secondary)' }} />
          <div className="h-3 rounded-full w-2/3" style={{ background: 'var(--border-secondary)' }} />
        </div>
      </div>
    </div>
  )
}
