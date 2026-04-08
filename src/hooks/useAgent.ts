import { useRef, useCallback } from 'react'
import { useChatStore, type ProgressStep } from '../store/chat'
import { useAuth } from '../contexts/AuthContext'
import type { ImageAttachment } from '../components/ChatInput'
import { API_URL, WS_URL } from '../lib/api'

const STEP_LABELS: Record<string, string> = {
  classify: '요청 분석',
  branch: '브랜치 준비',
  figma: '피그마 분석',
  image: '이미지 분석',
  docs: '스펙 문서 확인',
  analyze: '파일 분석',
  codegen: '코드 수정',
  build: '빌드 검증',
  push: '커밋 & 푸시',
  deploy: '배포',
}

export function useAgent() {
  const wsRef = useRef<WebSocket | null>(null)
  const store = useChatStore
  const { token } = useAuth()

  const send = useCallback(async (message: string, figmaUrl?: string, images?: ImageAttachment[]) => {
    const state = store.getState()
    const { addMessage, updateMessage, setProcessing } = state

    const conversationId = state.activeConversationId || '_new'
    if (state.processingConversationId === conversationId) return

    setProcessing(true, conversationId)

    // 사용자 메시지 추가
    addMessage({
      type: 'user',
      content: message,
      images: images?.map((img) => `data:${img.mediaType};base64,${img.base64}`),
    }, conversationId)

    // 봇 메시지 (로딩 표시용) 미리 생성
    const botMsgId = addMessage({
      type: 'progress',
      content: '',
      progress: [],
    }, conversationId)

    try {
      const res = await fetch(`${API_URL}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          threadId: state.threadId,
          figmaUrl,
          images: images?.map((img) => ({ base64: img.base64, mediaType: img.mediaType })),
          chatHistory: (state.conversationMessages[conversationId] || [])
            .filter((m) => m.type === 'user' || m.type === 'bot')
            .slice(-10)
            .map((m) => `${m.type === 'user' ? '사용자' : '봇'}: ${m.content}`),
        }),
      })

      const { requestId } = await res.json()

      // WebSocket 구독 — conversationId를 클로저에 캡처
      await subscribeAndWait(requestId, botMsgId, conversationId)
    } catch (err) {
      updateMessage(botMsgId, {
        type: 'error',
        content: `요청 중 오류가 발생했어요: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
        progress: undefined,
      }, conversationId)
    } finally {
      setProcessing(false)
      // WS 끝난 후 현재 대화가 아직 활성이면 DB에서 최신 상태 로드
      const currentState = store.getState()
      const activeId = currentState.activeConversationId
      if (activeId && !activeId.startsWith('_new')) {
        setTimeout(() => {
          // 유저가 이미 다른 대화로 전환했으면 스킵 (UI 강제 전환 방지)
          const stillActive = store.getState().activeConversationId === activeId
          if (!stillActive) return

          fetch(`${API_URL}/conversations/${activeId}/messages`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('st-agent-token') || ''}` },
          })
            .then((r) => r.json())
            .then(({ messages: dbMessages }) => {
              // 로드 시점에도 다시 확인
              if (store.getState().activeConversationId !== activeId) return
              if (dbMessages?.length > 0) {
                const { loadMessages } = store.getState()
                const mapped = dbMessages.map((m: Record<string, unknown>, i: number) => {
                  const meta = (m.metadata || {}) as Record<string, unknown>
                  let frontendType: 'user' | 'bot' | 'error' = m.role === 'user' ? 'user' : 'bot'
                  if (m.role === 'assistant' && (m.type === 'build_failed' || m.type === 'error')) frontendType = 'error'
                  let content = m.content as string
                  if (m.type === 'build_failed' && meta.rawError) content += '\n---detail---\n' + (meta.rawError as string)
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
                loadMessages(activeId, mapped)
              }
            })
            .catch(() => {})
        }, 2000)
      }
    }
  }, [])

  const subscribeAndWait = useCallback((requestId: string, botMsgId: string, conversationId: string): Promise<void> => {
    return new Promise((resolve) => {
      let progressMsgId = botMsgId

      // 모든 업데이트는 캡처된 conversationId 기준
      const update = (id: string, updates: Partial<Record<string, unknown>>) => {
        store.getState().updateMessage(id, updates, conversationId)
      }
      const add = (msg: Parameters<ReturnType<typeof useChatStore.getState>['addMessage']>[0]) => {
        return store.getState().addMessage(msg, conversationId)
      }

      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', requestId }))
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data)
          console.log(`[WS] ${msg.type}:`, msg.data ? JSON.stringify(msg.data).slice(0, 120) : '')

          if (msg.type === 'stream') {
            const messages = store.getState().conversationMessages[conversationId] || []
            const currentMsg = messages.find((m) => m.id === botMsgId)
            const currentContent = currentMsg?.content || ''
            update(botMsgId, {
              type: 'bot',
              content: currentContent + (msg.data?.delta || ''),
              progress: undefined,
            })
          }

          if (msg.type === 'stream_end') {
            progressMsgId = add({
              type: 'progress',
              content: '',
              progress: [],
            })
          }

          if (msg.type === 'plan') {
            // 서버에서 전체 계획이 왔음 → 모든 step을 pending으로 한번에 표시
            const planSteps = (msg.data?.steps || [])
              .filter((s: string) => s !== 'classify')
              .map((s: string) => ({
                step: STEP_LABELS[s] || s,
                state: 'pending' as const,
              }))

            if (progressMsgId && progressMsgId !== botMsgId) {
              update(progressMsgId, { type: 'progress', progress: planSteps })
            } else {
              progressMsgId = add({ type: 'progress', content: '', progress: planSteps })
            }
          }

          if (msg.type === 'progress' || msg.type === 'status') {
            const { step, state } = msg.data
            if (step === 'classify') return
            const label = STEP_LABELS[step] || step

            // stream_end가 아직 안 왔으면 새 progress 메시지 자동 생성
            const messages = store.getState().conversationMessages[conversationId] || []
            const currentProgressMsg = messages.find((m) => m.id === progressMsgId)
            if (progressMsgId === botMsgId && currentProgressMsg?.type === 'bot') {
              progressMsgId = add({
                type: 'progress',
                content: '',
                progress: [],
              })
            }

            const latestMessages = store.getState().conversationMessages[conversationId] || []
            const currentMsg = latestMessages.find((m) => m.id === progressMsgId)
            update(progressMsgId, {
              type: 'progress',
              progress: updateProgressSteps(
                currentMsg?.progress || [],
                { step: label, state },
              ),
            })
          }

          if (msg.type === 'complete') {
            const data = msg.data
            if (data.threadId) {
              store.getState().setThreadId(data.threadId)

              // _new → 실제 conversationId로 마이그레이션
              if (conversationId.startsWith('_new')) {
                // 서버에서 돌아온 conversations를 다시 fetch해서 매칭
                fetch(`${API_URL}/conversations`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  })
                  .then((r) => r.json())
                  .then(({ conversations }) => {
                    const match = conversations?.find((c: Record<string, unknown>) => c.thread_id === data.threadId)
                    if (match) {
                      store.getState().migrateConversation(conversationId, match.id)
                      store.getState().setConversations(conversations)
                      // URL을 /chat/:id로 업데이트 (새로고침 없이)
                      window.history.replaceState(null, '', `/chat/${match.id}`)
                    }
                  })
                  .catch(() => {})
              }
            }
            handleResult(data, progressMsgId, (id, updates) => update(id, updates))
            ws.close()
            resolve()
          }

          if (msg.type === 'error') {
            const errorContent = msg.data?.error || '알 수 없는 오류'
            const rawError = msg.data?.rawError
            const canRetry = msg.data?.canRetry
            const fullContent = rawError
              ? `${errorContent}${canRetry ? '\n\n같은 요청을 다시 보내면 재시도할 수 있어요.' : ''}\n---detail---\n${rawError}`
              : `${errorContent}${canRetry ? '\n\n같은 요청을 다시 보내면 재시도할 수 있어요.' : ''}`

            // 프로그레스 스텝의 현재 진행 중인 것을 에러로 표시
            const latestMsgs = store.getState().conversationMessages[conversationId] || []
            const currentProgressMsg = latestMsgs.find((m) => m.id === progressMsgId)
            if (currentProgressMsg?.progress?.length) {
              const updatedSteps = currentProgressMsg.progress.map((s) =>
                s.state === 'start' ? { ...s, state: 'error' as const } : s
              )
              update(progressMsgId, { progress: updatedSteps })
            }

            // 에러 메시지를 별도로 추가
            add({ type: 'error', content: fullContent })
            ws.close()
            resolve()
          }
        }

        ws.onerror = () => {
          // WS 실패해도 서버에서 처리는 계속됨 → 폴링으로 복구 가능
          console.warn('[WS] 연결 실패 — 폴링으로 전환됨')
          resolve()
        }

        ws.onclose = () => {
          // WS가 complete 없이 닫힌 경우 → 폴링이 나머지 처리
          console.warn('[WS] 연결 종료')
          resolve()
        }

        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close()
          }
          resolve()
        }, 300000)
      } catch {
        resolve()
      }
    })
  }, [])

  return { send }
}

function handleResult(
  data: Record<string, unknown>,
  botMsgId: string,
  updateMessage: (id: string, updates: Record<string, unknown>) => void,
) {
  switch (data.type) {
    case 'talk':
    case 'ask':
      updateMessage(botMsgId, {
        type: 'bot',
        content: data.message as string,
        progress: undefined,
      })
      break

    case 'success':
      updateMessage(botMsgId, {
        type: 'bot',
        content: data.summary as string,
        previewUrl: data.previewUrl as string | undefined,
        branchName: data.branchName as string | undefined,
        changedFiles: data.changedFiles as string[] | undefined,
      })
      break

    case 'already_implemented':
      updateMessage(botMsgId, {
        type: 'bot',
        content: `이미 구현되어 있어요!\n\n${(data.implemented as string[])?.map((i: string) => `• ${i}`).join('\n')}`,
        progress: undefined,
      })
      break

    case 'no_changes':
    case 'apply_failed':
    case 'unclear':
      updateMessage(botMsgId, {
        type: 'bot',
        content: data.message as string,
        progress: undefined,
      })
      break

    case 'build_failed':
      updateMessage(botMsgId, {
        type: 'error',
        content: data.errorSummary
          ? `${data.errorSummary}\n---detail---\n${data.error}`
          : `빌드에 실패했어요.\n---detail---\n${data.error}`,
        progress: undefined,
      })
      break

    default:
      updateMessage(botMsgId, {
        type: 'bot',
        content: typeof data.message === 'string' ? data.message : JSON.stringify(data),
        progress: undefined,
      })
  }
}

function updateProgressSteps(current: ProgressStep[], update: ProgressStep): ProgressStep[] {
  const existing = current.find((p) => p.step === update.step)
  if (existing) {
    return current.map((p) => (p.step === update.step ? { ...p, ...update } : p))
  }
  return [...current, update]
}
