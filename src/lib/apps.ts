// 앱/프로젝트 config
// 지금은 하드코딩, 추후 DB로 이동 예정

export type ToolId = 'agent' | 'logs'

export interface App {
  id: string
  name: string
  description: string
  stack?: string
  supportedTools: ToolId[]
}

export const APPS: App[] = [
  {
    id: 'sleepthera',
    name: 'SleepThera Landing',
    description: 'SleepThera 랜딩페이지',
    supportedTools: ['agent', 'logs'],
  },
]

export const ALL_TOOLS: { id: ToolId; label: string }[] = [
  { id: 'agent', label: 'Agent' },
  { id: 'logs', label: 'Logs' },
]

export function getApp(id: string): App | undefined {
  return APPS.find((a) => a.id === id)
}

export function isToolSupported(appId: string, toolId: ToolId): boolean {
  const app = getApp(appId)
  return !!app && app.supportedTools.includes(toolId)
}

/**
 * pathname에서 현재 프로젝트 ID 추출
 * /project/sleepthera/agent → "sleepthera"
 * /                         → null
 */
export function getCurrentProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/project\/([^/]+)/)
  return match ? match[1] : null
}

export const ORG_NAME = 'Bell Therapeutics'
