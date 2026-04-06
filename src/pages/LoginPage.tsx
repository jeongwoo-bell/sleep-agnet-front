import { GoogleLogin } from '@react-oauth/google'
import { useAuth, useAuthCredential } from '../contexts/AuthContext'

export function LoginPage() {
  const { error } = useAuth()
  const handleCredential = useAuthCredential()

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-sm w-full px-6">
        {/* 로고 */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white">
            S
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Sleep Agent
          </h1>
          <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
            SleepThera 디자인 에이전트에 로그인하세요
          </p>
        </div>

        {/* Google 로그인 버튼 */}
        <div
          className="w-full flex flex-col items-center gap-4 p-6 rounded-2xl"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}
        >
          <GoogleLogin
            onSuccess={handleCredential}
            onError={() => {}}
            theme="outline"
            size="large"
            width="280"
            text="signin_with"
            shape="pill"
          />

          <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
            belltherapeutics.com 계정으로만 로그인할 수 있어요
          </p>
        </div>

        {/* 에러 */}
        {error && (
          <div
            className="w-full text-center text-sm px-4 py-3 rounded-xl"
            style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)', border: '1px solid var(--accent-red-border)' }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
