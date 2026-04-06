export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'st-agent-theme'

export function getStoredTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
}

function setDark(isDark: boolean) {
  if (isDark) document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}

export function applyTheme(theme: Theme, animate = true) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (!animate) {
    setDark(isDark)
    return
  }

  // View Transitions API — 브라우저가 화면 캡처 → 테마 전환 → 크로스페이드
  if ('startViewTransition' in document) {
    (document as any).startViewTransition(() => {
      setDark(isDark)
    })
  } else {
    // 미지원 브라우저 — 즉시 전환
    setDark(isDark)
  }
}

export function initTheme() {
  const theme = getStoredTheme()
  applyTheme(theme, false)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system')
  })
}
