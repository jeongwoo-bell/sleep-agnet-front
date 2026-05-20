'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { API_PROJECTS, getApiProject, type ApiProject } from '@/lib/api-projects'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'
const METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete']

interface OpenApiSchema {
  type?: string
  format?: string
  description?: string
  enum?: (string | number)[]
  items?: OpenApiSchema
  properties?: Record<string, OpenApiSchema>
  required?: string[]
  $ref?: string
  allOf?: OpenApiSchema[]
  oneOf?: OpenApiSchema[]
  anyOf?: OpenApiSchema[]
  nullable?: boolean
  example?: unknown
  default?: unknown
}

interface Parameter {
  name: string
  in: string
  required?: boolean
  description?: string
  schema?: OpenApiSchema
}

interface MediaType {
  schema?: OpenApiSchema
}

interface RequestBody {
  description?: string
  required?: boolean
  content?: Record<string, MediaType>
}

interface ApiResponse {
  description?: string
  content?: Record<string, MediaType>
}

interface Operation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses?: Record<string, ApiResponse>
  deprecated?: boolean
}

interface OpenApiSpec {
  openapi?: string
  info?: { title?: string; description?: string; version?: string }
  servers?: { url?: string }[]
  tags?: { name: string; description?: string }[]
  paths?: Record<string, Partial<Record<HttpMethod, Operation>>>
  components?: { schemas?: Record<string, OpenApiSchema> }
}

interface Endpoint {
  id: string
  path: string
  method: HttpMethod
  op: Operation
  tag: string
}

interface AuthState {
  token: string
  user: string
}

type TryResponse =
  | { kind: 'json'; status: number; ok: boolean; body: unknown }
  | { kind: 'download'; status: number; ok: boolean; filename: string; size: number; contentType: string }
  | { kind: 'empty'; status: number; ok: boolean }

interface LoginEndpoint {
  path: string
  method: HttpMethod
  mediaType: string
  schema?: OpenApiSchema
}

// ── 헬퍼 ──────────────────────────────────────────────

