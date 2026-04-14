'use client'

import { useRouter } from 'next/navigation'
import { MyPage } from '@/views/MyPage'

export default function MyPageRoute() {
  const router = useRouter()
  return <MyPage onBack={() => router.push('/')} onReport={() => router.push('/report')} />
}
