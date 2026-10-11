// Pure helpers: reading the desktop app's session texts, merging what they say
// into the crew, and picking faces. No `$` here, so tests can call them directly.

import type { CrewSession, CrewStatus } from '../types'

export type Patch = {
  id?: string
  taskId?: string
  name?: string
  title?: string
  status?: CrewStatus
  note?: string
}

// --- what the app's tools answer ------------------------------------------

// `Started session "T" (session_id: local_…, name: n). It runs on its own…`
const STARTED = /Started session "([^"]*)" \(session_id: (local_[0-9a-f-]+), name: ([^)\s]+)\)/
// `Proposed "T" (task_id: task_…). The user sees a card…`
const PROPOSED = /Proposed "([^"]*)" \(task_id: (task_[0-9a-z]+)\)/

export function parseStartResult(text: string, proposalId?: string): Patch | null {
  const s = STARTED.exec(text)
  if (s) return { id: s[2], name: s[3], title: s[1], status: 'working', taskId: proposalId }
  const p = PROPOSED.exec(text)
  if (p) return { id: p[2], title: p[1], name: slug(p[1] ?? ''), status: 'proposed' }
  return null
}

export const isWithdrawn = (text: string): boolean => /withdrawn/i.test(text)

// --- what the app writes into incoming prompts -----------------------------

const STATUS_WORDS: Record<string, CrewStatus> = {
  working: 'working',
  running: 'working',
  busy: 'working',
  idle: 'idle',
  waiting: 'idle',
  stopped: 'idle',
  failed: 'idle',
  done: 'done',
  completed: 'done',
  archived: 'done',
}

export const statusOf = (word: string): CrewStatus => STATUS_WORDS[word.trim().toLowerCase()] ?? 'idle'

// `Linked sessions now (status, not an instruction): a = local_… (idle); b = local_… (done, PR #199). To message one, …`
const LINKED = /Linked sessions now[^:]*:\s*([\s\S]*?)(?:\.\s+To message one|<\/system-reminder>|$)/
const LINKED_ENTRY = /^\s*([^=;]+?)\s*=\s*(local_[0-9a-f-]+)\s*\(([^)]*)\)\s*$/

export function parseLinkedNote(text: string): Patch[] {
  const m = LINKED.exec(text)
  if (!m) return []
  const out: Patch[] = []
  for (const part of (m[1] ?? '').split(';')) {
    const e = LINKED_ENTRY.exec(part)
    if (!e) continue
    const [word = '', ...rest] = (e[3] ?? '').split(',').map(s => s.trim())
    out.push({ name: e[1], id: e[2], status: statusOf(word), note: rest.join(', ') || undefined })
  }
  return out
}

// `The user started your proposal task_… ("T") as session local_….`
const PROPOSAL_STARTED = /The user started your proposal (task_[0-9a-z]+) \("([^"]*)"\) as session (local_[0-9a-f-]+)/g

export function parseProposalsStarted(text: string): Patch[] {
  return [...text.matchAll(PROPOSAL_STARTED)].map(m => ({ taskId: m[1], title: m[2], id: m[3], status: 'working' as const }))
}

// `list_sessions` / `get_session`: a JSON array, or one object.
type ListedSession = {
  sessionId?: string
  title?: string
  name?: string
  isRunning?: boolean
  isArchived?: boolean
}

export function parseListedSessions(text: string): Patch[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return []
  }
  const rows = (Array.isArray(data) ? data : [data]) as ListedSession[]
  return rows
    .filter(r => r && typeof r.sessionId === 'string' && r.sessionId.startsWith('local_'))
    .map(r => ({
      id: r.sessionId,
      name: r.name,
      title: r.title,
      status: r.isArchived ? 'done' : r.isRunning ? 'working' : 'idle',
    }))
}

/** Everything a user-side row says about sessions, in the order it should apply. */
export function parsePromptText(text: string): Patch[] {
  if (!text.includes('local_')) return []
  return [...parseProposalsStarted(text), ...parseLinkedNote(text)]
}

// --- merging ---------------------------------------------------------------

/** Like the app's own handles: `prototype-a-sessions-pan`. */
export const slug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 24)
    .replace(/-+$/, '') || 'session'

const isEnded = (s: CrewStatus): boolean => s === 'done' || s === 'dismissed'

/**
 * Merges one patch. `weak` sources (a poll, a list) only know running or not,
 * so they never turn a done session back to idle.
 */
