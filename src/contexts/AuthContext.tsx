'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useChatStore } from '../store/chat'
import { API_URL } from '../lib/api'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
const ALLOWED_DOMAIN = 'belltherapeutics.com'

interface User {
  id?: string
  email: string
  name: string
  picture: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: () => void
  logout: () => void
  updateUser?: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  loading: true,
  error: null,
  login: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

interface GoogleJwtPayload {
  email: string
  name: string
  picture: string
  hd?: string
  exp: number
}

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const processToken = useCallback((idToken: string) => {
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(idToken)

      // 도메인 체크
      if (ALLOWED_DOMAIN && decoded.hd !== ALLOWED_DOMAIN) {
        setError(`${ALLOWED_DOMAIN} 계정만 사용할 수 있어요`)
        setLoading(false)
        return false
      }

      // 만료 체크
      if (decoded.exp * 1000 < Date.now()) {
        return false
      }

      setUser({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      })
      setToken(idToken)
      setError(null)
      localStorage.setItem('st-agent-token', idToken)
      return true
    } catch {
      return false
    }
  }, [])

  // 초기 로드 — 저장된 토큰 복원
  useEffect(() => {
    const savedToken = localStorage.getItem('st-agent-token')
    if (savedToken) {
      const ok = processToken(savedToken)
      if (!ok) {
        localStorage.removeItem('st-agent-token')
      } else if (window.location.pathname !== '/') {
        window.location.href = '/'
        return
      }
    }
    setLoading(false)
  }, [processToken])

  // 토큰이 설정되면 서버에서 최신 프로필 가져오기
  useEffect(() => {
    if (!token || token === 'dev') return
    fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser((prev) => prev ? {
            ...prev,
            name: data.user.name || prev.name,
            picture: data.user.picture || prev.picture,
          } : prev)
        }
      })
      .catch(() => {})
  }, [token])

  // 토큰 만료 자동 감지 (1분마다 체크)
  useEffect(() => {
    if (!token) return
    const interval = setInterval(() => {
      try {
        const decoded = jwtDecode<GoogleJwtPayload>(token)
        if (decoded.exp * 1000 < Date.now()) {
          // 토큰 만료 → 로그아웃
          setUser(null)
          setToken(null)
          localStorage.removeItem('st-agent-token')
        }
      } catch {}
    }, 60000)
    return () => clearInterval(interval)
  }, [token])

  const googleLogin = useGoogleLogin({
    onSuccess: (_response) => {
      // implicit flow에서는 access_token만 옴 → ID token이 필요
      // 대신 Google의 userinfo 엔드포인트를 사용하거나, flow를 auth-code로 변경
      // 여기서는 credential response를 사용하기 위해 ux_mode: 'popup' + flow: 'implicit'
      // 실제로 @react-oauth/google의 useGoogleLogin은 access_token을 줌
      // ID token이 필요하면 GoogleLogin 컴포넌트를 사용해야 함
    },
    onError: () => setError('로그인에 실패했어요'),
  })

  // GoogleLogin 컴포넌트의 credential response를 처리하기 위한 함수
  const handleCredentialResponse = useCallback((credentialResponse: { credential?: string }) => {
    if (credentialResponse.credential) {
      const ok = processToken(credentialResponse.credential)
      if (ok && window.location.pathname !== '/') window.location.href = '/'
    }
  }, [processToken])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    setError(null)
    localStorage.removeItem('st-agent-token')
    useChatStore.getState().reset()
    window.location.href = '/'
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      login: googleLogin,
      logout,
      updateUser,
    }}>
      {/* handleCredentialResponse를 하위에서 접근 가능하도록 context 확장 */}
      <AuthCredentialContext.Provider value={handleCredentialResponse}>
        {children}
      </AuthCredentialContext.Provider>
    </AuthContext.Provider>
  )
}

// GoogleLogin 컴포넌트용 credential handler context
const AuthCredentialContext = createContext<(resp: { credential?: string }) => void>(() => {})
export function useAuthCredential() {
  return useContext(AuthCredentialContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    // Client ID 없으면 개발 모드 — 인증 없이 통과
    return (
      <AuthContext.Provider value={{
        user: { email: 'dev@belltherapeutics.com', name: 'Developer', picture: '' },
        token: 'dev',
        loading: false,
        error: null,
        login: () => {},
        logout: () => {},
        updateUser: () => {},
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </GoogleOAuthProvider>
  )
}
