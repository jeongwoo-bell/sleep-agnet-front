'use client'

import { use } from 'react'
import { ChatView } from '@/components/ChatView'

export default function ChatPage({ params }: { params: Promise<{ projectId: string; id: string }> }) {
  const { id } = use(params)
  return <ChatView conversationId={id} />
}
