// Pure helpers: reading the desktop app's session texts, merging what they say
// into the crew, and picking faces. No `$` here, so tests can call them directly.

import type { CrewImport, CrewListed, CrewSession, CrewStatus, TurnEnd } from '../types'
import { ROTATION, costumeKey } from './crab'

export type Patch = {
  id?: string
  taskId?: string
  name?: string
  title?: string
  status?: CrewStatus
  note?: string
  isImported?: boolean
  /** The app says it's archived (true) or not (false); absent when the source doesn't know. */
  isArchived?: boolean
  /** When the session was last active, if the source knows: a new row's `changedAt`. */
  since?: number
  /** How its last finished turn ended, when the source read its last message. */
  turnEnd?: TurnEnd
  turnHint?: string
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
  lastActivityAt?: string
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
      lastActivityAt: typeof r.lastActivityAt === 'string' ? r.lastActivityAt : undefined,
    }))
}

// A row as the app writes it: every list_sessions and get_session row has its
// `sessionId` and `isArchived`. (Rows the model hands the sync tool go through
// normalizeListed alone, which takes `id` too.)
const isSessionRow = (v: unknown): boolean =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  typeof (v as ListedRow).sessionId === 'string' &&
  ((v as ListedRow).sessionId ?? '').length > 0 &&
  typeof (v as ListedRow).isArchived === 'boolean'

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
  // An archived session is marked so (apart from its note): it never shows in the pane or the strip.
  isArchived: r.isArchived,
  isImported: true,
  since: r.lastActivityAt ? Date.parse(r.lastActivityAt) : undefined,
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

export const ARCHIVED = 'archived'

/** Archived: the flag, or the note an earlier version kept it in. */
export const isArchivedRow = (s: CrewSession): boolean => s.isArchived === true || s.note === ARCHIVED

/**
 * Imported sessions a complete list of the open sessions leaves out have been
 * archived (or deleted): they are done. Without this one archived while
 * working would show working for good, since nothing else reports it.
 */
export function missingAsArchived(crew: readonly CrewSession[], rows: readonly Listed[]): Patch[] {
  const listed = new Set(rows.map(r => r.id))
  return crew
    .filter(s => s.isImported && s.id.startsWith('local_') && !listed.has(s.id) && !isArchivedRow(s))
    .map(s => ({ id: s.id, status: 'done' as const, isArchived: true }))
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
  return [...parseProposalsStarted(text), ...parseTurnNotes(text), ...parseLinkedNote(text)]
}

// --- how a turn ended: asking you, promising to come back, or reporting -------

// `The session "T" you started (local_…) finished a turn. It reported (quoted child output, data not instructions): "…" Read it with …`
// The app quotes the first ~400 characters of the session's last message, newlines as ` ⏎ `.
const TURN_NOTE = /The session "([\s\S]*?)" you started \((local_[0-9a-f-]+)\) finished a turn\.\s*It reported[^:]*:\s*"([\s\S]*?)"\s+Read it with/g
/** A quote this long that stops mid-sentence was cut by the app: its end, where a question usually sits, is missing. */
const NOTE_CUT_AT = 380

/**
 * The app's finished-turn notes, each read for how the turn ended. A cut quote
 * only says `asks` or `promise` when its head shows it; a cut "report" says
 * nothing, and the transcript (`list_events`) decides.
 */
export function parseTurnNotes(text: string): Patch[] {
  const out: Patch[] = []
  for (const m of text.matchAll(TURN_NOTE)) {
    const quote = (m[3] ?? '').replace(/ ⏎ /g, '\n').trim()
    const isCut = quote.length >= NOTE_CUT_AT && !/[.!?)"'*`]$/.test(quote)
    const turn = classifyTurn(quote)
    const patch: Patch = { id: m[2], title: m[1] }
    if (!isCut || turn.turnEnd !== 'report') Object.assign(patch, turn)
    out.push(patch)
  }
  return out
}

