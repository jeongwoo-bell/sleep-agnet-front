import { useState } from 'react'
import Markdown from 'react-markdown'
import { motion } from 'framer-motion'
import { ProgressSteps } from './ProgressSteps'
import type { Message } from '../store/chat'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  if (message.type === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div
          className="rounded-2xl rounded-br-sm max-w-[75%] overflow-hidden"
          style={{ background: 'var(--user-bubble)', color: 'var(--user-bubble-text)' }}
        >
          {/* 첨부 이미지 */}
          {message.images && message.images.length > 0 && (
            <div className={`flex gap-1 p-1.5 ${message.images.length === 1 ? '' : 'flex-wrap'}`}>
              {message.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`첨부 ${i + 1}`}
                  className="rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    maxHeight: message.images!.length === 1 ? '240px' : '120px',
                    maxWidth: message.images!.length === 1 ? '100%' : 'calc(50% - 2px)',
                  }}
                  onClick={() => window.open(src, '_blank')}
                />
              ))}
            </div>
          )}
          {/* 텍스트 */}
          {message.content && (
            <div className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (message.type === 'progress') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex gap-3"
      >
        <BotAvatar />
        <div
          className={`rounded-2xl rounded-bl-sm px-4 py-3 ${message.progress && message.progress.length > 0 ? 'min-w-[280px]' : ''}`}
          style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-secondary)' }}
        >
          <ProgressSteps steps={message.progress || []} />
        </div>
      </motion.div>
    )
  }

  if (message.type === 'error') {
    return <ErrorMessage content={message.content} />
  }

  const hasCodeResult = message.previewUrl || message.branchName || (message.changedFiles && message.changedFiles.length > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
    >
      <BotAvatar />
      <div className="flex-1 max-w-[80%] space-y-2.5">
        {/* 본문 */}
        <div
          className="rounded-2xl rounded-bl-sm px-4 py-3"
          style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-secondary)' }}
        >
          <div className="prose prose-sm max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 dark:prose-invert"
            style={{
              '--tw-prose-body': 'var(--text-secondary)',
              '--tw-prose-headings': 'var(--text-primary)',
              '--tw-prose-bold': 'var(--text-primary)',
              '--tw-prose-code': 'var(--accent-blue)',
            } as React.CSSProperties}
          >
            <Markdown>{message.content}</Markdown>
          </div>
        </div>

        {/* 코드 수정 결과 카드 */}
        {hasCodeResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}
          >
            {message.changedFiles && message.changedFiles.length > 0 && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <div className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  변경된 파일
                </div>
                <div className="space-y-1">
                  {message.changedFiles.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--accent-emerald)' }} className="shrink-0">
                        <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-2.5 flex items-center justify-between gap-3">
              {message.branchName && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--text-tertiary)' }} className="shrink-0">
                    <path d="M5 2.5v7M11 6.5v7M5 9.5a3 3 0 013-3h0a3 3 0 013 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="5" cy="2.5" r="1.5" fill="currentColor" />
                    <circle cx="11" cy="6.5" r="1.5" fill="currentColor" />
                    <circle cx="11" cy="13.5" r="1.5" fill="currentColor" />
                  </svg>
                  <span className="text-[11px] font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>{message.branchName}</span>
                </div>
              )}
              {message.previewUrl && (
                <a
                  href={message.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors no-underline shrink-0"
                  style={{ color: 'var(--accent-blue)', background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  프리뷰
                </a>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function ErrorMessage({ content }: { content: string }) {
  const [showDetail, setShowDetail] = useState(false)
  const [copied, setCopied] = useState(false)

  // ---detail--- 구분자로 요약/상세 분리
  const parts = content.split('---detail---')
  const summary = parts[0].trim()
  const detail = parts[1]?.trim()

  const handleCopy = () => {
    navigator.clipboard.writeText(detail || summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
    >
      <BotAvatar />
      <div className="max-w-[80%]">
        <div
          className="rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-border)', color: 'var(--accent-red)' }}
        >
          <div className="whitespace-pre-wrap">{summary}</div>
          {detail && (
            <>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setShowDetail(!showDetail)}
                  className="text-[11px] opacity-60 hover:opacity-100 transition-opacity cursor-pointer underline"
                >
                  {showDetail ? '접기' : '자세히 보기'}
                </button>
                <button
                  onClick={handleCopy}
                  className="text-[11px] opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1"
                >
                  {copied ? (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>복사됨</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>에러 복사</>
                  )}
                </button>
              </div>
              {showDetail && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 text-[11px] opacity-60 font-mono overflow-x-auto whitespace-pre-wrap rounded-lg p-2"
                  style={{ background: 'rgba(0,0,0,0.15)' }}
                >
                  {detail}
                </motion.pre>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
      S
    </div>
  )
}
