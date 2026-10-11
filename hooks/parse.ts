// Pure helpers: reading the desktop app's session texts, merging what they say
// into the crew, and picking faces. No `$` here, so tests can call them directly.

import type { CrewImport, CrewListed, CrewSession, CrewStatus } from '../types'
import { ROTATION, costumeKey } from './crab'

export type Patch = {
  id?: string
  taskId?: string
  name?: string
  title?: string
  status?: CrewStatus
  note?: string
  isImported?: boolean
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
/** A list_sessions row, or one the model passed to the sync tool. */
export type Listed = CrewListed

type ListedRow = {
  sessionId?: string
  id?: string
  title?: string
  name?: string
  isRunning?: boolean
  isArchived?: boolean
  startedBy?: string
  prNumber?: number
  status?: string
}

/** Rows as the app or the model hands them: `sessionId` or `id`, other fields kept when well-typed. */
export function normalizeListed(rows: readonly unknown[]): Listed[] {
  return rows
    .map(r => r as ListedRow)
    .filter(r => r && typeof r === 'object')
    .map(r => ({ ...r, id: typeof r.sessionId === 'string' ? r.sessionId : r.id }))
    .filter((r): r is ListedRow & { id: string } => typeof r.id === 'string' && r.id.startsWith('local_'))
    .map(r => ({
      id: r.id,
      name: typeof r.name === 'string' ? r.name : undefined,
      title: typeof r.title === 'string' ? r.title : undefined,
      isRunning: typeof r.isRunning === 'boolean' ? r.isRunning : undefined,
      isArchived: typeof r.isArchived === 'boolean' ? r.isArchived : undefined,
      startedBy: typeof r.startedBy === 'string' ? r.startedBy : undefined,
      prNumber: typeof r.prNumber === 'number' ? r.prNumber : undefined,
      status: typeof r.status === 'string' ? r.status : undefined,
    }))
}

const isSessionRow = (v: unknown): boolean =>
  !!v && typeof v === 'object' && !Array.isArray(v) && (typeof (v as ListedRow).sessionId === 'string' || typeof (v as ListedRow).id === 'string')

/**
 * The rows of a list_sessions result (a JSON array of session rows) or a
 * get_session one (one session object); null for anything else, an error
 * object or a list holding something that is no session, so neither reads as
 * a valid empty list (which would mark every imported session archived).
 */
export function parseListing(text: string): Listed[] | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (Array.isArray(data)) return data.every(isSessionRow) ? normalizeListed(data) : null
  return isSessionRow(data) ? normalizeListed([data]) : null
}

const listedStatus = (r: Listed): CrewStatus =>
  r.isArchived ? 'done' : r.status ? statusOf(r.status) : r.isRunning ? 'working' : 'idle'

export const listedToPatch = (r: Listed): Patch => ({
  id: r.id,
  name: r.name,
  title: r.title,
  status: listedStatus(r),
  note: r.prNumber ? `PR #${r.prNumber}` : undefined,
  isImported: true,
})

export function parseListedSessions(text: string): Patch[] {
  return (parseListing(text) ?? []).map(listedToPatch)
}

// --- importing sessions that predate this one ------------------------------

/** `parent`: only sessions that id started; `match`: a glob on name or title. */
export type ImportFilter = CrewImport

/**
 * `/crew import` arguments: nothing for every open session, `parent <id>`,
 * a glob, `--archived`; `off` stops importing. Any order.
 */
export function parseImportArgs(words: readonly string[]): ImportFilter | 'off' | { error: string } {
  if (words.length === 1 && words[0] === 'off') return 'off'
  const f: ImportFilter = {}
  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? ''
    if (w === '--archived' || w === 'archived') f.includeArchived = true
    else if (w === 'parent' || w === '--parent') {
      const id = words[++i]
      if (!id?.startsWith('local_')) return { error: 'parent needs a local_… session id' }
      f.parent = id
    } else if (w.startsWith('local_')) f.parent = w
    else if (w === 'all') continue
    else if (f.match) return { error: `one glob at a time (got ${f.match} and ${w})` }
    else f.match = w
  }
  return f
}

export const describeFilter = (f: ImportFilter): string =>
  [f.parent ? `started by ${f.parent}` : '', f.match ? `matching ${f.match}` : '', f.includeArchived ? 'archived included' : '']
    .filter(Boolean)
    .join(', ') || 'every open session'

const ARCHIVED = 'archived'

/**
 * Imported sessions a complete list of the open sessions leaves out have been
 * archived (or deleted): they are done. Without this one archived while
 * working would show working for good, since nothing else reports it.
 */
export function missingAsArchived(crew: readonly CrewSession[], rows: readonly Listed[]): Patch[] {
  const listed = new Set(rows.map(r => r.id))
  return crew
    .filter(s => s.isImported && s.id.startsWith('local_') && !listed.has(s.id) && s.status !== 'done' && s.status !== 'dismissed')
    .map(s => ({ id: s.id, status: 'done' as const, note: ARCHIVED }))
}

/** An imported session still in play, which only list_sessions keeps up to date. */
export const isLiveImport = (s: CrewSession): boolean => !!s.isImported && s.status !== 'done' && s.status !== 'dismissed'

