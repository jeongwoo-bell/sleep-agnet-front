import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onMyPage: () => void
}

export function ProfileMenu({ onMyPage }: Props) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors cursor-pointer"
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-7 h-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
            style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}
          >
            {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
          </div>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 z-50 rounded-xl py-2 min-w-[200px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
          >
            {/* 유저 정보 */}
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {user.name}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {user.email}
              </div>
            </div>

            {/* 메뉴 항목 */}
            <div className="py-1">
              <button
                onClick={() => { onMyPage(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                마이페이지
              </button>

              <button
                onClick={() => { logout(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors cursor-pointer"
                style={{ color: 'var(--accent-red)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6M10.5 11.5L14 8l-3.5-3.5M5.5 8h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                로그아웃
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
