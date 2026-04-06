import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { ProfileEditModal } from '../components/ProfileEditModal'

const API_URL = '/api'

interface Settings {
  autoCommit?: boolean
}

interface Props {
  onBack: () => void
}

export function MyPage({ onBack }: Props) {
  const { user, token } = useAuth()
  const [settings, setSettings] = useState<Settings>({})
  const [saving, setSaving] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.settings) setSettings(data.user.settings)
      })
      .catch(() => {})
  }, [token])

  const saveSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings)
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/me/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: newSettings }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
    } catch (err) {
      toast.error('설정 저장에 실패했어요')
    }
    setSaving(false)
  }, [token])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            마이페이지
          </h1>
          {saving && (
            <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
              저장 중...
            </span>
          )}
        </div>

        {/* 프로필 */}
        <section
          className="relative rounded-2xl p-5 mb-4"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}
        >
          {/* 연필 아이콘 */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
            프로필
          </h2>
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-14 h-14 rounded-full object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-medium shrink-0"
                style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}
              >
                {user?.name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <div className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                {user?.name}
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {user?.email}
              </div>
            </div>
          </div>
        </section>

        <ProfileEditModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

        {/* 테마 설정 */}
        <section
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>테마</h2>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                시스템 설정, 라이트, 다크
              </div>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* 대화 설정 */}
        <section
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}
        >
          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
            대화 설정
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>자동 커밋</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  코드 수정 후 자동으로 커밋 & 푸시
                </div>
              </div>
              <button
                onClick={() => saveSettings({ ...settings, autoCommit: !settings.autoCommit })}
                className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
                style={{
                  background: settings.autoCommit ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                  border: `1px solid ${settings.autoCommit ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                }}
              >
                <div
                  className="absolute top-0.5 rounded-full bg-white"
                  style={{
                    width: '18px',
                    height: '18px',
                    transform: settings.autoCommit ? 'translateX(18px)' : 'translateX(2px)',
                    transition: 'transform 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