// Asking: a question, or words that hand the next move to you.
const ASKS: RegExp[] = [
  /\bwant me to\b/i,
  /\bdo you want\b/i,
  /\bwould you like\b/i,
  /\b(?:should|shall) I\b/i,
  /\byour call\b/i,
  /\bwhich (?:option|one|approach|way|do you|would you)\b/i,
  /\blet me know\b/i,
  // "please confirm", "once you approve", "for you to confirm"; not "ran it to confirm the cause".
  /\b(?:you|please|you to)\s+(?:approve|confirm)\b/i,
  /\byour (?:ok|okay|approval|go-ahead|sign-off|answer|decision|input|choice|confirmation|action)\b/i,
  /\b(?:need|needs|waiting on|waiting for|awaiting) (?:from )?you\b/i,
  /\bdecisions? (?:needed|I need|to make)\b/i,
]
// A sentence ending in a question mark (not a URL's query: that runs on).
const QUESTION = /\?["')*_]*$/

// Promising to come back by itself: nothing will wake the session to do it.
const LATER = String.raw`(?:in (?:about |around |roughly |~)?(?:[\d½¼¾]|an? |a few|a couple)|(?:about|around|roughly|~) ?[\d½¼¾]+ ?(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|s|m|h)\b|from now|after|once|when|later|shortly|again|tomorrow)`
// What the session waits on, finishing: "when the build finishes", "once it reports back".
const DONE = String.raw`(?:finish(?:es|ed)?|completes?|ends|is done|reports? back|is ready|comes? back|loads|restarts)`
const PROMISES: RegExp[] = [
  new RegExp(
    String.raw`\b(?:I'll|I will|I'm going to|I am going to)\s+(?:then\s+)?(?:check|look|report|verify|come back|circle back|follow up|confirm|re-?check|re-?run|re-?try|retry|poll|ping|update you|let you know|see)\b[^.!?\n]*?` + LATER,
    'i',
  ),
  new RegExp(String.raw`\bwill (?:verify|check|report|confirm|re-?check|follow up)\b[^.!?\n]*?` + LATER, 'i'),
  // "I'll deploy when the build finishes", "Once it accepts connections, I'll update it".
  new RegExp(String.raw`\bI(?:'ll| will)\b[^.!?\n]*\b(?:when|once|after|as soon as)\b[^.!?\n]*\b` + DONE + String.raw`\b`, 'i'),
  /^(?:once|when|after|as soon as)\b[^.!?\n]*,\s*I(?:'ll| will)\b/i,
  /\bcheck(?:ing)? back\b/i,
  /\bcheck in (?:about|around|in|after|again|later|once)\b/i,
]

const clipHint = (t: string): string => (t.length > 160 ? t.slice(0, 159).trimEnd() + '…' : t)

/**
 * How a last message ends a turn: `asks` when it asks you anything (a
 * sentence ending in "?", "want me to", "should I", "approve", "your call",
 * "which option", "let me know", "confirm"…), else `promise` when its closing
 * lines say it will check back later (nothing will wake it to), else `report`.
 * `turnHint` is the sentence that decided it.
 */
export function classifyTurn(text: string): { turnEnd: TurnEnd; turnHint?: string } {
  const plain = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, 'code')
  const sentences = plain
    .replace(/([.!?]["')*_]*)[ \t]+/g, '$1\n')
    .split(/\n+/)
    .map(x => x.replace(/^[\s>*_#-]+|[\s*_]+$/g, '').trim())
    .filter(Boolean)
  // A table's cells ("| Ready?") ask nothing.
  const asked = [...sentences].reverse().find(x => (QUESTION.test(x) && !x.includes('|')) || ASKS.some(re => re.test(x)))
  if (asked) return { turnEnd: 'asks', turnHint: clipHint(asked) }
  // Only the closing lines: a plan earlier in a report may say "I'll check once…".
  const paras = plain.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean)
  const tail = paras.slice(-2).join('\n')
  const promised = sentences.filter(x => tail.includes(x)).reverse().find(x => PROMISES.some(re => re.test(x)))
  if (promised) return { turnEnd: 'promise', turnHint: clipHint(promised) }
  return { turnEnd: 'report' }
}

// list_events: `[assistant] text…` blocks, each starting a line, with `[result] …`, `[user] …` and tool rows between.
const EVENT_MARK = /^\[(assistant|user|result|tool[\w ]*|system|thinking|summary|error)\](?: |$)/

/** The last `[assistant]` message in a list_events transcript, or null. */
export function lastAssistantText(transcript: string): string | null {
  let last: string[] | null = null
  let cur: string[] | null = null
  for (const line of transcript.split('\n')) {
    const m = EVENT_MARK.exec(line)
    if (m) {
      cur = m[1] === 'assistant' ? [line.slice(m[0].length)] : null
      if (cur) last = cur
    } else if (cur) cur.push(line)
  }
  const text = last?.join('\n').trim()
  return text ? text : null
}

/** How the session's current idle spell began, if known: a reading older than its last change says nothing. */
export const turnOf = (s: CrewSession): TurnEnd | undefined =>
  s.turnEnd !== undefined && (s.turnEndAt ?? -Infinity) >= s.changedAt ? s.turnEnd : undefined

/** An idle session's place: it asks you (needs), promised to check back (stalled), or reported (idle). */
export const idlePose = (s: CrewSession): 'needs' | 'stalled' | 'idle' => {
  const t = turnOf(s)
  return t === 'asks' ? 'needs' : t === 'promise' ? 'stalled' : 'idle'
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
      // The app's last-activity time when the source has it, so an imported idle session shows how long it really has been.
      changedAt: p.since !== undefined && Number.isFinite(p.since) && p.since <= at ? p.since : at,
      endedAt: isEnded(status) ? at : undefined,
      note: p.note,
      source,
      ...(p.isImported ? { isImported: true as const } : {}),
      ...(p.isArchived ? { isArchived: true as const } : {}),
      ...(p.turnEnd ? { turnEnd: p.turnEnd, turnEndAt: at, ...(p.turnHint ? { turnHint: p.turnHint } : {}) } : {}),
      slot: list.reduce((m, r) => Math.max(m, (r.slot ?? -1) + 1), 0),
    }
    return [...list, row].slice(-100)
  }
  const prev = list[idx] as CrewSession
  let status = p.status ?? prev.status
  // A list knows running or not, never done: it doesn't undo a done, except one it inferred
  // itself from an archive (`missingAsArchived`) that was since undone.
  if (weak && prev.status === 'done' && status === 'idle' && !isArchivedRow(prev)) status = 'done'
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
    changeSeenAt: changed ? at : prev.changeSeenAt,
    // The archive state is the app's to say, list or not: archived, or no longer.
    ...(p.isArchived === true ? { isArchived: true as const } : {}),
    endedAt: isEnded(status) ? (changed ? at : prev.endedAt ?? at) : undefined,
    // A list's note (its PR) fills a row that has none; it never replaces the app's own note. An old
    // archive marker in the note is cleared once the app lists the session unarchived.
    note: (() => {
      const kept = prev.note === ARCHIVED && p.isArchived === false ? undefined : prev.note
      return weak ? kept ?? p.note : p.note ?? (changed ? undefined : kept)
    })(),
    source,
  }
  // A proposal that became a session runs from when it started.
  if (prev.status === 'proposed' && status === 'working') next.startedAt = at
  if (p.isArchived === false) delete next.isArchived
  if (p.turnEnd) {
    next.turnEnd = p.turnEnd
    next.turnEndAt = at
    if (p.turnHint) next.turnHint = p.turnHint
    else delete next.turnHint
  }
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

// --- labels ----------------------------------------------------------------

export const LABEL_MAX = 16

// Leading words a task title opens with that say nothing about which session it is.
const LEADING =
  /^(?:(?:please|let's|lets)\s+)?(?:add|adds|added|adding|build|builds|built|create|make|makes|fix|fixes|fixed|implement|set\s+up|setup|plan|draft|show|report|keep|give|group|address|prototype|verify|exercise|patched|patch|update|improve|investigate|review|test|write|move|port|refactor|support|enable|cap|find\s+and\s+fix|find|guard|check|run|try|use|get|wire\s+up|hook\s+up|clean\s+up)\s+/i
const ARTICLE = /^(?:the|a|an)\s+/i

/** Cuts a label to `max` characters, at a word when one ends late enough. */
export function clipLabel(text: string, max = LABEL_MAX): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const space = cut.lastIndexOf(' ')
  let head = space >= max / 2 ? cut.slice(0, space) : cut.slice(0, max - 1)
  // Never end on a word that only leads into the part cut off ("Prismarr on…").
  for (let i = 0; i < 3; i++) {
    const shorter = head.replace(/\s+(?:on|in|at|to|for|of|and|or|with|from|by|the|a|an|its|their|own|into|via|per)$/i, '')
    if (shorter === head || shorter.length < 4) break
    head = shorter
  }
  return head.replace(/[\s,.;:–—-]+$/, '') + '…'
}

/**
 * A short human label from a session's title, without asking anyone: the
 * part before a colon or bracket, its opening verb and article dropped
 * ("Patched Prismarr build: library cache" → "Prismarr build"); the handle,
 * spaced out, when there is no title.
 */
export function shortLabel(title: string, name: string): string {
  let t = title.split(/\s*[:(\[|]|\s+[–—-]\s+/)[0]?.trim() ?? ''
  for (let i = 0; i < 2; i++) t = t.replace(LEADING, '').replace(ARTICLE, '')
  if (!t) t = name.replace(/[-_]+/g, ' ').trim()
  return clipLabel(t.charAt(0).toUpperCase() + t.slice(1))
}

/**
 * One label per session: the first `labels` rule whose pattern matches its
 * name, title or id; else the model's short label, when one was asked for and
 * kept; else `shortLabel`. Every label is clipped to LABEL_MAX.
 */
export function assignLabels(crew: readonly CrewSession[], rules: [string, string][], written: Readonly<Record<string, string>>): Map<string, string> {
  const compiled = rules.map(([p, label]) => [globRe(p), label] as const)
  const out = new Map<string, string>()
  for (const s of crew) {
    const hit = compiled.find(([re]) => re.test(s.name) || re.test(s.title) || re.test(s.id))
    out.set(s.id, clipLabel(hit ? hit[1] : (writtenFor(s, written) ?? shortLabel(s.title, s.name))))
  }
  return out
}

/** The model's label for a session, if it wrote a whole one (an old cut one, ending "…", is none). */
export function writtenFor(s: CrewSession, written: Readonly<Record<string, string>>): string | undefined {
  const w = written[s.id] ?? written[s.taskId ?? '']
  return w && !w.endsWith('…') ? w : undefined
}

/** What the model is asked, for sessions with no label yet. */
export function labelPrompt(sessions: readonly { id: string; title: string }[]): string {
  return (
    `Give each Claude Code session below a short label for a status strip: 1 to 3 words, at most ${LABEL_MAX - 2} characters ` +
    `(count them; shorter is better), ` +
    `naming what it is about (a noun phrase, no leading verb), like "To-do mod", "Prismarr patch", "Pool health", "NIC sensors". ` +
    `Answer with only a JSON object mapping each id to its label.\n\n` +
    JSON.stringify(sessions.map(s => ({ id: s.id, title: s.title })))
  )
}

/**
 * The model's answer: labels for the ids it was asked about that fit
 * LABEL_MAX whole (a longer one is no label, to ask again); anything else ignored.
 */
export function parseLabels(text: string, asked: readonly string[]): Record<string, string> {
  const m = /\{[\s\S]*\}/.exec(text)
  if (!m) return {}
  let data: unknown
  try {
    data = JSON.parse(m[0])
  } catch {
    return {}
  }
  const out: Record<string, string> = {}
  if (!data || typeof data !== 'object') return out
  for (const id of asked) {
    const v = (data as Record<string, unknown>)[id]
    const label = typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ') : ''
    if (label && label.length <= LABEL_MAX) out[id] = label
  }
  return out
}

// --- the strip above the prompt ------------------------------------------------

export type StripPose = 'needs' | 'stalled' | 'working' | 'idle' | 'done' | 'finished'
export type StripItem = { session: CrewSession; pose: StripPose }

export const STRIP_TIMES = {
  /** A session whose turn ended asking you (needs you), or promising to check back (stalled), shows this long. */
  needsMs: 60 * 60_000,
  /** One whose turn ended with a report (or whose ending isn't known yet) shows as idle this long. */
  idleMs: 15 * 60_000,
  /** A finished session celebrates this long, then goes muted. */
  celebrateMs: 5_000,
  /** And stays at least this long, then until your next prompt. */
  holdMs: 60_000,
}

const POSE_ORDER: StripPose[] = ['needs', 'stalled', 'working', 'idle', 'done', 'finished']

/** How long an idle session stays out of sleep, by how its turn ended. */
const idleWindow = (pose: 'needs' | 'stalled' | 'idle', t: { needsMs: number; idleMs: number }): number => (pose === 'idle' ? t.idleMs : t.needsMs)

/**
 * Who the strip shows, needs-you first, then stalled, working, idle and done:
 * every working session; idle ones by how their last turn ended (idlePose):
 * asking you (needs you) or promising to check back (stalled) for an hour, a
 * report for 15 minutes; and ones that finished while this crew watched,
 * until your next prompt but at least a minute. Idle and done need a change
 * this crew saw (`changeSeenAt`): a row first seen already idle or done (an
 * import, the app's note at start) shows only in the pane.
 */
export function stripItems(crew: readonly CrewSession[], at: number, lastPromptAt: number, t = STRIP_TIMES): StripItem[] {
  const out: StripItem[] = []
  for (const s of crew) {
    if (s.status === 'working') out.push({ session: s, pose: 'working' })
    else if (s.changeSeenAt === undefined) continue
    // Sleeping sessions never draw in the strip (the summary counts them): only recent turn ends.
    else if (s.status === 'idle') {
      const pose = idlePose(s)
      if (at - s.changedAt < idleWindow(pose, t)) out.push({ session: s, pose })
    } else if (s.status === 'done' && s.endedAt !== undefined && !isArchivedRow(s)) {
      const age = at - s.endedAt
      if (age < t.holdMs || s.endedAt > lastPromptAt) out.push({ session: s, pose: age < t.celebrateMs ? 'done' : 'finished' })
    }
  }
  return out.sort((a, b) => POSE_ORDER.indexOf(a.pose) - POSE_ORDER.indexOf(b.pose) || b.session.changedAt - a.session.changedAt)
}

/**
 * What the strip draws when there are more than `max`: the needs-you and
 * working ones (as many as `fit`), the rest counted; else the first `fit`.
 */
export function stripShown(items: readonly StripItem[], fit: number, max = 6, least = 1): { shown: StripItem[]; more: number } {
  const pool = items.length > max ? items.filter(i => i.pose === 'needs' || i.pose === 'stalled' || i.pose === 'working') : [...items]
  const shown = pool.slice(0, Math.max(least, fit))
  return { shown, more: items.length - shown.length }
}

/** A working time as the pill says it: "<1m", "12m", "2h"; it changes on the minute, then the hour. */
export const workingFor = (ms: number): string => (ms < 60_000 ? '<1m' : ms < 3_600_000 ? `${Math.floor(ms / 60_000)}m` : `${Math.floor(ms / 3_600_000)}h`)

/** When a working pill's words next change. */
const workingDue = (since: number, at: number): number => {
  const age = Math.max(0, at - since)
  const step = age < 3_600_000 ? 60_000 : 3_600_000
  return since + (Math.floor(age / step) + 1) * step
}

/** The pill's words: "working 12m", "needs you", "stalled", "idle", "done ✓" or "done · PR #226". */
export function pillText(i: StripItem, at: number): string {
  if (i.pose === 'working') return `working ${workingFor(at - i.session.changedAt)}`
  if (i.pose === 'needs') return 'needs you'
  if (i.pose === 'stalled') return 'stalled'
  if (i.pose === 'idle') return 'idle'
  const pr = /PR #\d+/.exec(i.session.note ?? '')?.[0]
  return pr ? `done · ${pr}` : 'done ✓'
}

/** "5 sessions · 2 working · 1 needs you · 1 stalled · 1 done · 13 sleeping", or the counts alone. */
export function stripSummary(items: readonly StripItem[], isNarrow: boolean, sleeping = 0): string {
  const n = (...p: StripPose[]) => items.filter(i => p.includes(i.pose)).length
  const parts: [number, string, string][] = [
    [n('working'), 'working', '●'],
    [n('needs'), 'needs you', '!'],
    [n('stalled'), 'stalled', '◷'],
    [n('idle'), 'idle', '○'],
    [n('done', 'finished'), 'done', '✓'],
    [sleeping, 'sleeping', 'z'],
  ]
  const shown = parts.filter(([c]) => c > 0)
  if (isNarrow) return shown.map(([c, , glyph]) => `${glyph} ${c}`).join('  ')
  const total = items.length + sleeping
  return [`${total} session${total === 1 ? '' : 's'}`, ...shown.map(([c, word]) => `${c} ${word}`)].join(' · ')
}

/** When the strip next changes by the clock alone (a celebration ending, a hold running out), or null. */
export function nextStripChange(items: readonly StripItem[], at: number, t = STRIP_TIMES): number | null {
  let soonest: number | null = null
  for (const { session: s, pose } of items) {
    const ended = s.endedAt ?? at
    const due =
      pose === 'done' ? ended + t.celebrateMs
      : pose === 'finished' ? ended + t.holdMs
      : pose === 'needs' || pose === 'stalled' ? s.changedAt + t.needsMs
      : pose === 'idle' ? s.changedAt + t.idleMs
      : pose === 'working' ? workingDue(s.changedAt, at)
      : null
    if (due !== null && due > at && (soonest === null || due < soonest)) soonest = due
  }
  return soonest
}

// --- the pane: what shows, what folds away ---------------------------------------

/** Whether a hide rule (the `hidePatterns` option, /crew hide) matches a session's name, title or id. */
export function isHiddenBy(s: CrewSession, patterns: readonly string[]): boolean {
  return patterns.some(p => {
    const re = globRe(p)
    return re.test(s.name) || re.test(s.title) || re.test(s.id)
  })
}

export type PaneKind = 'needs' | 'stalled' | 'working' | 'idle' | 'proposed' | 'done'
export type PaneRow = { session: CrewSession; kind: PaneKind }

export const PANE_TIMES = {
  /** An idle session whose turn asked you, or promised to check back, stays in the main list this long (as in the strip). */
  needsMs: STRIP_TIMES.needsMs,
  /** One whose turn ended with a report stays this long. */
  idleMs: STRIP_TIMES.idleMs,
  /** A session that finished this recently stays in the main list (the `recentMinutes` option). */
  recentMs: 30 * 60_000,
}

const KIND_ORDER: PaneKind[] = ['needs', 'stalled', 'working', 'idle', 'proposed', 'done']

/**
 * The pane's groups. Main: needs you and stalled (the turn asked you, or
 * promised to check back, in the last hour), working, idle (a turn that ended
 * with a report in the last 15 minutes), proposed, and finished recently
 * (`recentMs`), in that order.
 * Sleeping: every other idle session, newest first, folded by default.
 * Finished: older finished and dismissed ones, folded. Archived sessions are
 * in none. "Needs you" and "finished recently" need a change this crew saw:
 * a session first seen idle or done (an import) is sleeping or finished.
 */
export function paneGroups(
  crew: readonly CrewSession[],
  at: number,
  t = PANE_TIMES,
): { main: PaneRow[]; sleeping: CrewSession[]; finished: CrewSession[] } {
  const main: PaneRow[] = []
  const sleeping: CrewSession[] = []
  const finished: CrewSession[] = []
  for (const s of crew) {
    if (isArchivedRow(s)) continue
    const seen = s.changeSeenAt !== undefined
    if (s.status === 'working') main.push({ session: s, kind: 'working' })
    else if (s.status === 'proposed') main.push({ session: s, kind: 'proposed' })
    else if (s.status === 'idle') {
      const pose = idlePose(s)
      if (seen && at - s.changedAt < idleWindow(pose, t)) main.push({ session: s, kind: pose })
      else sleeping.push(s)
    } else if (s.status === 'done' && seen && at - (s.endedAt ?? s.changedAt) < t.recentMs) main.push({ session: s, kind: 'done' })
    else finished.push(s)
  }
  main.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.session.changedAt - a.session.changedAt)
  sleeping.sort((a, b) => b.changedAt - a.changedAt)
  finished.sort((a, b) => (b.endedAt ?? b.changedAt) - (a.endedAt ?? a.changedAt))
  return { main, sleeping, finished }
}

/**
 * A main row's second line: for a session waiting on you, what it asked; for a
 * stalled one, what it promised and that nothing will wake it; else the title
 * (when it says more than the label) and the PR.
 */
export function paneSubText(r: PaneRow, label: string): string {
  const s = r.session
  if (r.kind === 'needs' && s.turnHint) return `asks: ${s.turnHint}`
  if (r.kind === 'stalled') return `nothing will wake it${s.turnHint ? `: "${s.turnHint}"` : ''}`
  return [s.title && s.title !== label ? s.title : '', r.kind !== 'done' ? prOf(s) ?? '' : ''].filter(Boolean).join(' · ')
}

/** The PR a session's note names ("PR #226"), if any. */
export const prOf = (s: CrewSession): string | undefined => /PR #\d+/.exec(s.note ?? '')?.[0]

/** A main row's words on the right: "working · 12m", "needs you · 3m", "stalled · 3m", "idle · 3m", "proposed", "done · PR #226" or "done · 4m ago". */
export function paneRowText(r: PaneRow, at: number): string {
  const s = r.session
  if (r.kind === 'working') return `working · ${workingFor(at - s.changedAt)}`
  if (r.kind === 'needs') return `needs you · ${fmtAgo(at - s.changedAt)}`
  if (r.kind === 'stalled') return `stalled · ${fmtAgo(at - s.changedAt)}`
  if (r.kind === 'idle') return `idle · ${fmtAgo(at - s.changedAt)}`
  if (r.kind === 'proposed') return 'proposed'
  const pr = prOf(s)
  return pr ? `done · ${pr}` : `done · ${fmtAgo(at - (s.endedAt ?? s.changedAt))} ago`
}

/** When an "ago" text (fmtAgo) next changes: each second under a minute, then on the minute, the hour, the day. */
export function agoDue(since: number, at: number): number {
  const age = Math.max(0, at - since)
  const step = age < 60_000 ? 1_000 : age < 3_600_000 ? 60_000 : age < 86_400_000 ? 3_600_000 : 86_400_000
  return since + (Math.floor(age / step) + 1) * step
}

/**
 * When the pane's drawing next changes by the clock alone, or null: an
 * elapsed time's words ("working · 12m", "needs you · 3m", "done · 4m ago",
 * "idle 8m" while sleeping rows show), or a row moving group (needs you,
 * stalled or idle → sleeping, recently finished → finished).
 */
export function nextPaneChange(g: ReturnType<typeof paneGroups>, at: number, isSleepingShown: boolean, t = PANE_TIMES): number | null {
  const dues: number[] = []
  for (const { session: s, kind } of g.main) {
    if (kind === 'working') dues.push(workingDue(s.changedAt, at))
    else if (kind === 'needs' || kind === 'stalled') dues.push(agoDue(s.changedAt, at), s.changedAt + t.needsMs)
    else if (kind === 'idle') dues.push(agoDue(s.changedAt, at), s.changedAt + t.idleMs)
    else if (kind === 'done') {
      const ended = s.endedAt ?? s.changedAt
      if (!prOf(s)) dues.push(agoDue(ended, at))
      dues.push(ended + t.recentMs)
    }
  }
  if (isSleepingShown) for (const s of g.sleeping) dues.push(agoDue(s.changedAt, at))
  const future = dues.filter(d => d > at)
  return future.length ? Math.min(...future) : null
}