export function upsert(list: CrewSession[], p: Patch, at: number, source: string, weak = false): CrewSession[] {
  const idx = list.findIndex(
    s => (p.id && (s.id === p.id || s.taskId === p.id)) || (p.taskId && (s.id === p.taskId || s.taskId === p.taskId)) || (!p.id && p.name && s.name === p.name),
  )
  if (idx < 0) {
    if (!p.id) return list
    const status = p.status ?? 'idle'
    const row: CrewSession = {
      id: p.id,
      taskId: p.taskId,
      name: p.name || slug(p.title ?? p.id),
      title: p.title ?? '',
      status,
      startedAt: at,
      changedAt: at,
      endedAt: isEnded(status) ? at : undefined,
      note: p.note,
      source,
    }
    return [...list, row].slice(-100)
  }
  const prev = list[idx] as CrewSession
  let status = p.status ?? prev.status
  if (weak && prev.status === 'done' && status === 'idle') status = 'done'
  if (prev.status === 'dismissed' && status === 'proposed') status = 'dismissed'
  const changed = status !== prev.status
  const next: CrewSession = {
    ...prev,
    id: p.id && p.id.startsWith('local_') ? p.id : prev.id,
    taskId: p.taskId ?? prev.taskId ?? (prev.id.startsWith('task_') && p.id?.startsWith('local_') ? prev.id : undefined),
    name: p.name || prev.name,
    title: p.title || prev.title,
    status,
    changedAt: changed ? at : prev.changedAt,
    endedAt: isEnded(status) ? (changed ? at : prev.endedAt ?? at) : undefined,
    note: weak ? prev.note : p.note ?? (changed ? undefined : prev.note),
    source,
  }
  // A proposal that became a session runs from when it started.
  if (prev.status === 'proposed' && status === 'working') next.startedAt = at
  return list.map((s, i) => (i === idx ? next : s))
}

export const upsertAll = (list: CrewSession[], patches: Patch[], at: number, source: string, weak = false): CrewSession[] =>
  patches.reduce((l, p) => upsert(l, p, at, source, weak), list)

// --- faces -----------------------------------------------------------------

export const ANIMALS = [
  '🦊', '🐙', '🦉', '🐢', '🦀', '🐼', '🐸', '🦔', '🐧', '🦦',
  '🐝', '🦄', '🐨', '🦥', '🐳', '🦩', '🦝', '🐯', '🐰', '🐹',
  '🦁', '🐻', '🐮', '🐷', '🐵', '🐲', '🦖', '🐞', '🦋', '🐬',
] as const

const hash = (s: string): number => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ (ch.codePointAt(0) ?? 0), 16777619)
  return h >>> 0
}

const globRe = (pattern: string): RegExp =>
  new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')

/** `pattern=face` lines (the `faces` option) into ordered pairs. */
export const parseFaceRules = (lines: readonly string[] | string | undefined): [string, string][] =>
  (typeof lines === 'string' ? lines.split(/[,\n]/) : (lines ?? []))
    .map(l => {
      const i = l.indexOf('=')
      return i > 0 ? ([l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string]) : null
    })
    .filter((r): r is [string, string] => !!r && !!r[0] && !!r[1])

/**
 * One face per session: a rule set with /crew face first, then the option's
 * rules, then an animal picked by the name's hash, stepping past animals the
 * crew already shows so two sessions rarely share one. Pass the crew in the
 * order it joined (state order): earlier sessions keep their animal when two
 * hash to the same one, whatever their status.
 */
export function assignFaces(crew: readonly CrewSession[], rules: [string, string][]): Map<string, string> {
  const out = new Map<string, string>()
  const used = new Set<string>()
  const compiled = rules.map(([p, f]) => [globRe(p), f] as const)
  const free: CrewSession[] = []
  for (const s of crew) {
    const hit = compiled.find(([re]) => re.test(s.name) || re.test(s.title) || re.test(s.id))
    if (hit) {
      out.set(s.id, hit[1])
      used.add(hit[1])
    } else free.push(s)
  }
  for (const s of free) {
    const start = hash(s.taskId ?? s.id)
    let face: string = ANIMALS[start % ANIMALS.length] ?? '🦊'
    for (let k = 0; k < ANIMALS.length && used.has(face); k++) face = ANIMALS[(start + k + 1) % ANIMALS.length] ?? face
    out.set(s.id, face)
    used.add(face)
  }
  return out
}

/** An emoji or a short glyph is drawn large; anything longer is ASCII art. */
export const isAsciiFace = (face: string): boolean => [...face].length > 2 && /[\x21-\x7e]/.test(face)

/** ASCII faces close their eyes asleep and grin at the party. */
export function faceFor(face: string, status: CrewStatus): string {
  if (!isAsciiFace(face)) return face
  if (status === 'idle') return face.replace(/[oO0•°·*@^ºò]/g, '-')
  if (status === 'done') return face.replace(/[oO0•°·*@ºò-]/g, '^')
  return face
}

// --- formatting --------------------------------------------------------------

export const fmtTime = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export const fmtAgo = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

/** Working and done show the run's length; idle and proposed how long since it changed. */
export function timeLabel(s: CrewSession, at: number): string {
  if (s.status === 'working') return fmtTime(Math.max(at, s.startedAt) - s.startedAt)
  if (s.status === 'done') return fmtTime((s.endedAt ?? at) - s.startedAt)
  if (s.status === 'idle') return `idle ${fmtAgo(at - s.changedAt)}`
  return fmtAgo(at - s.changedAt)
}
