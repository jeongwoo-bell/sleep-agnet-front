'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { API_URL } from '@/lib/api'

interface SlackChannel { id: string; name: string }
interface TeamMapping { name: string; channels: SlackChannel[] }
interface ChannelConfig { teams: TeamMapping[]; targetChannel: SlackChannel | null }

const EMPTY: ChannelConfig = { teams: [], targetChannel: null }

export default function ChannelMappingPage() {
  const { token } = useAuth()
  const [config, setConfig] = useState<ChannelConfig>(EMPTY)
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  )

  // 로드: 저장된 매핑 + 슬랙 채널 리스트 병렬
  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const [confRes, slackRes] = await Promise.all([
          fetch(`${API_URL}/bell-news/channels`, { headers }),
          fetch(`${API_URL}/bell-news/slack-channels`, { headers }),
        ])
        if (!confRes.ok || !slackRes.ok) throw new Error()
        const conf: ChannelConfig = await confRes.json()
        const { channels }: { channels: SlackChannel[] } = await slackRes.json()
        if (cancelled) return
        // 슬랙에서 채널명이 바뀌었으면 ID 매칭으로 최신 이름 표시
        const nameById = new Map(channels.map((c) => [c.id, c.name]))
        const refresh = (c: SlackChannel) => ({ ...c, name: nameById.get(c.id) ?? c.name })
        setConfig({
          teams: (conf.teams ?? []).map((t) => ({ ...t, channels: t.channels.map(refresh) })),
          targetChannel: conf.targetChannel ? refresh(conf.targetChannel) : null,
        })
        setSlackChannels(channels)
      } catch {
        if (!cancelled) toast.error('채널 정보를 불러오지 못했어요')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [token, headers])

  // 미저장 변경 이탈 경고
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = (fn: (prev: ChannelConfig) => ChannelConfig) => {
    setConfig(fn)
    setDirty(true)
  }

  const save = async () => {
    if (!config.targetChannel) return void toast.error('발행 대상 채널을 선택해주세요')
    if (config.teams.some((t) => !t.name.trim())) return void toast.error('팀 이름을 입력해주세요')
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/bell-news/channels`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: '저장 실패' }))
        throw new Error(error || '저장 실패')
      }
      setDirty(false)
      toast.success('저장했어요 — 다음 월요일 발행부터 반영됩니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        채널 정보를 불러오는 중…
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>채널 매핑</h1>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="text-[13px] font-medium rounded-md px-3.5 py-1.5 cursor-pointer disabled:cursor-default disabled:opacity-40"
            style={{ color: 'white', background: 'var(--accent-emerald)' }}
          >
            {saving ? '저장 중…' : '변경사항 저장'}
          </button>
        </div>
        <p className="text-[13px] mb-6" style={{ color: 'var(--text-tertiary)' }}>
          매주 월요일 09:00에 아래 채널들을 집계해 #발행 채널에 올립니다. 새로 추가한 채널은 발행 시 봇이 자동 입장해요.
        </p>

        {/* 발행 대상 채널 */}
        <section className="rounded-lg p-4 mb-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
          <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>발행 대상 채널</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
              {config.targetChannel ? `# ${config.targetChannel.name}` : '미설정'}
            </span>
            <ChannelPicker
              label="변경"
              channels={slackChannels}
              selectedIds={config.targetChannel ? [config.targetChannel.id] : []}
              onSelect={(ch) => update((p) => ({ ...p, targetChannel: ch }))}
            />
          </div>
        </section>

        {/* 팀별 수집 채널 */}
        <section className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>팀별 수집 채널</div>
            <button
              onClick={() => update((p) => ({ ...p, teams: [...p.teams, { name: '', channels: [] }] }))}
              className="text-[12px] rounded-md px-2.5 py-1 cursor-pointer"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }}
            >
              + 팀 추가
            </button>
          </div>

          {config.teams.length === 0 && (
            <p className="text-[13px] py-2" style={{ color: 'var(--text-muted)' }}>팀을 추가해주세요</p>
          )}

          {config.teams.map((team, ti) => (
            <div key={ti} className="py-3" style={{ borderTop: ti > 0 ? '1px solid var(--border-secondary)' : 'none' }}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={team.name}
                  placeholder="팀 이름"
                  onChange={(e) => update((p) => ({
                    ...p,
                    teams: p.teams.map((t, i) => (i === ti ? { ...t, name: e.target.value } : t)),
                  }))}
                  className="flex-1 text-sm font-semibold bg-transparent outline-none rounded px-1 py-0.5"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  onClick={() => update((p) => ({ ...p, teams: p.teams.filter((_, i) => i !== ti) }))}
                  className="text-[12px] cursor-pointer px-1.5"
                  style={{ color: 'var(--accent-red)' }}
                >
                  팀 삭제
                </button>
              </div>

              {team.channels.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between rounded px-2 py-1.5 ml-1">
                  <span className="text-[13px] font-mono" style={{ color: 'var(--text-secondary)' }}># {ch.name}</span>
                  <button
                    onClick={() => update((p) => ({
                      ...p,
                      teams: p.teams.map((t, i) =>
                        i === ti ? { ...t, channels: t.channels.filter((c) => c.id !== ch.id) } : t),
                    }))}
                    className="cursor-pointer px-1.5 text-[13px]"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={`${ch.name} 제거`}
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="ml-1 mt-1">
                <ChannelPicker
                  label="+ 채널 추가"
                  channels={slackChannels}
                  selectedIds={team.channels.map((c) => c.id)}
                  onSelect={(ch) => update((p) => ({
                    ...p,
                    teams: p.teams.map((t, i) =>
                      i === ti ? { ...t, channels: [...t.channels, ch] } : t),
                  }))}
                />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

/** 슬랙 채널 검색·선택 드롭다운 — 직접 입력 없음, ID 기준 저장 */
function ChannelPicker({
  label,
  channels,
  selectedIds,
  onSelect,
}: {
  label: string
  channels: SlackChannel[]
  selectedIds: string[]
  onSelect: (ch: SlackChannel) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const filtered = channels.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 30)
  const selected = new Set(selectedIds)

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setQuery('') }}
        className="text-[12px] rounded-md px-2.5 py-1 cursor-pointer"
        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }}
      >
        {label}
      </button>
      {open && (
        <div
          className="absolute right-0 z-40 mt-1 w-64 rounded-lg shadow-lg overflow-hidden"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="채널 검색"
            className="w-full px-3 py-2 text-[13px] bg-transparent outline-none"
            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)' }}
          />
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>결과 없음</div>
            )}
            {filtered.map((ch) => {
              const added = selected.has(ch.id)
              return (
                <button
                  key={ch.id}
                  disabled={added}
                  onClick={() => { onSelect(ch); setOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-[13px] font-mono cursor-pointer disabled:cursor-default disabled:opacity-40 hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-secondary)', background: 'transparent' }}
                >
                  # {ch.name}{added ? '  ✓' : ''}
                </button>
              )
            })}
          </div>
          <div className="px-3 py-1.5 text-[11px]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-secondary)' }}>
            public 채널만 표시됩니다 (private은 현재 미지원)
          </div>
        </div>
      )}
    </div>
  )
}
