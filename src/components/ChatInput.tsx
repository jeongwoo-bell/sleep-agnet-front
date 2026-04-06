import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef, type DragEvent, type ClipboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../store/chat'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export interface ImageAttachment {
  file: File
  preview: string
  base64: string
  mediaType: string
}

export interface ChatInputHandle {
  addImages: (files: File[]) => void
}

interface Props {
  onSend: (message: string, figmaUrl?: string, images?: ImageAttachment[]) => void
}

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput({ onSend }, ref) {
  // 이미지 기능 비활성화 — 추후 활성화 시 false로 변경
  const IMAGE_DISABLED = true

  const [value, setValue] = useState('')
  const [images, setImages] = useState<ImageAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isProcessing = useChatStore((s) => s.isProcessing)

  const addImages = useCallback(async (files: File[]) => {
    if (IMAGE_DISABLED) return
    setError(null)
    const newImages: ImageAttachment[] = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name}: 지원하지 않는 형식 (JPEG, PNG, GIF, WebP)`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`${file.name}: 5MB 초과`)
        continue
      }
      if (images.length + newImages.length >= 4) {
        setError('이미지는 최대 4장까지')
        break
      }

      const base64 = await fileToBase64(file)
      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        base64,
        mediaType: file.type,
      })
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages])
    }
  }, [images.length])

  // App에서 전역 드래그로 이미지 추가할 수 있도록 노출
  useImperativeHandle(ref, () => ({ addImages }), [addImages])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && images.length === 0) || isProcessing) return
    onSend(trimmed, undefined, images.length > 0 ? images : undefined)
    setValue('')
    images.forEach((img) => URL.revokeObjectURL(img.preview))
    setImages([])
    setError(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [value, images, isProcessing, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = () => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length > 0) addImages(files)
  }

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData.items
    const imageFiles: File[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      addImages(imageFiles)
    }
  }

  return (
    <div
      className="relative rounded-2xl transition-all"
      style={{
        background: 'var(--bg-input)',
        border: isDragging ? '2px dashed var(--accent-blue)' : '1px solid var(--border-primary)',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 드래그 오버레이 */}
      {isDragging && (
        <div
          className="absolute inset-0 z-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--accent-blue-bg)' }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-blue)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            이미지를 여기에 놓으세요
          </div>
        </div>
      )}

      {/* 이미지 미리보기 — 애니메이션 포함 */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 px-3 pt-3 pb-1 overflow-x-auto">
              <AnimatePresence>
                {images.map((img, i) => (
                  <motion.div
                    key={img.preview}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="relative shrink-0 group"
                  >
                    <img
                      src={img.preview}
                      alt={`첨부 ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg"
                      style={{ border: '1px solid var(--border-primary)' }}
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--accent-red)' }}
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0.5 right-0.5 text-[8px] px-1 rounded" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      {(img.file.size / 1024).toFixed(0)}KB
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 에러 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-2 text-[11px] overflow-hidden"
            style={{ color: 'var(--accent-red)' }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onPaste={handlePaste}
        placeholder={isProcessing ? '처리 중...' : images.length > 0 ? '이미지에 대한 요청을 입력하세요...' : '메시지를 입력하세요...'}
        disabled={isProcessing}
        rows={1}
        className="w-full resize-none bg-transparent text-sm px-4 pt-3.5 pb-12 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: 'var(--text-primary)' }}
      />

      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
        {!IMAGE_DISABLED && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="이미지 첨부"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            if (files.length > 0) addImages(files)
            e.target.value = ''
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={(!value.trim() && images.length === 0) || isProcessing}
          className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
          style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
        >
          전송 ↵
        </button>
      </div>
    </div>
  )
})

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
