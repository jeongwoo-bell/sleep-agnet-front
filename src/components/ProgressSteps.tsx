import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProgressStep } from '../store/chat'

interface Props {
  steps: ProgressStep[]
}

export function ProgressSteps({ steps }: Props) {
  if (steps.length === 0) return <WaveDots />

  const doneCount = steps.filter((s) => s.state === 'done').length
  const errorStep = steps.find((s) => s.state === 'error')
  const activeStep = steps.find((s) => s.state === 'start')
  const allDone = doneCount === steps.length && steps.length > 0
  const hasError = !!errorStep

  // 처리 중이면 기본 펼침, 완료/에러면 기본 접힘
  const [expanded, setExpanded] = useState(!allDone && !hasError)

  // 완료되면 자동으로 접기
  useEffect(() => {
    if (allDone || hasError) setExpanded(false)
  }, [allDone, hasError])

  const currentLabel = hasError
    ? `${errorStep.step}에서 오류 발생`
    : allDone
      ? `${steps.length}개 단계 완료`
      : activeStep
        ? `${activeStep.step} 중...`
        : '준비 중...'

  return (
    <div className="select-none">
      {/* 헤더 — 항상 보임 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full gap-2 group cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <HeaderIcon allDone={allDone} hasError={hasError} active={!!activeStep} />
          <span
            className="text-[13px] font-medium truncate"
            style={{
              color: hasError ? 'var(--accent-red)' :
                allDone ? 'var(--accent-emerald)' :
                'var(--text-primary)',
            }}
          >
            {currentLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!allDone && !hasError && (
            <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {doneCount}/{steps.length}
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="transition-transform duration-200"
            style={{
              color: 'var(--text-muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* 펼친 내용 */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 pl-0.5 space-y-0.5">
              {steps.map((step) => (
                <StepRow key={step.step} step={step} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StepRow({ step }: { step: ProgressStep }) {
  const logsEndRef = useRef<HTMLDivElement>(null)
  const isActive = step.state === 'start'
  const isDone = step.state === 'done'
  const isError = step.state === 'error'

  // 새 로그가 추가되면 스크롤
  useEffect(() => {
    if (step.logs?.length) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [step.logs?.length])

  return (
    <div>
      <div className="flex items-center gap-2 py-0.5">
        <StepIcon state={step.state} />
        <span
          className="text-[12px]"
          style={{
            color: isActive ? 'var(--text-primary)' :
              isDone ? 'var(--text-tertiary)' :
              isError ? 'var(--accent-red)' :
              'var(--text-muted)',
            fontWeight: isActive ? 500 : 400,
          }}
        >
          {step.step}
        </span>
        {step.detail && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {step.detail}
          </span>
        )}
      </div>

      {/* 로그 — 활성 스텝 또는 에러 스텝의 로그만 표시 */}
      {step.logs && step.logs.length > 0 && (isActive || isError || isDone) && (
        <div
          className="ml-6 mt-0.5 mb-1 max-h-24 overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {step.logs.map((log, i) => (
            <div
              key={i}
              className="text-[11px] font-mono leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  )
}

function HeaderIcon({ allDone, hasError, active }: { allDone: boolean; hasError: boolean; active: boolean }) {
  if (allDone) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-4 h-4 rounded-full flex items-center justify-center"
        style={{ background: 'var(--accent-emerald-bg)' }}
      >
        <svg className="w-2.5 h-2.5" style={{ color: 'var(--accent-emerald)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
    )
  }

  if (hasError) {
    return (
      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-red-bg)' }}>
        <svg className="w-2.5 h-2.5" style={{ color: 'var(--accent-red)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    )
  }

  if (active) {
    return (
      <div className="w-4 h-4 flex items-center justify-center">
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--accent-blue)' }}
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      </div>
    )
  }

  // pending 상태 — 스피너
  return (
    <div className="w-4 h-4 flex items-center justify-center">
      <motion.div
        className="w-3 h-3 rounded-full"
        style={{ border: '1.5px solid var(--text-muted)', borderTopColor: 'transparent' }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      />
    </div>
  )
}

function StepIcon({ state }: { state: string }) {
  switch (state) {
    case 'done':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-emerald-bg)' }}
        >
          <svg className="w-2 h-2" style={{ color: 'var(--accent-emerald)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )
    case 'error':
      return (
        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-red-bg)' }}>
          <svg className="w-2 h-2" style={{ color: 'var(--accent-red)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    case 'start':
      return (
        <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent-blue)' }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        </div>
      )
    default:
      return (
        <div
          className="w-3.5 h-3.5 rounded-full shrink-0"
          style={{ border: '1px solid var(--border-primary)', opacity: 0.5 }}
        />
      )
  }
}

function WaveDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--text-tertiary)' }}
          animate={{ y: [0, -3, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