export function selectForImport(rows: readonly Listed[], f: ImportFilter): Listed[] {
  const re = f.match ? globRe(f.match) : null
  return rows.filter(
    r =>
      (f.includeArchived || !r.isArchived) &&
      (!f.parent || r.startedBy === f.parent) &&
      (!re || re.test(r.name ?? '') || re.test(r.title ?? '')),
  )
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
export function upsert(input: CrewSession[], p: Patch, at: number, source: string, weak = false): CrewSession[] {
  let list = input
  const matches = (s: CrewSession): boolean =>
    !!((p.id && (s.id === p.id || s.taskId === p.id)) || (p.taskId && (s.id === p.taskId || s.taskId === p.taskId)) || (!p.id && p.name && s.name === p.name))
  // A proposal and the session it became may both be rows already (one seen proposed, one
  // imported); a patch that links them folds the later into the earlier, which keeps its crab.
  const hits = list.flatMap((s, i) => (matches(s) ? [i] : []))
  if (hits.length > 1) {
    const [first = 0, ...rest] = hits
    const keep = list[first] as CrewSession
    const merged = rest.reduce<CrewSession>((acc, i) => {
      const o = list[i] as CrewSession
      return {
        ...acc,
        id: acc.id.startsWith('local_') ? acc.id : o.id,
        taskId: acc.taskId ?? o.taskId,
        name: acc.name || o.name,
        title: acc.title || o.title,
        status: o.changedAt > acc.changedAt ? o.status : acc.status,
        changedAt: Math.max(acc.changedAt, o.changedAt),
        costume: acc.costume ?? o.costume,
      }
    }, keep)
    list = list.flatMap((s, i) => (i === first ? [merged] : rest.includes(i) ? [] : [s]))
  }
  const idx = list.findIndex(matches)
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
      ...(p.isImported ? { isImported: true as const } : {}),
      slot: list.reduce((m, r) => Math.max(m, (r.slot ?? -1) + 1), 0),
    }
    return [...list, row].slice(-100)
  }
  const prev = list[idx] as CrewSession
  let status = p.status ?? prev.status
  // A list knows running or not, never done: it doesn't undo a done, except one it inferred
  // itself from an archive (`missingAsArchived`) that was since undone.
  if (weak && prev.status === 'done' && status === 'idle' && prev.note !== ARCHIVED) status = 'done'
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

// --- costumes --------------------------------------------------------------

export const globRe = (pattern: string): RegExp =>
  new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')

/** `pattern=costume` lines (the `faces` option) into ordered pairs. */
export const parseFaceRules = (lines: readonly string[] | string | undefined): [string, string][] =>
  (typeof lines === 'string' ? lines.split(/[,\n]/) : (lines ?? []))
    .map(l => {
      const i = l.indexOf('=')
      return i > 0 ? ([l.slice(0, i).trim(), l.slice(i + 1).trim()] as [string, string]) : null
    })
    .filter((r): r is [string, string] => !!r && !!r[0] && !!r[1])

/**
 * One costume per session: the first rule whose pattern matches its name,
 * title or id (rules set with /crew face come first), else the next costume in
 * the rotation: the `costume` it got when it first joined any crew (see
 * `giveCostumes`), else by the order it joined this one (its `slot`), so a
 * session keeps its crab whatever its status and whatever joins or leaves.
 */
export function assignCostumes(crew: readonly CrewSession[], rules: [string, string][]): Map<string, string> {
  const compiled = rules
    .map(([p, name]) => [globRe(p), costumeKey(name)] as const)
    .filter((r): r is readonly [RegExp, string] => r[1] !== undefined)
  const out = new Map<string, string>()
  crew.forEach((s, i) => {
    const hit = compiled.find(([re]) => re.test(s.name) || re.test(s.title) || re.test(s.id))
    out.set(s.id, hit ? hit[1] : s.costume ?? ROTATION[(s.slot ?? i) % ROTATION.length] ?? 'other')
  })
  return out
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

/** Costumes handed out so far, by session id, kept in $.store across sessions. */
export type CostumeBook = { byId: Record<string, string>; next: number }

/** Another session may have written the book meanwhile: keep its entries and its count too. */
export const mergeBooks = (stored: CostumeBook, mine: CostumeBook): CostumeBook => ({
  byId: { ...stored.byId, ...mine.byId },
  next: Math.max(stored.next, mine.next),
})

/**
 * Gives each row without a costume the one the book has for it, else the next
 * in the rotation, writing that into the book. Returns null when nothing changed.
 */
export function giveCostumes(list: CrewSession[], book: CostumeBook): { list: CrewSession[]; book: CostumeBook } | null {
  // A proposal that became a session keeps its crab, and the book learns its new id.
  if (list.every(s => s.costume && book.byId[s.id] === s.costume)) return null
  const byId = { ...book.byId }
  let next = book.next
  const out = list.map(s => {
    if (s.costume) {
      byId[s.id] = s.costume
      return s
    }
    const key = s.taskId && byId[s.taskId] ? s.taskId : s.id
    let costume = byId[key]
    if (!costume) {
      costume = ROTATION[next % ROTATION.length] ?? 'other'
      next++
    }
    byId[s.id] = costume
    return { ...s, costume }
  })
  // Keep the book small: the newest 500.
  const ids = Object.keys(byId)
  for (const id of ids.slice(0, Math.max(0, ids.length - 500))) delete byId[id]
  return { list: out, book: { byId, next } }
}
