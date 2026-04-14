'use client'

import { useRouter } from 'next/navigation'
import { ReportPage } from '@/views/ReportPage'

export default function ReportPageRoute() {
  const router = useRouter()
  return <ReportPage onBack={() => router.push('/mypage')} />
}
