import { create } from 'zustand'

export type MessageType = 'user' | 'bot' | 'progress' | 'error'

export interface ProgressStep {
  step: string
  state: 'pending' | 'start' | 'done' | 'error'
  detail?: string
}

export interface Message {
  id: string
  type: MessageType
  content: string
  timestamp: number
  previewUrl?: string
  branchName?: string
  changedFiles?: string[]
  progress?: ProgressStep[]
  images?: string[] // 첨부 이미지 base64 data URL
}

export interface Conversation {
  id: string
  user_id: string
  thread_id: string | null
  branch_name: string | null
  title: string | null
  created_at: string
  updated_at: string
}

interface ChatState {
  // 대화별 독립 메시지 저장소
  conversationMessages: Record<string, Message[]>
  activeConversationId: string | null
  threadId: string | null
  isProcessing: boolean
  isLoadingMessages: boolean
  // 어떤 대화가 처리 중인지 추적
  processingConversationId: string | null
  conversations: Conversation[]
  sidebarOpen: boolean

  // 현재 활성 대화의 메시지 (computed-like getter)
  messages: Message[]

  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>, conversationId?: string) => string
  updateMessage: (id: string, updates: Partial<Message>, conversationId?: string) => void
  setProcessing: (v: boolean, conversationId?: string) => void
  setLoadingMessages: (v: boolean) => void
  setThreadId: (id: string) => void
  setConversations: (convs: Conversation[]) => void
  setActiveConversation: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  loadMessages: (conversationId: string, messages: Message[]) => void
  migrateConversation: (oldId: string, newId: string) => void
  reset: () => void
}

let counter = 0
const genId = () => `msg-${Date.now()}-${counter++}`

export const useChatStore = create<ChatState>((set, get) => ({
  conversationMessages: {},
  activeConversationId: null,
  threadId: null,
  isProcessing: false,
  isLoadingMessages: false,
  processingConversationId: null,
  conversations: [],
  sidebarOpen: localStorage.getItem('st-agent-sidebar') !== 'false',
  messages: [],

  addMessage: (msg, conversationId) => {
    const id = genId()
    const targetId = conversationId || get().activeConversationId || '_new'
    set((s) => {
      const current = s.conversationMessages[targetId] || []
      const updated = [...current, { ...msg, id, timestamp: Date.now() }]
      const newMap = { ...s.conversationMessages, [targetId]: updated }
      // 활성 대화이거나, 새 대화(_new)이면서 activeConversationId가 null이면 UI에 반영
      const isActive = targetId === s.activeConversationId ||
        (targetId === '_new' && !s.activeConversationId)
      return {
        conversationMessages: newMap,
        messages: isActive ? updated : s.messages,
      }
    })
    return id
  },

  updateMessage: (id, updates, conversationId) => {
    const targetId = conversationId || get().activeConversationId || '_new'
    set((s) => {
      const current = s.conversationMessages[targetId] || []
      const updated = current.map((m) => (m.id === id ? { ...m, ...updates } : m))
      const newMap = { ...s.conversationMessages, [targetId]: updated }
      const isActive = targetId === s.activeConversationId ||
        (targetId === '_new' && !s.activeConversationId)
      return {
        conversationMessages: newMap,
        messages: isActive ? updated : s.messages,
      }
    })
  },

  setProcessing: (v, conversationId) => {
    set({
      isProcessing: v,
      processingConversationId: v ? (conversationId || get().activeConversationId) : null,
    })
  },

  setLoadingMessages: (v) => set({ isLoadingMessages: v }),
  setThreadId: (id) => set({ threadId: id }),
  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => {
    const state = get()
    set({
      activeConversationId: id,
      messages: id ? (state.conversationMessages[id] || []) : [],
      threadId: null,
      // isProcessing은 현재 활성 대화가 처리 중인 대화인 경우만 true
      isProcessing: id === state.processingConversationId,
    })
  },

  setSidebarOpen: (open) => {
    localStorage.setItem('st-agent-sidebar', String(open))
    set({ sidebarOpen: open })
  },

  loadMessages: (conversationId, messages) => {
    set((s) => {
      const newMap = { ...s.conversationMessages, [conversationId]: messages }
      return {
        conversationMessages: newMap,
        messages: conversationId === s.activeConversationId ? messages : s.messages,
      }
    })
  },

  // _new → 실제 conversationId로 메시지 마이그레이션
  migrateConversation: (oldId, newId) => {
    set((s) => {
      const msgs = s.conversationMessages[oldId]
      if (!msgs) return s
      const { [oldId]: _, ...rest } = s.conversationMessages
      const newMap = { ...rest, [newId]: msgs }
      const wasActive = s.activeConversationId === oldId || (!s.activeConversationId && oldId.startsWith('_new'))
      return {
        conversationMessages: newMap,
        activeConversationId: wasActive ? newId : s.activeConversationId,
        processingConversationId: s.processingConversationId === oldId ? newId : s.processingConversationId,
        messages: wasActive ? msgs : s.messages,
      }
    })
  },

  reset: () => {
    set((s) => ({
      activeConversationId: null,
      messages: [],
      threadId: null,
      isProcessing: s.processingConversationId ? s.isProcessing : false,
      // processing 중인 대화의 메시지는 유지
      conversationMessages: s.processingConversationId
        ? { [s.processingConversationId]: s.conversationMessages[s.processingConversationId] || [] }
        : {},
    }))
  },
}))
