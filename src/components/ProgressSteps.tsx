import { motion } from 'framer-motion'
import type { ProgressStep } from '../store/chat'

interface Props {
  steps: ProgressStep[]
}

export function ProgressSteps({ steps }: Props) {
  if (steps.length === 0) {
    return <WaveDots />
  }

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <motion.div
          key={step.step}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: step.state === 'pending' ? i * 0.03 : 0 }}
          className="flex items-center gap-2.5 text-[13px]"
        >
          <StepIcon state={step.state} />
          <span style={{
            color: step.state === 'start' ? 'var(--text-primary)' :
              step.state === 'done' ? 'var(--text-tertiary)' :
              step.state === 'error' ? 'var(--accent-red)' :
              'var(--text-muted)',
            opacity: step.state === 'pending' ? 0.5 : 1,
          }}>
            {step.step}
          </span>
          {step.detail && (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{step.detail}</span>
          )}
        </motion.div>
      ))}
    </div>
  )
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

function StepIcon({ state }: { state: string }) {
  switch (state) {
    case 'done':
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
    case 'error':
      return (
        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-red-bg)' }}>
          <svg className="w-2.5 h-2.5" style={{ color: 'var(--accent-red)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    case 'start':
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
    default:
      return <div className="w-4 h-4 rounded-full" style={{ border: '1px solid var(--border-primary)' }} />
  }
}