function methodColor(m: HttpMethod): { fg: string; bg: string; border: string } {
  switch (m) {
    case 'get':
      return { fg: 'var(--accent-blue)', bg: 'var(--accent-blue-bg)', border: 'var(--accent-blue-border)' }
    case 'post':
      return { fg: 'var(--accent-emerald)', bg: 'var(--accent-emerald-bg)', border: 'var(--accent-emerald-border)' }
    case 'patch':
      return { fg: 'var(--accent-violet)', bg: 'var(--accent-violet-bg)', border: 'var(--accent-violet-border)' }
    case 'put':
      return { fg: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' }
    case 'delete':
      return { fg: 'var(--accent-red)', bg: 'var(--accent-red-bg)', border: 'var(--accent-red-border)' }
  }
}

function slugify(s: string): string {
  return 'tag-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function refName(ref: string): string {
  return ref.split('/').pop() || ref
}

function deref(schema: OpenApiSchema | undefined, spec: OpenApiSpec): OpenApiSchema | undefined {
  if (!schema) return schema
  if (schema.$ref) {
    const found = spec.components?.schemas?.[refName(schema.$ref)]
    return found ? deref(found, spec) : schema
  }
  return schema
}

function effective(schema: OpenApiSchema | undefined, spec: OpenApiSpec): OpenApiSchema {
  const s = deref(schema, spec)
  if (!s) return {}
  if (s.allOf?.length) {
    const merged: OpenApiSchema = { type: 'object', properties: {}, required: [] }
    for (const part of s.allOf) {
      const e = effective(part, spec)
      Object.assign(merged.properties!, e.properties)
      if (e.required) merged.required!.push(...e.required)
      if (e.type && e.type !== 'object') merged.type = e.type
      if (e.description && !merged.description) merged.description = e.description
    }
    return merged
  }
  return s
}

function typeLabel(schema: OpenApiSchema | undefined): string {
  if (!schema) return 'any'
  if (schema.$ref) return refName(schema.$ref)
  if (schema.allOf?.length) return schema.allOf.map(typeLabel).join(' & ')
  if (schema.oneOf?.length) return schema.oneOf.map(typeLabel).join(' | ')
  if (schema.anyOf?.length) return schema.anyOf.map(typeLabel).join(' | ')
  if (schema.type === 'array') return `${typeLabel(schema.items)}[]`
  if (schema.enum) return 'enum'
  let t = schema.type || 'object'
  if (schema.format) t += `<${schema.format}>`
  return t
}

function isExpandable(schema: OpenApiSchema | undefined, spec: OpenApiSpec): boolean {
  const e = effective(schema, spec)
  if (e.properties && Object.keys(e.properties).length > 0) return true
  if (e.type === 'array') {
    const item = effective(e.items, spec)
    return !!(item.properties && Object.keys(item.properties).length > 0)
  }
  return false
}

function genExample(schema: OpenApiSchema | undefined, spec: OpenApiSpec, seen: string[] = []): unknown {
  if (!schema) return null
  const refKey = schema.$ref ? refName(schema.$ref) : null
  if (refKey && seen.includes(refKey)) return {}
  const nextSeen = refKey ? [...seen, refKey] : seen
  const eff = effective(schema, spec)
  if (eff.example !== undefined) return eff.example
  if (eff.enum?.length) return eff.enum[0]
  if (eff.type === 'array') return [genExample(eff.items, spec, nextSeen)]
  if (eff.properties && Object.keys(eff.properties).length > 0) {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(eff.properties)) obj[k] = genExample(v, spec, nextSeen)
    return obj
  }
  switch (eff.type) {
    case 'integer':
    case 'number':
      return 0
    case 'boolean':
      return true
    case 'string':
      if (eff.format === 'date-time') return '2025-01-01T00:00:00Z'
      if (eff.format === 'date') return '2025-01-01'
      if (eff.format === 'uuid') return '00000000-0000-0000-0000-000000000000'
      return 'string'
    default:
      return eff.type || null
  }
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function originFromUrl(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function resolveBaseUrl(project: ApiProject, spec: OpenApiSpec | null): string {
  if (project.baseUrl) return stripTrailingSlash(project.baseUrl)

  const serverUrl = spec?.servers?.find((s) => s.url)?.url
  if (serverUrl && isAbsoluteUrl(serverUrl)) return stripTrailingSlash(serverUrl)

  const specOrigin = originFromUrl(project.specUrl)
  if (!serverUrl || serverUrl === '/') return specOrigin

  if (specOrigin) {
    try {
      return stripTrailingSlash(new URL(serverUrl, specOrigin).toString())
    } catch {
      return specOrigin
    }
  }

  return stripTrailingSlash(serverUrl)
}

function appendPath(baseUrl: string, path: string): string {
  return `${stripTrailingSlash(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`
}

function getPreferredMedia(content: Record<string, MediaType> | undefined): [string, MediaType] | null {
  if (!content) return null
  if (content['application/json']) return ['application/json', content['application/json']]
  if (content['multipart/form-data']) return ['multipart/form-data', content['multipart/form-data']]
  const first = Object.entries(content)[0]
  return first || null
}

function schemaProps(schema: OpenApiSchema | undefined, spec: OpenApiSpec): Record<string, OpenApiSchema> {
  return effective(schema, spec).properties || {}
}

function isFileSchema(schema: OpenApiSchema | undefined, spec: OpenApiSpec): boolean {
  const eff = effective(schema, spec)
  if (eff.type === 'string' && eff.format === 'binary') return true
  if (eff.type === 'array') return isFileSchema(eff.items, spec)
  return false
}

function requestMedia(op: Operation): [string, MediaType] | null {
  const content = op.requestBody?.content
  if (!content) return null
  if (content['application/json']) return ['application/json', content['application/json']]
  if (content['multipart/form-data']) return ['multipart/form-data', content['multipart/form-data']]
  if (content['application/x-www-form-urlencoded']) return ['application/x-www-form-urlencoded', content['application/x-www-form-urlencoded']]
  return Object.entries(content)[0] || null
}

function responseMediaTypes(op: Operation): string[] {
  return Object.values(op.responses || {}).flatMap((res) => Object.keys(res.content || {}))
}

function shouldDownloadResponse(contentType: string, op: Operation): boolean {
  const normalized = contentType.toLowerCase()
  const declared = responseMediaTypes(op).join(' ').toLowerCase()
  const haystack = `${normalized} ${declared}`
  return (
    haystack.includes('octet-stream') ||
    haystack.includes('text/csv') ||
    haystack.includes('application/csv') ||
    haystack.includes('spreadsheet') ||
    haystack.includes('excel') ||
    haystack.includes('pdf') ||
    haystack.includes('zip') ||
    haystack.includes('image/') ||
    haystack.includes('application/vnd')
  )
}

function filenameFromResponse(res: Response, path: string): string {
  const disposition = res.headers.get('content-disposition') || ''
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1])
  const plainMatch = disposition.match(/filename="?([^"]+)"?/i)
  if (plainMatch?.[1]) return plainMatch[1]
  const last = path.split('/').filter(Boolean).pop() || 'download'
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/csv') && !last.includes('.')) return `${last}.csv`
  return last
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function findLoginEndpoint(project: ApiProject, spec: OpenApiSpec | null): LoginEndpoint | null {
  if (!spec?.paths) return project.loginPath ? { path: project.loginPath, method: 'post', mediaType: 'application/json' } : null

  if (project.loginPath) {
    const op = spec.paths[project.loginPath]?.post
    const media = getPreferredMedia(op?.requestBody?.content)
    return {
      path: project.loginPath,
      method: 'post',
      mediaType: media?.[0] || 'application/json',
      schema: media?.[1].schema,
    }
  }

  let best: { score: number; path: string; op: Operation } | null = null
  for (const [path, ops] of Object.entries(spec.paths)) {
    const op = ops.post
    if (!op) continue

    const haystack = [path, op.operationId, op.summary, op.description, ...(op.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (haystack.includes('logout') || haystack.includes('refresh')) continue

    let score = 0
    if (path.toLowerCase().includes('login')) score += 8
    if (op.operationId?.toLowerCase() === 'login') score += 8
    if (op.operationId?.toLowerCase().includes('login')) score += 5
    if (op.summary?.toLowerCase().includes('login') || op.summary?.includes('로그인')) score += 5
    if (op.tags?.some((tag) => tag.toLowerCase().includes('auth') || tag.includes('인증'))) score += 3

    if (score > 0 && (!best || score > best.score)) best = { score, path, op }
  }

  if (!best) return null
  const media = getPreferredMedia(best.op.requestBody?.content)
  return {
    path: best.path,
    method: 'post',
    mediaType: media?.[0] || 'application/json',
    schema: media?.[1].schema,
  }
}

function inferField(schema: OpenApiSchema | undefined, spec: OpenApiSpec, candidates: string[], fallback: string): string {
  const props = effective(schema, spec).properties
  if (!props) return fallback
  const lowerMap = new Map(Object.keys(props).map((key) => [key.toLowerCase(), key]))
  for (const candidate of candidates) {
    const found = lowerMap.get(candidate.toLowerCase())
    if (found) return found
  }
  return fallback
}

function extractToken(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  const inner = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : null
  return (
    (inner?.accessToken as string | undefined) ||
    (inner?.token as string | undefined) ||
    (inner?.jwt as string | undefined) ||
    (obj.accessToken as string | undefined) ||
    (obj.token as string | undefined) ||
    (obj.jwt as string | undefined) ||
    null
  )
}

// ── 공통 UI ───────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="text-[11px] font-semibold uppercase tracking-wider mb-2"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </h4>
  )
}

