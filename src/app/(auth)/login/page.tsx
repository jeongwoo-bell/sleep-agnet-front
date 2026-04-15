'use client'

import dynamic from 'next/dynamic'

const LoginPage = dynamic(() => import('@/views/LoginPage').then(m => ({ default: m.LoginPage })), { ssr: false })

export default function LoginPageRoute() {
  return <LoginPage />
}
