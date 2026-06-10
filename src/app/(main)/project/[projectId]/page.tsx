'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getApp } from '@/lib/apps'

export default function ProjectIndexPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const router = useRouter()

  useEffect(() => {
    const firstTool = getApp(projectId)?.supportedTools[0] ?? 'agent'
    router.replace(`/project/${projectId}/${firstTool}`)
  }, [projectId, router])

  return null
}
