'use client'

import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { useConversations } from '@/hooks/useConversations'

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { fetchConversations } = useConversations()

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
