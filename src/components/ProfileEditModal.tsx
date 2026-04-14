'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { API_URL } from '../lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

export function ProfileEditModal({ open, onClose }: Props) {
  const { user, token, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [picturePreview, setPicturePreview] = useState(user?.picture || '')
  const [pictureFile, setPictureFile] = useState<string | null>(null) // base64
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('이미지는 2MB 이하만 가능해요')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setPicturePreview(base64)
      setPictureFile(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    const updates: Record<string, string> = {}
    if (name.trim() && name.trim() !== user?.name) updates.name = name.trim()
    if (pictureFile) updates.picture = pictureFile

    if (Object.keys(updates).length === 0) {
      onClose()
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      if (updateUser) updateUser(updates)
      toast.success('프로필이 업데이트됐어요')
      onClose()
    } catch (err) {
      toast.error('프로필 업데이트에 실패했어요', {
        description: err instanceof Error ? `오류 코드: ${err.message}` : undefined,
      })
    }
    setSaving(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
          >
            <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
              프로필 수정
            </h2>

            {/* 프로필 사진 */}
            <div className="flex justify-center mb-5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer"
              >
                {picturePreview ? (
                  <img
                    src={picturePreview}
                    alt="프로필"
                    className="w-20 h-20 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium"
                    style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}
                  >
                    {name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileChange(file)
                    e.target.value = ''
                  }}
                />
              </button>
            </div>

            {/* 이름 */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
                이름
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 text-sm py-2.5 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--accent-blue)', color: '#fff' }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
