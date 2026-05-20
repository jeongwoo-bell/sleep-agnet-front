// API 탐색 페이지가 다루는 백엔드 프로젝트 목록
// 추후 wowfit 등 추가 시 이 배열에 한 줄만 추가하면 됨

export interface ApiProject {
  id: string
  name: string
  /** OpenAPI / Swagger 스펙 JSON URL */
  specUrl: string
  /** Try it 호출 시 사용할 베이스 URL. 없으면 specUrl 또는 OpenAPI servers에서 추론 */
  baseUrl?: string
  /** 로그인 엔드포인트 경로 (baseUrl 기준). 없으면 스펙에서 자동 탐색 */
  loginPath?: string
  /** 로그인 요청 시 id/password 외에 함께 보낼 고정 필드들 */
  loginExtras?: Record<string, unknown>
  /** 로그인 ID 필드명. 없으면 스펙의 requestBody에서 id/email/username 등을 자동 탐색 */
  loginIdField?: string
  /** 로그인 비밀번호 필드명. 없으면 password/pw 등을 자동 탐색 */
  loginPasswordField?: string
}

export const API_PROJECTS: ApiProject[] = [
  {
    id: 'sleepthera',
    name: 'SleepThera (dev)',
    specUrl: 'https://dev-sleepthera-api.belltherapeutics.net/v3/api-docs/default',
    baseUrl: 'https://dev-sleepthera-api.belltherapeutics.net',
    loginPath: '/api/patients/login',
    loginExtras: {
      appVersion: '0.0.1',
      osName: 'web',
      osVersion: '1',
      deviceName: 'design-agent',
      osTimeZone: 'Asia/Seoul',
      osLanguage: 'ko',
      deviceId: 'design-agent-web',
      expoToken: 'design-agent-token',
    },
  },
  {
    id: 'sleepthera-admin-v2',
    name: 'SleepThera Admin v2 (dev)',
    specUrl: 'https://dev-sleepthera-api.belltherapeutics.net/v3/api-docs/admin-v2',
  },
  // 추후 추가 예시:
  // {
  //   id: 'wowfit',
  //   name: 'WowFit (dev)',
  //   specUrl: 'https://dev-wowfit-api.belltherapeutics.net/v3/api-docs/default',
  // },
]

export function getApiProject(id: string): ApiProject | undefined {
  return API_PROJECTS.find((p) => p.id === id)
}
