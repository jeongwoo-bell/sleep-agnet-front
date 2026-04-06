export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'st-agent-theme'

export function getStoredTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
}

export function applyTheme(theme: Theme, animate = true) {
  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (animate) {
    // 화면 살짝 페이드아웃 → 테마 전환 → 페이드인
    root.classList.remove('theme-fade')
    // force reflow to restart animation
    void root.offsetWidth
    root.classList.add('theme-fade')

    // CSS 변수에서 duration 읽기
    const duration = parseFloat(getComputedStyle(root).getPropertyValue('--transition-theme')) * 1000 || 700

    // 살짝 어두워진 시점(25%)에 테마 전환
    setTimeout(() => {
      if (isDark) root.classList.add('dark')
      else root.classList.remove('dark')
    }, duration * 0.18)

    setTimeout(() => root.classList.remove('theme-fade'), duration + 50)
  } else {
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }
}

export function initTheme() {
  const theme = getStoredTheme()
  applyTheme(theme, false)

  // system 모드면 OS 변경 감지
  if (theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getStoredTheme() === 'system') applyTheme('system')
    })
  }
}