function MethodBadge({ method, size = 'sm' }: { method: HttpMethod; size?: 'sm' | 'md' }) {
  const c = methodColor(method)
  return (
    <span
      className={`font-mono font-bold uppercase rounded shrink-0 ${
        size === 'md' ? 'text-[11px] px-2 py-1' : 'text-[10px] px-1.5 py-0.5'
      }`}
      style={{ color: c.fg, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {method}
    </span>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  const nodes: React.ReactNode[] = []
  const regex = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(json)) !== null) {
    if (m.index > last) nodes.push(json.slice(last, m.index))
    if (m[1] !== undefined) {
      const isKey = m[2] !== undefined
      nodes.push(
        <span key={key++} style={{ color: isKey ? 'var(--accent-blue)' : 'var(--accent-emerald)' }}>
          {m[1]}
        </span>,
      )
      if (isKey) nodes.push(m[2])
    } else if (m[3] !== undefined) {
      nodes.push(<span key={key++} style={{ color: 'var(--accent-violet)' }}>{m[3]}</span>)
    } else if (m[4] !== undefined) {
      nodes.push(<span key={key++} style={{ color: '#f59e0b' }}>{m[4]}</span>)
    }
    last = regex.lastIndex
  }
  if (last < json.length) nodes.push(json.slice(last))

  return (
    <pre
      className="text-[12px] font-mono rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-secondary)',
        color: 'var(--text-secondary)',
      }}
    >
      {nodes}
    </pre>
  )
}

type ViewMode = 'schema' | 'json' | 'try'

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const opts: { v: ViewMode; label: string }[] = [
    { v: 'schema', label: 'Schema' },
    { v: 'json', label: '{ }' },
    { v: 'try', label: 'Try it' },
  ]
  return (
    <div
      className="inline-flex rounded-lg overflow-hidden shrink-0"
      style={{ border: '1px solid var(--border-secondary)' }}
    >
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className="text-[11px] font-mono px-2.5 py-1 cursor-pointer transition-colors"
          style={{
            background: mode === o.v ? 'var(--bg-active)' : 'transparent',
            color: mode === o.v ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── 스키마 뷰 ─────────────────────────────────────────

function SchemaView({ schema, spec, seen = [] }: { schema?: OpenApiSchema; spec: OpenApiSpec; seen?: string[] }) {
  let target = schema
  let arrayWrapped = false
  const e = effective(schema, spec)
  if (e.type === 'array') {
    target = e.items
    arrayWrapped = true
  }
  const eff = effective(target, spec)
  const props = eff.properties

  if (!props || Object.keys(props).length === 0) {
    return (
      <div className="text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
        {typeLabel(schema)}
      </div>
    )
  }

  const required = new Set(eff.required || [])

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-secondary)', background: 'var(--bg-primary)' }}
    >
      {arrayWrapped && (
        <div
          className="px-3 py-1.5 text-[11px] font-mono"
          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-secondary)' }}
        >
          array of object
        </div>
      )}
      {Object.entries(props).map(([name, propSchema], i) => (
        <PropertyRow
          key={name}
          name={name}
          schema={propSchema}
          required={required.has(name)}
          spec={spec}
          seen={seen}
          isLast={i === Object.keys(props).length - 1}
        />
      ))}
    </div>
  )
}

function PropertyRow({
  name,
  schema,
  required,
  spec,
  seen,
  isLast,
}: {
  name: string
  schema: OpenApiSchema
  required: boolean
  spec: OpenApiSpec
  seen: string[]
  isLast: boolean
}) {
  const expandable = isExpandable(schema, spec)
  const refKey = schema.$ref
    ? refName(schema.$ref)
    : schema.type === 'array' && schema.items?.$ref
      ? refName(schema.items.$ref)
      : null
  const cyclic = refKey ? seen.includes(refKey) : false
  const [open, setOpen] = useState(false)
  const eff = effective(schema, spec)

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-secondary)' }}>
      <div
        className="flex items-start gap-2 px-3 py-2 text-[12px]"
        style={{ cursor: expandable && !cyclic ? 'pointer' : 'default' }}
        onClick={() => expandable && !cyclic && setOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
              {name}
            </span>
            {required && (
              <span className="text-[10px] font-medium" style={{ color: 'var(--accent-red)' }}>
                required
              </span>
            )}
            <span className="font-mono text-[11px]" style={{ color: 'var(--accent-blue)' }}>
              {typeLabel(schema)}
            </span>
            {expandable && !cyclic && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {open ? '▾' : '▸'}
              </span>
            )}
          </div>
          {eff.description && (
            <div className="mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
              {eff.description}
            </div>
          )}
          {eff.enum && (
            <div className="mt-0.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {eff.enum.join(' · ')}
            </div>
          )}
        </div>
      </div>
      {expandable && !cyclic && open && (
        <div className="px-3 pb-2.5 pl-5">
          <SchemaView schema={schema} spec={spec} seen={refKey ? [...seen, refKey] : seen} />
        </div>
      )}
    </div>
  )
}

// ── Try it 패널 ──────────────────────────────────────

function TryItPanel({
  endpoint,
  spec,
  project,
  token,
}: {
  endpoint: Endpoint
  spec: OpenApiSpec
  project: ApiProject
  token: string | null
}) {
  const { op, path, method } = endpoint
  const baseUrl = resolveBaseUrl(project, spec)
  const params = op.parameters || []
  const reqMedia = requestMedia(op)
  const reqMediaType = reqMedia?.[0] || null
  const reqSchema = reqMedia?.[1].schema
  const reqProps = useMemo(() => schemaProps(reqSchema, spec), [reqSchema, spec])
  const requiredFields = useMemo(() => new Set(effective(reqSchema, spec).required || []), [reqSchema, spec])

  const [paramVals, setParamVals] = useState<Record<string, string>>({})
  const [body, setBody] = useState<string>(() =>
    reqSchema && reqMediaType === 'application/json' ? JSON.stringify(genExample(reqSchema, spec), null, 2) : '',
  )
  const [formVals, setFormVals] = useState<Record<string, string>>({})
  const [fileVals, setFileVals] = useState<Record<string, FileList | null>>({})
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<TryResponse | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  const setParam = (name: string, v: string) => setParamVals((p) => ({ ...p, [name]: v }))
  const setForm = (name: string, v: string) => setFormVals((p) => ({ ...p, [name]: v }))
  const setFiles = (name: string, files: FileList | null) => setFileVals((p) => ({ ...p, [name]: files }))

  async function send() {
    setErrorText(null)
    setResponse(null)

    let url = appendPath(baseUrl, path)
    const query = new URLSearchParams()
    const headers: Record<string, string> = {}

    for (const p of params) {
      const v = paramVals[p.name] || ''
      if (!v) continue
      if (p.in === 'path') url = url.replace(`{${p.name}}`, encodeURIComponent(v))
      else if (p.in === 'query') query.set(p.name, v)
      else if (p.in === 'header') headers[p.name] = v
    }
    if ([...query].length > 0) url += '?' + query.toString()

    if (token) headers.Authorization = `Bearer ${token}`

    let bodyToSend: BodyInit | undefined
    if (reqSchema && reqMediaType === 'application/json' && body.trim()) {
      try {
        JSON.parse(body)
      } catch {
        toast.error('요청 바디 JSON이 올바르지 않아요')
        return
      }
      headers['Content-Type'] = 'application/json'
      bodyToSend = body
    } else if (reqSchema && reqMediaType === 'multipart/form-data') {
      const form = new FormData()
      for (const [name, schema] of Object.entries(reqProps)) {
        if (isFileSchema(schema, spec)) {
          const files = fileVals[name]
          if ((!files || files.length === 0) && requiredFields.has(name)) {
            toast.error(`${name} 파일을 선택해 주세요`)
            return
          }
          Array.from(files || []).forEach((file) => form.append(name, file))
        } else {
          const value = formVals[name]
          if (!value && requiredFields.has(name)) {
            toast.error(`${name} 값을 입력해 주세요`)
            return
          }
          if (value !== undefined && value !== '') form.append(name, value)
        }
      }
      bodyToSend = form
    } else if (reqSchema && reqMediaType === 'application/x-www-form-urlencoded') {
      const form = new URLSearchParams()
      for (const name of Object.keys(reqProps)) {
        const value = formVals[name]
        if (!value && requiredFields.has(name)) {
          toast.error(`${name} 값을 입력해 주세요`)
          return
        }
        if (value !== undefined && value !== '') form.set(name, value)
      }
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      bodyToSend = form
    }

    setSending(true)
    try {
      const res = await fetch(url, { method: method.toUpperCase(), headers, body: bodyToSend })
      const contentType = res.headers.get('content-type') || ''
      const disposition = res.headers.get('content-disposition') || ''
      if (res.ok && (disposition || shouldDownloadResponse(contentType, op))) {
        const blob = await res.blob()
        const filename = filenameFromResponse(res, path)
        downloadBlob(blob, filename)
        setResponse({ kind: 'download', status: res.status, ok: res.ok, filename, size: blob.size, contentType })
        toast.success(`${res.status} 다운로드 시작`)
        return
      }

      const text = await res.text()
      if (!text) {
        setResponse({ kind: 'empty', status: res.status, ok: res.ok })
        if (res.ok) toast.success(`${res.status} ${res.statusText || 'OK'}`)
        else toast.error(`${res.status} ${res.statusText || 'Error'}`)
        return
      }
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {}
      setResponse({ kind: 'json', status: res.status, ok: res.ok, body: parsed })
      if (res.ok) toast.success(`${res.status} ${res.statusText || 'OK'}`)
      else toast.error(`${res.status} ${res.statusText || 'Error'}`)
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : '요청 실패')
      toast.error('요청에 실패했어요 (네트워크 또는 CORS)')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3">
      {/* 파라미터 입력 */}
      {(['path', 'query', 'header'] as const).map((group) => {
        const list = params.filter((p) => p.in === group)
        if (list.length === 0) return null
        return (
          <div key={group} className="mt-4">
            <SectionTitle>{group} parameters</SectionTitle>
            <div className="space-y-1.5">
              {list.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <label className="text-[12px] font-mono w-32 shrink-0 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    {p.name}
                    {p.required && <span className="text-[10px]" style={{ color: 'var(--accent-red)' }}>*</span>}
                  </label>
                  <input
                    value={paramVals[p.name] || ''}
                    onChange={(e) => setParam(p.name, e.target.value)}
                    placeholder={typeLabel(p.schema)}
                    className="flex-1 text-[12px] rounded-md px-2.5 py-1.5 outline-none font-mono"
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-secondary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* 요청 바디 */}
      {reqSchema && reqMediaType === 'application/json' && (
        <div className="mt-4">
          <SectionTitle>Request Body (JSON)</SectionTitle>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            className="w-full text-[12px] font-mono rounded-md p-3 outline-none leading-relaxed"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-secondary)',
              color: 'var(--text-primary)',
              minHeight: 140,
              resize: 'vertical',
            }}
          />
        </div>
      )}

      {reqSchema && reqMediaType === 'multipart/form-data' && (
        <div className="mt-4">
          <SectionTitle>Form Data</SectionTitle>
          <div className="space-y-2">
            {Object.entries(reqProps).map(([name, schema]) => {
              const required = requiredFields.has(name)
              const file = isFileSchema(schema, spec)
              return (
                <div key={name} className="flex items-start gap-2">
                  <label className="text-[12px] font-mono w-36 shrink-0 flex items-center gap-1 pt-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {name}
                    {required && <span className="text-[10px]" style={{ color: 'var(--accent-red)' }}>*</span>}
                  </label>
                  {file ? (
                    <input
                      type="file"
                      multiple={effective(schema, spec).type === 'array'}
                      onChange={(e) => setFiles(name, e.currentTarget.files)}
                      className="flex-1 min-w-0 text-[12px] rounded-md px-2.5 py-1.5 outline-none"
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  ) : (
                    <input
                      value={formVals[name] || ''}
                      onChange={(e) => setForm(name, e.target.value)}
                      placeholder={typeLabel(schema)}
                      className="flex-1 min-w-0 text-[12px] rounded-md px-2.5 py-1.5 outline-none font-mono"
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {reqSchema && reqMediaType === 'application/x-www-form-urlencoded' && (
        <div className="mt-4">
          <SectionTitle>Form URL Encoded</SectionTitle>
          <div className="space-y-2">
            {Object.entries(reqProps).map(([name, schema]) => (
              <div key={name} className="flex items-center gap-2">
                <label className="text-[12px] font-mono w-36 shrink-0 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  {name}
                  {requiredFields.has(name) && <span className="text-[10px]" style={{ color: 'var(--accent-red)' }}>*</span>}
                </label>
                <input
                  value={formVals[name] || ''}
                  onChange={(e) => setForm(name, e.target.value)}
                  placeholder={typeLabel(schema)}
                  className="flex-1 min-w-0 text-[12px] rounded-md px-2.5 py-1.5 outline-none font-mono"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-secondary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 보내기 */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={send}
          disabled={sending}
          className="text-[12px] font-medium rounded-md px-3 py-1.5 cursor-pointer"
          style={{
            color: 'var(--accent-emerald)',
            background: 'var(--accent-emerald-bg)',
            border: '1px solid var(--accent-emerald-border)',
            opacity: sending ? 0.5 : 1,
          }}
        >
          {sending ? '보내는 중…' : `${method.toUpperCase()} 보내기`}
        </button>
        <span className="text-[11px]" style={{ color: token ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
          {token ? '✓ Bearer 토큰 자동 첨부됨' : '로그인 안 됨 — 인증 헤더 없이 호출'}
        </span>
      </div>

      {/* 응답 */}
      {(response || errorText) && (
        <div className="mt-4">
          <SectionTitle>Response</SectionTitle>
          {response?.kind === 'json' && (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-[12px] font-mono font-bold rounded px-1.5 py-0.5"
                  style={{
                    color: response.ok ? 'var(--accent-emerald)' : 'var(--accent-red)',
                    background: response.ok ? 'var(--accent-emerald-bg)' : 'var(--accent-red-bg)',
                  }}
                >
                  {response.status}
                </span>
              </div>
              <JsonBlock value={response.body} />
            </>
          )}
          {response?.kind === 'download' && (
            <div
              className="text-[12px] rounded-md p-3"
              style={{
                background: 'var(--accent-emerald-bg)',
                border: '1px solid var(--accent-emerald-border)',
                color: 'var(--accent-emerald)',
              }}
            >
              {response.status} · {response.filename} 다운로드 요청 완료
              {response.size > 0 ? ` (${Math.ceil(response.size / 1024)}KB)` : ''}
            </div>
          )}
          {response?.kind === 'empty' && (
            <div className="text-[12px] font-mono" style={{ color: response.ok ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
              {response.status} · empty response
            </div>
          )}
          {errorText && (
            <div
              className="text-[12px] rounded-md p-3"
              style={{
                background: 'var(--accent-red-bg)',
                border: '1px solid var(--accent-red-border)',
                color: 'var(--accent-red)',
              }}
            >
              {errorText}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 엔드포인트 카드 ──────────────────────────────────

function EndpointCard({
  endpoint,
  spec,
  project,
  token,
}: {
  endpoint: Endpoint
  spec: OpenApiSpec
  project: ApiProject
  token: string | null
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ViewMode>('schema')
  const { op, method, path } = endpoint
  const params = op.parameters || []
  const paramGroups = ['path', 'query', 'header'].filter((g) => params.some((p) => p.in === g))
  const reqSchema =
    op.requestBody?.content?.['application/json']?.schema ||
    (op.requestBody?.content ? Object.values(op.requestBody.content)[0]?.schema : undefined)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${open ? 'var(--border-hover)' : 'var(--border-secondary)'}`,
        background: 'var(--bg-card)',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors"
        style={{ background: open ? 'var(--bg-hover)' : 'transparent' }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <MethodBadge method={method} size="md" />
        <code className="text-[13px] font-mono shrink-0" style={{ color: 'var(--text-primary)' }}>
          {path}
        </code>
        {op.deprecated && (
          <span
            className="text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0"
            style={{ color: 'var(--accent-red)', background: 'var(--accent-red-bg)' }}
          >
            deprecated
          </span>
        )}
        {op.summary && (
          <span className="text-[12px] truncate" style={{ color: 'var(--text-tertiary)' }}>
            {op.summary}
          </span>
        )}
        <span className="ml-auto text-[12px] shrink-0" style={{ color: 'var(--text-muted)' }}>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div
          className="px-4 pb-5 pt-1 overflow-y-auto overscroll-contain"
          style={{ borderTop: '1px solid var(--border-secondary)', maxHeight: 'min(68vh, 720px)' }}
        >
          <div className="flex items-start gap-3 mt-3">
            <div className="flex-1 min-w-0">
              {op.description && (
                <p
                  className="text-[13px] leading-relaxed whitespace-pre-line"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {op.description}
                </p>
              )}
              {op.operationId && (
                <div className="mt-2 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  operationId: {op.operationId}
                </div>
              )}
            </div>
            <ViewToggle mode={mode} onChange={setMode} />
          </div>

          {mode === 'try' ? (
            <TryItPanel endpoint={endpoint} spec={spec} project={project} token={token} />
          ) : (
            <>
              {paramGroups.map((group) => (
                <div key={group} className="mt-5">
                  <SectionTitle>{group} parameters</SectionTitle>
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: '1px solid var(--border-secondary)', background: 'var(--bg-primary)' }}
                  >
                    {params
                      .filter((p) => p.in === group)
                      .map((p, i, arr) => (
                        <div
                          key={p.name}
                          className="px-3 py-2 text-[12px]"
                          style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-secondary)' }}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                              {p.name}
                            </span>
                            {p.required && (
                              <span className="text-[10px] font-medium" style={{ color: 'var(--accent-red)' }}>
                                required
                              </span>
                            )}
                            <span className="font-mono text-[11px]" style={{ color: 'var(--accent-blue)' }}>
                              {typeLabel(p.schema)}
                            </span>
                          </div>
                          {p.description && (
                            <div className="mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                              {p.description}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {reqSchema && (
                <div className="mt-5">
                  <SectionTitle>Request Body{op.requestBody?.required ? ' · required' : ''}</SectionTitle>
                  {mode === 'json' ? (
                    <JsonBlock value={genExample(reqSchema, spec)} />
                  ) : (
                    <SchemaView schema={reqSchema} spec={spec} />
                  )}
                </div>
              )}

              {op.responses && Object.keys(op.responses).length > 0 && (
                <div className="mt-5">
                  <SectionTitle>Responses</SectionTitle>
                  <div className="space-y-3">
                    {Object.entries(op.responses).map(([code, res]) => {
                      const resSchema =
                        res.content?.['application/json']?.schema ||
                        (res.content ? Object.values(res.content)[0]?.schema : undefined)
                      const ok = code.startsWith('2')
                      return (
                        <div key={code}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-[12px] font-mono font-bold rounded px-1.5 py-0.5"
                              style={{
                                color: ok ? 'var(--accent-emerald)' : 'var(--accent-red)',
                                background: ok ? 'var(--accent-emerald-bg)' : 'var(--accent-red-bg)',
                              }}
                            >
                              {code}
                            </span>
                            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                              {res.description}
                            </span>
                          </div>
                          {resSchema &&
                            (mode === 'json' ? (
                              <JsonBlock value={genExample(resSchema, spec)} />
                            ) : (
                              <SchemaView schema={resSchema} spec={spec} />
                            ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── 인증 바 ─────────────────────────────────────────

function AuthBar({
  project,
  auth,
  onLogin,
  onLogout,
}: {
  project: ApiProject
  auth: AuthState | null
  onLogin: (id: string, password: string) => Promise<void>
  onLogout: () => void
}) {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  if (auth) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1"
          style={{
            color: 'var(--accent-emerald)',
            background: 'var(--accent-emerald-bg)',
            border: '1px solid var(--accent-emerald-border)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-mono truncate max-w-[120px]">{auth.user}</span>
        </div>
        <button
          onClick={onLogout}
          className="text-[11px] rounded-md px-2.5 py-1 cursor-pointer"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'var(--accent-red-border)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-secondary)' }}
        >
          로그아웃
        </button>
      </div>
    )
  }

  const submit = async () => {
    if (!id || !pw) {
      toast.error('ID와 비밀번호를 입력해 주세요')
      return
    }
    setBusy(true)
    try {
      await onLogin(id, pw)
      setPw('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void submit() }}
      className="flex items-center gap-1.5 shrink-0"
    >
      <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="ID"
        autoComplete="username"
        className="text-[12px] rounded-md px-2.5 py-1.5 outline-none w-28"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)' }}
      />
      <input
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        type="password"
        placeholder="비밀번호"
        autoComplete="current-password"
        className="text-[12px] rounded-md px-2.5 py-1.5 outline-none w-32"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)' }}
      />
      <button
        type="submit"
        disabled={busy}
        className="text-[12px] font-medium rounded-md px-3 py-1.5 cursor-pointer shrink-0"
        style={{
          color: 'var(--accent-emerald)',
          background: 'var(--accent-emerald-bg)',
          border: '1px solid var(--accent-emerald-border)',
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? '로그인 중…' : '로그인'}
      </button>
    </form>
  )
}

// ── 프로젝트 선택 드롭다운 ───────────────────────────

function ProjectPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = getApiProject(value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[12px] rounded-md px-2.5 py-1.5 cursor-pointer max-w-[220px]"
        style={{
          color: 'var(--text-secondary)',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-secondary)',
        }}
      >
        <span className="font-medium truncate">{current?.name || value}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>▾</span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-30 rounded-lg py-1 min-w-[180px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
        >
          {API_PROJECTS.map((p) => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false) }}
              className="w-full text-left text-[12px] px-3 py-1.5 cursor-pointer"
              style={{
                color: p.id === value ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: p.id === value ? 'var(--bg-active)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (p.id !== value) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { if (p.id !== value) e.currentTarget.style.background = 'transparent' }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 페이지 ────────────────────────────────────────────

const PROJECT_STORAGE_KEY = 'api-explorer-project'
const tokenKey = (pid: string) => `api-explorer-token-${pid}`
const userKey = (pid: string) => `api-explorer-user-${pid}`

export default function ApiPage() {
  const [projectId, setProjectId] = useState<string>(API_PROJECTS[0].id)
  const [spec, setSpec] = useState<OpenApiSpec | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showTop, setShowTop] = useState(false)
  const [auth, setAuth] = useState<AuthState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const project = useMemo(() => getApiProject(projectId) || API_PROJECTS[0], [projectId])
  const baseUrl = useMemo(() => resolveBaseUrl(project, spec), [project, spec])
  const loginEndpoint = useMemo(() => findLoginEndpoint(project, spec), [project, spec])

  // 초기 — 저장된 프로젝트 선택 복원
  useEffect(() => {
    const saved = localStorage.getItem(PROJECT_STORAGE_KEY)
    if (saved && getApiProject(saved)) setProjectId(saved)
  }, [])

  // 프로젝트 변경 — 저장된 토큰 복원
  useEffect(() => {
    const t = localStorage.getItem(tokenKey(projectId))
    const u = localStorage.getItem(userKey(projectId))
    setAuth(t && u ? { token: t, user: u } : null)
  }, [projectId])

  const loadSpec = useCallback((p: ApiProject) => {
    setLoading(true)
    setError(null)
    setSpec(null)
    fetch(p.specUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: OpenApiSpec) => setSpec(data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '스펙을 불러오지 못했어요'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadSpec(project)
  }, [project, loadSpec])

  const onProjectChange = (id: string) => {
    setProjectId(id)
    localStorage.setItem(PROJECT_STORAGE_KEY, id)
  }

  const onLogin = useCallback(
    async (id: string, password: string) => {
      const login = findLoginEndpoint(project, spec)
      if (!login) {
        toast.error('이 스펙에서 로그인 API를 찾지 못했어요')
        return
      }

      const idField = project.loginIdField || inferField(login.schema, spec || {}, ['id', 'loginId', 'userId', 'username', 'email', 'adminId'], 'id')
      const passwordField = project.loginPasswordField || inferField(login.schema, spec || {}, ['password', 'pw', 'passwd'], 'password')
      const loginBody = {
        [idField]: id,
        [passwordField]: password,
        ...(project.loginExtras || {}),
      }

      try {
        const headers: Record<string, string> = {}
        let body: BodyInit

        if (login.mediaType.includes('multipart/form-data')) {
          const form = new FormData()
          Object.entries(loginBody).forEach(([key, value]) => form.append(key, String(value)))
          body = form
        } else {
          headers['Content-Type'] = 'application/json'
          body = JSON.stringify(loginBody)
        }

        const res = await fetch(appendPath(resolveBaseUrl(project, spec), login.path), {
          method: login.method.toUpperCase(),
          headers,
          body,
        })
        const text = await res.text()
        let data: unknown
        try { data = JSON.parse(text) } catch { data = text }
        if (!res.ok) {
          const msg = (data && typeof data === 'object' && 'message' in data) ? String((data as { message: unknown }).message) : `HTTP ${res.status}`
          toast.error(`로그인 실패: ${msg}`)
          return
        }
        const token = extractToken(data)
        if (!token) {
          toast.error('응답에서 토큰을 찾지 못했어요')
          return
        }
        localStorage.setItem(tokenKey(projectId), token)
        localStorage.setItem(userKey(projectId), id)
        setAuth({ token, user: id })
        toast.success('로그인 성공')
      } catch (e) {
        toast.error('로그인 요청 실패 (네트워크 또는 CORS)')
        console.error(e)
      }
    },
    [project, projectId, spec],
  )

  const onLogout = useCallback(() => {
    localStorage.removeItem(tokenKey(projectId))
    localStorage.removeItem(userKey(projectId))
    setAuth(null)
    toast.success('로그아웃 됐어요')
  }, [projectId])

  const endpoints = useMemo<Endpoint[]>(() => {
    if (!spec?.paths) return []
    const list: Endpoint[] = []
    for (const [path, ops] of Object.entries(spec.paths)) {
      for (const method of METHODS) {
        const op = ops[method]
        if (!op) continue
        list.push({ id: `${method} ${path}`, path, method, op, tag: op.tags?.[0] || 'Other' })
      }
    }
    return list
  }, [spec])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return endpoints
    return endpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.op.summary?.toLowerCase().includes(q) ||
        e.method.includes(q),
    )
  }, [endpoints, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>()
    for (const e of filtered) {
      const arr = map.get(e.tag) || []
      arr.push(e)
      map.set(e.tag, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const tagDesc = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of spec?.tags || []) if (t.description) map[t.name] = t.description
    return map
  }, [spec])

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 400)}
      className="flex-1 overflow-y-auto relative"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* 상단 고정 헤더 */}
      <div
        className="sticky top-0 z-10"
        style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-primary)' }}
      >
        <div className="max-w-5xl mx-auto px-8 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <ProjectPicker value={projectId} onChange={onProjectChange} />
            <div className="min-w-0 flex items-center gap-2">
              <h1 className="text-[15px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {spec?.info?.title || 'API Explorer'}
              </h1>
            </div>
            {spec?.info?.version && (
              <span
                className="text-[10px] font-mono rounded px-1.5 py-0.5 shrink-0"
                style={{
                  color: 'var(--text-muted)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-secondary)',
                }}
              >
                v{spec.info.version}
              </span>
            )}
            <div className="ml-auto min-w-0">
              <AuthBar project={project} auth={auth} onLogin={onLogin} onLogout={onLogout} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="경로·이름·메서드 검색"
              className="flex-1 min-w-0 text-[13px] rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-secondary)',
                color: 'var(--text-primary)',
              }}
            />
            <div
              className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono rounded-lg px-2.5 py-2 max-w-[420px] shrink-0"
              style={{
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-secondary)',
              }}
            >
              <span className="truncate max-w-[230px]">{baseUrl || 'base URL 미확인'}</span>
              {loginEndpoint && (
                <>
                  <span style={{ color: 'var(--border-hover)' }}>/</span>
                  <span className="truncate max-w-[150px]">login {loginEndpoint.path}</span>
                </>
              )}
            </div>
          </div>

          {/* 태그 칩 */}
          {!query && grouped.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {grouped.map(([tag, items]) => (
                <button
                  key={tag}
                  onClick={() => document.getElementById(slugify(tag))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="text-[11px] rounded-full px-2.5 py-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-secondary)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {tag} <span style={{ color: 'var(--text-muted)' }}>{items.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <div
              className="w-7 h-7 rounded-full animate-spin"
              style={{ border: '2.5px solid var(--border-primary)', borderTopColor: 'var(--accent-emerald)' }}
            />
            <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              API 스펙을 불러오는 중…
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="text-center max-w-sm mx-auto py-16">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--accent-red-bg)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              API 스펙을 불러오지 못했어요
            </h2>
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-tertiary)' }}>
              {error}
            </p>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
              CORS 차단이거나 dev 서버에 접근할 수 없는 상태일 수 있어요.
            </p>
            <button
              onClick={() => loadSpec(project)}
              className="text-[13px] rounded-md px-3 py-1.5 cursor-pointer"
              style={{ color: 'var(--accent-emerald)', background: 'var(--accent-emerald-bg)', border: '1px solid var(--accent-emerald-border)' }}
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && spec && (
          <>
            {grouped.length === 0 && (
              <div className="text-center text-[13px] py-20" style={{ color: 'var(--text-muted)' }}>
                일치하는 API가 없어요
              </div>
            )}
            {grouped.map(([tag, items]) => (
              <section key={tag} id={slugify(tag)} className="mb-10 scroll-mt-32">
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {tag}
                  <span className="ml-2 text-[12px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    {items.length}
                  </span>
                </h2>
                {tagDesc[tag] && (
                  <p className="text-[12px] mt-0.5 mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    {tagDesc[tag]}
                  </p>
                )}
                <div className="space-y-2 mt-3">
                  {items.map((e) => (
                    <EndpointCard
                      key={e.id}
                      endpoint={e}
                      spec={spec}
                      project={project}
                      token={auth?.token || null}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      {/* 맨 위로 버튼 */}
      <button
        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="맨 위로"
        className="fixed bottom-6 right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-md)',
          color: 'var(--text-secondary)',
          opacity: showTop ? 1 : 0,
          transform: showTop ? 'translateY(0)' : 'translateY(8px)',
          pointerEvents: showTop ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  )
}
