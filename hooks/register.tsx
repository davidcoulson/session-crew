import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CrewImport, CrewPanel, CrewSession, CrewStatus } from '../types'
import { COSTUME_COLOR, CRAB_CSS, WEARS, costumeKey, crab } from './crab'
import { CSS, FONT, MAIN_ROW_H, PILL_COLOR, SLEEP_ROW_H, TERM_GAP, cardOf, cells, clipCells, fitTerminalRow, layoutStrip, mainRowSvg, sleepRowSvg, termCardCells, xml } from './band'
import {
  assignCostumes,
  describeFilter,
  giveCostumes,
  isLiveImport,
  isWithdrawn,
  listedToPatch,
  missingAsArchived,
  nextStripChange,
  STRIP_TIMES,
  assignLabels,
  writtenFor,
  labelPrompt,
  parseLabels,
  pillText,
  isHiddenBy,
  isArchivedRow,
  paneGroups,
  nextPaneChange,
  paneRowText,
  prOf,
  stripItems,
  stripShown,
  stripSummary,
  normalizeListed,
  parseFaceRules,
  parseImportArgs,
  parseListing,
  parsePromptText,
  parseStartResult,
  selectForImport,
  fmtAgo,
  upsertAll,
} from './parse'
import { mergeBooks } from './parse'
import type { CostumeBook, Listed, PaneKind, PaneRow, Patch, StripItem } from './parse'

const crew = atom({ plugin: 'session-crew', key: 'crew' } as const, [])
const panel = atom({ plugin: 'session-crew', key: 'panel' } as const, { isCompact: false, isDoneHidden: true, isSleepingShown: false })
const poll = atom({ plugin: 'session-crew', key: 'poll' } as const, { isAvailable: true, lastAt: 0 })
const now = atom({ plugin: 'session-crew', key: 'now' } as const, 0)
const faces = atom({ plugin: 'session-crew', key: 'faces' } as const, {})
const listing = atom({ plugin: 'session-crew', key: 'listing' } as const, [])
const importing = atom({ plugin: 'session-crew', key: 'importing' } as const, null)
const stripOn = atom({ plugin: 'session-crew', key: 'stripOn' } as const, true)
const lastPromptAt = atom({ plugin: 'session-crew', key: 'lastPromptAt' } as const, 0)
const bandNow = atom({ plugin: 'session-crew', key: 'bandNow' } as const, 0)
const labels = atom({ plugin: 'session-crew', key: 'labels' } as const, {})
const hidden = atom({ plugin: 'session-crew', key: 'hidden' } as const, [])
const written = atom({ plugin: 'session-crew', key: 'written' } as const, {})

const PANE = 'session-crew'
const TITLE = 'Session crew'
const STATUS_TOOL = 'mcp__session-crew__status'
const SYNC_TOOL = 'mcp__session-crew__sync'
const START = 'mcp__ccd_session__start_session'
const DISMISS = 'mcp__ccd_session__dismiss_task'
const LIST = 'mcp__ccd_session_mgmt__list_sessions'
const GET = 'mcp__ccd_session_mgmt__get_session'
// The desktop app's session-management server, as /mcp names it.
const MGMT_SERVER = 'ccd_session_mgmt'
const STORE_FACES = 'session-crew.faces'
const STORE_IMPORT = 'session-crew.import'
const STORE_COSTUMES = 'session-crew.costumes'
const STORE_STRIP = 'session-crew.strip'
const STORE_LABELS = 'session-crew.labels'
const STORE_HIDDEN = 'session-crew.hidden'
const STORE_SLEEPING = 'session-crew.sleeping'
const STORE_WRITTEN = 'session-crew.writtenLabels'
// A refresh on each prompt, at most this often.
const PROMPT_REFRESH_MS = 15_000
// After a failed fetch, wait this long before the timer or a prompt tries again.
const RETRY_MS = 60_000

const COLOR: Record<CrewStatus, string> = {
  working: '#378ADD',
  idle: '#9a9a96',
  done: '#3B9C5F',
  proposed: '#BA7517',
  dismissed: '#9a9a96',
}
const WORD: Record<CrewStatus, string> = {
  working: 'working',
  idle: 'sleeping',
  done: 'done',
  proposed: 'proposed',
  dismissed: 'dismissed',
}
const ORDER: CrewStatus[] = ['working', 'idle', 'proposed', 'done', 'dismissed']

const textOf = (r: { text?: string; result?: unknown }): string =>
  typeof r.text === 'string' ? r.text : typeof r.result === 'string' ? r.result : JSON.stringify(r.result ?? '')

// ---------------------------------------------------------------------------
// Merging into state, then the status line.

// Merges run one at a time in this session, so two never hand out costumes from the same book.
// (A module variable is fine: a reload starts a fresh chain, and the state it guards is the host's.)
let applying: Promise<unknown> = Promise.resolve()

function apply($: EngineInterface, patches: Patch[], source: string, weak = false): Promise<CrewSession[]> {
  const run = applying.then(() => applyNow($, patches, source, weak))
  applying = run.catch(() => undefined)
  return run
}

async function readBook($: EngineInterface): Promise<CostumeBook> {
  const stored = (await $.store.get(STORE_COSTUMES)) as CostumeBook | undefined
  return stored && typeof stored === 'object' && stored.byId && typeof stored.next === 'number' ? stored : { byId: {}, next: 0 }
}

async function applyNow($: EngineInterface, patches: Patch[], source: string, weak: boolean): Promise<CrewSession[]> {
  if (!patches.length) return read($, crew)
  const at = await $.clock.now()
  const book = await readBook($)
  let nextBook: CostumeBook | null = null
  // New rows get the costume the book has for them (from any earlier session), else the next one in turn.
  const list = await update($, crew, l => {
    const merged = upsertAll(l, patches, at, source, weak)
    const given = giveCostumes(merged, book)
    nextBook = given?.book ?? null
    return given?.list ?? merged
  })
  // Another session's panel may have written the book since: keep what it added.
  if (nextBook) await $.store.set(STORE_COSTUMES, mergeBooks(await readBook($), nextBook))
  await update($, now, () => at)
  showStatus($, list)
  return list
}

function showStatus($: EngineInterface, list: CrewSession[]): void {
  const n = (s: CrewStatus) => list.filter(c => c.status === s).length
  const parts = [n('working') && `${n('working')} working`, n('idle') && `${n('idle')} sleeping`, n('proposed') && `${n('proposed')} proposed`].filter(Boolean)
  $.ui.status(parts.length ? `crew: ${parts.join(' · ')}` : undefined)
}

// A list_sessions or get_session result, from the model's call or the mod's own.
// A plain list holds every session the person has, so it adds only the rows the
// crew knows, or that the /crew import filter picks; a linked list adds them all.
async function ingestListed($: EngineInterface, text: string, isOk: boolean, isLinked: boolean, isComplete: boolean, isListing: boolean): Promise<number> {
  if (!isOk) return 0
  const rows = parseListing(text)
  if (!rows) return 0
  // Only list_sessions is a listing for sync to import from; get_session is one row.
  if (isListing) await update($, listing, () => rows.slice(0, 200))
  return ingestRows($, rows, isLinked, isComplete, 'list_sessions')
}

/**
 * Merges listed rows. `isComplete`: the rows are every open session (no linked
 * or group filter, fewer than the limit), so an imported one missing is archived.
 */
async function ingestRows($: EngineInterface, rows: Listed[], isLinked: boolean, isComplete: boolean, source: string): Promise<number> {
  const f = await read($, importing)
  const list = await read($, crew)
  const known = new Set(list.map(s => s.id))
  const picked = new Set(f ? selectForImport(rows, f).map(r => r.id) : [])
  const patches = rows
    .filter(r => isLinked || known.has(r.id) || picked.has(r.id))
    .map(r => ({ ...listedToPatch(r), isImported: !isLinked && !known.has(r.id) }))
  await apply($, patches, source, true)
  // Not weak: inferring the archive is ours, with its note, which lets an unarchived session come back.
  if (isComplete) await apply($, missingAsArchived(list, rows), source)
  return picked.size
}

// The mod's own list_sessions: the app's MCP server directly, else a tool call
// through the session's own loop (the server lives in the desktop app, which a
// mod may not reach directly).
async function fetchListing($: EngineInterface, args: Record<string, unknown>): Promise<{ rows: Listed[]; via: 'mcp' | 'tool' } | { error: string }> {
  const errors: string[] = []
  try {
    const r = await $.mcp.call(MGMT_SERVER, 'list_sessions', args)
    const text = r.content.map(b => ('text' in b && typeof b.text === 'string' ? b.text : '')).join('')
    const rows = r.isError ? null : parseListing(text)
    if (rows) return { rows, via: 'mcp' }
    errors.push(`mcp: ${text.slice(0, 160)}`)
  } catch (err) {
    errors.push(`mcp: ${(err instanceof Error ? err.message : String(err)).slice(0, 160)}`)
  }
  try {
    const r = await $.tool.call({ tool: LIST, ...args } as never)
    if (r.deny !== undefined) errors.push(`tool: denied: ${r.deny.slice(0, 160)}`)
    else if (r.isError) errors.push(`tool: ${textOf(r).slice(0, 160)}`)
    else {
      const rows = parseListing(textOf(r))
      if (rows) return { rows, via: 'tool' }
      errors.push(`tool: not a session list: ${textOf(r).slice(0, 120)}`)
    }
  } catch (err) {
    errors.push(`tool: ${(err instanceof Error ? err.message : String(err)).slice(0, 160)}`)
  }
  return { error: errors.join('; ') }
}

// One fetch at a time: a prompt or a tick while one is out joins it, so an older answer
// can never land after a newer one.
let refreshing: Promise<string> | null = null

/** Fetches the sessions and merges them: the import filter's when one is set, else the linked family. */
function refresh($: EngineInterface): Promise<string> {
  if (!refreshing) {
    refreshing = refreshNow($).finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

const FULL_LIMIT = 100

async function refreshNow($: EngineInterface): Promise<string> {
  const f = await read($, importing)
  // Imported sessions aren't in the linked family: while any is in play (even after /crew import off), list them all.
  const isFull = !!f || (await read($, crew)).some(isLiveImport)
  const args: Record<string, unknown> = isFull ? { limit: FULL_LIMIT, ...(f?.includeArchived ? { include_archived: true } : {}) } : { linked: true, limit: 50 }
  const at = await $.clock.now()
  // Taken now, so the throttles see this attempt while it is out.
  await update($, poll, p => ({ ...p, lastAt: at }))
  const got = await fetchListing($, args)
  if ('error' in got) {
    await update($, poll, () => ({ isAvailable: false, lastAt: at, lastError: got.error.slice(0, 400) }))
    return `could not list sessions (${got.error.slice(0, 200)})`
  }
  await update($, poll, () => ({ isAvailable: true, via: got.via, lastAt: at }))
  await update($, listing, () => got.rows.slice(0, 200))
  const n = await ingestRows($, got.rows, !isFull, isFull && got.rows.length < FULL_LIMIT, f ? 'import' : 'poll')
  return f ? `imported ${n} sessions (${describeFilter(f)}); ${got.rows.length} listed` : `refreshed ${got.rows.length} ${isFull ? '' : 'linked '}sessions`
}

const importPrompt = (f: CrewImport): string => {
  const args = { limit: 100, ...(f.includeArchived ? { include_archived: true } : {}) }
  const sync = { ...(f.parent ? { parent: f.parent } : {}), ...(f.match ? { match: f.match } : {}), ...(f.includeArchived ? { includeArchived: true } : {}) }
  return (
    `session-crew import (${describeFilter(f)}): call mcp__ccd_session_mgmt__list_sessions with ${JSON.stringify(args)}, ` +
    `then call mcp__session-crew__sync with ${JSON.stringify(sync)}; leave out "sessions", the mod reads the list itself. ` +
    `Then reply with the sync result in one line and nothing else.`
  )
}

// Faces set with /crew face win over the `faces` option.
async function rulesNow($: EngineInterface, optionRules: [string, string][]): Promise<[string, string][]> {
  return [...Object.entries(await read($, faces)), ...optionRules]
}

// The crew less what hide rules (the hidePatterns option and /crew hide) leave out of the pane and the strip.
async function visibleCrew($: EngineInterface, optionHide: readonly string[]): Promise<CrewSession[]> {
  const patterns = [...optionHide, ...(await read($, hidden))]
  return (await read($, crew)).filter(s => !isHiddenBy(s, patterns))
}

// Labels set with /crew label win over the `labels` option.
async function labelRulesNow($: EngineInterface, optionRules: [string, string][]): Promise<[string, string][]> {
  return [...Object.entries(await read($, labels)), ...optionRules]
}

// Short labels the model writes from titles, once per session, kept in $.store.
// Module state: one call at a time, and an id asked once per load is not asked again.
let labelling = false
// Tries per session id this load: a label that came back too long is asked once more.
const askedLabels = new Map<string, number>()

async function readWritten($: EngineInterface): Promise<Record<string, string>> {
  const stored = (await $.store.get(STORE_WRITTEN)) as Record<string, string> | undefined
  return stored && typeof stored === 'object' ? stored : {}
}

async function writeLabels($: EngineInterface): Promise<void> {
  // Taken before any await, so two ticks never pick the same sessions.
  if (labelling) return
  labelling = true
  try {
    // Another session's panel may have written labels since this one loaded: take them first.
    const have = await update($, written, w => w)
    const stored = await readWritten($)
    const known = { ...stored, ...have }
    if (Object.keys(stored).some(id => !have[id])) await update($, written, w => ({ ...stored, ...w }))
    const todo = (await read($, crew)).filter(s => s.title && !writtenFor(s, known) && (askedLabels.get(s.id) ?? 0) < 2).slice(0, 20)
    if (!todo.length) return
    for (const s of todo) askedLabels.set(s.id, (askedLabels.get(s.id) ?? 0) + 1)
    const r = await $.model.complete({ model: 'haiku', prompt: labelPrompt(todo), maxTokens: 600, effort: 'low' })
    if (!r.isAnswered) return
    const got = parseLabels(r.text, todo.map(s => s.id))
    if (!Object.keys(got).length) return
    await update($, written, w => ({ ...w, ...got }))
    // Merged with what the store holds now, then the newest 500 kept.
    const all = { ...(await readWritten($)), ...(await read($, written)) }
    const ids = Object.keys(all)
    for (const id of ids.slice(0, Math.max(0, ids.length - 500))) delete all[id]
    await $.store.set(STORE_WRITTEN, all)
  } catch {
    // No label from the model: the title's own short form stands.
  } finally {
    labelling = false
  }
}

async function togglePane($: EngineInterface): Promise<boolean> {
  if ((await $.ui.panes()).some(p => p.id === PANE)) {
    await $.ui.close({ id: PANE })
    return false
  }
  await update($, now, () => Date.now())
  await $.ui.open({ id: PANE, title: TITLE })
  return true
}

// A folded finished row's words: a withdrawn proposal says so, never "done".
const finishedText = (s: CrewSession): string => (s.status === 'dismissed' ? 'dismissed' : prOf(s) ? `done · ${prOf(s)}` : 'done')

const sorted = (list: CrewSession[]): CrewSession[] =>
  [...list].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.changedAt - a.changedAt)

// ---------------------------------------------------------------------------
// Desktop drawing: one SVG per row, animated by CSS alone.


const fit = (s: string, size: number, maxW: number): string => {
  const max = Math.max(4, Math.floor(maxW / (size * 0.56)))
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}


const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS}${CRAB_CSS}${body}</svg>`

function stripSvg(W: number, list: CrewSession[], costumeOf: Map<string, string>): string {
  const fitN = Math.max(1, Math.floor((W - 30) / 38))
  const shown = list.slice(0, fitN)
  const more = list.length - shown.length
  return svg(
    W,
    40,
    shown.map((s, i) => crab(i * 38, 8, costumeOf.get(s.id) ?? 'other', s.status)).join('') +
      (more ? `<text class="s" x="${shown.length * 38 + 4}" y="28" font-family="${FONT}" font-size="12">+${more}</text>` : ''),
  )
}

// What the band was last asked to draw, for /crew debug: the desktop Code tab's
// band is the open question this answers. A module variable: a render hook may
// not write state, and this is diagnostics only.
const bandLog: { count: number; lastAt: number; surface?: string; bodyColumns?: number; maxRows?: number; below?: string; drew?: number } = { count: 0, lastAt: 0 }
// The pane's draws beside it: a pane the desktop draws, against a band it may not.
const paneLog: { count: number; lastAt: number; surface?: string } = { count: 0, lastAt: 0 }

// Terminal frames: the clock ticks once a second while anyone works or sleeps.
// The crab is savvy-progress's terminal glyph in its costume's color.
const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const ZZZ = ['z  ', 'zZ ', 'zZz']
const frame = (s: CrewSession, at: number): string => {
  const tick = Math.floor(at / 1000)
  if (s.status === 'working') return SPIN[tick % SPIN.length] ?? ''
  if (s.status === 'idle') return ZZZ[tick % ZZZ.length] ?? ''
  if (s.status === 'done') return tick % 2 ? '\\o/' : '|o|'
  if (s.status === 'proposed') return '?'
  return '·'
}

// ---------------------------------------------------------------------------

export const register: Register = (on, options) => {
  const optionRules = parseFaceRules(options.faces as readonly string[] | string | undefined)
  const pollMs = Math.max(0, Number(options.pollSeconds ?? 30)) * 1000
  const autoOpen = options.autoOpen !== false
  const stripDefault = options.strip !== false
  const labelRules = parseFaceRules(options.labels as readonly string[] | string | undefined)
  const stripScale = Math.max(0.8, Math.min(2.5, Number(options.stripScale ?? 1.5) || 1.5))
  const aiLabels = options.aiLabels !== false
  const optionHide = (Array.isArray(options.hidePatterns) ? options.hidePatterns : typeof options.hidePatterns === 'string' ? options.hidePatterns.split(/[,\n]/) : [])
    .map(p => String(p).trim())
    .filter(Boolean)
  const recentMs = Math.max(1, Number(options.recentMinutes ?? 30) || 30) * 60_000

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const stored = (await $.store.get(STORE_FACES)) as Record<string, string> | undefined
    if (stored && typeof stored === 'object') await update($, faces, () => ({ ...stored }))
    const storedHidden = await $.store.get(STORE_HIDDEN)
    if (Array.isArray(storedHidden)) await update($, hidden, () => storedHidden.filter((p): p is string => typeof p === 'string'))
    const storedSleeping = await $.store.get(STORE_SLEEPING)
    if (typeof storedSleeping === 'boolean') await update($, panel, v => ({ ...v, isSleepingShown: storedSleeping }))
    const storedLabels = (await $.store.get(STORE_LABELS)) as Record<string, string> | undefined
    if (storedLabels && typeof storedLabels === 'object') await update($, labels, () => ({ ...storedLabels }))
    const storedWritten = (await $.store.get(STORE_WRITTEN)) as Record<string, string> | undefined
    if (storedWritten && typeof storedWritten === 'object') await update($, written, () => ({ ...storedWritten }))
    // New sessions get their short label a moment after they join.
    if (aiLabels) {
      $.clock.every(5_000, () => void writeLabels($))
    }
    const strip = await $.store.get(STORE_STRIP)
    await update($, stripOn, () => (typeof strip === 'boolean' ? strip : stripDefault))
    const imp = (await $.store.get(STORE_IMPORT)) as CrewImport | null | undefined
    if (imp && typeof imp === 'object') await update($, importing, () => imp)

    await $.command.register({
      name: 'crew',
      description:
        'Show or hide the side-session crew. Also: /crew import [parent <id>] [<glob>] [--archived] | off, /crew face <name-or-glob> <costume>, /crew faces, /crew refresh, /crew clear, /crew compact',
      argumentHint: '[import … | face <pattern> <costume> | faces | refresh | clear | compact]',
    })
    await $.tool.register({
      name: 'status',
      description:
        'Report the status of side sessions to the session-crew panel. Call it when you learn a side session changed state ' +
        '(a "Linked sessions now" note, a finished-turn note, list_sessions) and the panel may not have seen it. ' +
        'Cheap and silent: it only redraws the panel.',
      inputSchema: {
        type: 'object',
        properties: {
          sessions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'local_… session id (or task_… for a proposal).' },
                name: { type: 'string', description: 'The session\'s short handle.' },
                title: { type: 'string' },
                status: { type: 'string', enum: ['proposed', 'working', 'idle', 'done', 'dismissed'] },
                note: { type: 'string', description: 'A few words, e.g. "PR #224".' },
              },
              required: ['status'],
            },
          },
          debug: { type: 'boolean', description: 'Diagnostics only: answer with the poll and strip state as JSON.' },
        },
        required: ['sessions'],
      },
    })

    await $.tool.register({
      name: 'sync',
      description:
        'Import existing side sessions into the session-crew panel (what /crew import asks for). Call ' +
        'mcp__ccd_session_mgmt__list_sessions first and leave out `sessions`: the mod reads that result itself. ' +
        'Filters: `parent` (only sessions that session id started), `match` (a glob on name or title), `includeArchived`. ' +
        'The filter is kept, so later list_sessions results keep the imported sessions fresh.',
      inputSchema: {
        type: 'object',
        properties: {
          parent: { type: 'string', description: 'Only sessions whose startedBy is this local_… id.' },
          match: { type: 'string', description: 'Only sessions whose name or title matches this glob (* and ?).' },
          includeArchived: { type: 'boolean', description: 'Also import archived sessions (as done). Default false.' },
          sessions: {
            type: 'array',
            description: 'Only when the list is not from list_sessions in this turn: rows of {id, name, title, status, startedBy, prNumber}.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                title: { type: 'string' },
                status: { type: 'string', enum: ['working', 'idle', 'done'] },
                startedBy: { type: 'string' },
                prNumber: { type: 'integer' },
                isArchived: { type: 'boolean' },
              },
              required: ['id'],
            },
          },
        },
      },
    })

    // The strip's clock: ticks only when a crab in it is due to change pose or leave.
    $.clock.every(1000, () => {
      void (async () => {
        if (!(await read($, stripOn))) return
        const at = await $.clock.now()
        // Hidden sessions never draw, so they never tick it.
        const items = stripItems(await visibleCrew($, optionHide), await read($, bandNow), await read($, lastPromptAt))
        const due = nextStripChange(items, await read($, bandNow))
        // The terminal's spinners are frames of this clock; the desktop's crabs walk by CSS and need no tick
        // (its "working 12m" pills are due changes, which nextStripChange counts).
        const spins = bandLog.surface !== undefined && bandLog.surface !== 'desktop' && items.some(i => i.pose === 'working')
        if (spins || (due !== null && at >= due)) await update($, bandNow, () => at)
      })()
    })

    // The pane's clock: ticks when something it shows is due to change (an elapsed time's words, a
    // row moving between groups), or each second for the terminal's spinners; only while the pane is up.
    $.clock.every(1000, () => {
      void (async () => {
        const at = await $.clock.now()
        const shownAt = await read($, now)
        const groups = paneGroups(await visibleCrew($, optionHide), shownAt, { needsMs: STRIP_TIMES.needsMs, recentMs })
        const due = nextPaneChange(groups, shownAt, (await read($, panel)).isSleepingShown === true, { needsMs: STRIP_TIMES.needsMs, recentMs })
        const spins = paneLog.surface !== undefined && paneLog.surface !== 'desktop' && groups.main.some(r => r.kind === 'working')
        if (!spins && (due === null || at < due)) return
        if (!(await $.ui.panes()).some(p => p.id === PANE)) return
        await update($, now, () => at)
      })()
    })
    if (pollMs > 0) {
      $.clock.every(pollMs, () => {
        void (async () => {
          const p = await read($, poll)
          const at = await $.clock.now()
          // A failed fetch is retried now and then, crew or no crew: the app's server may simply not have been up yet.
          if (!p.isAvailable) {
            if (at - p.lastAt >= RETRY_MS) await refresh($)
            return
          }
          const list = await read($, crew)
          if (list.some(s => s.status === 'working' || isLiveImport(s)) || (await read($, importing))) await refresh($)
        })()
      })
    }
    // One look at start, to seed the crew from the app (and the /crew import filter, if one is kept);
    // early in a session the app's session server may still be connecting, so once more a little later.
    $.clock.after(1500, () => {
      void (async () => {
        await refresh($)
        if (!(await read($, poll)).isAvailable) $.clock.after(10_000, () => void refresh($))
      })()
    })
    showStatus($, await read($, crew))
    return started
  })

  on('command.run', { command: 'crew' }, async ($, e) => {
    const [sub = '', ...rest] = e.args.trim().split(/\s+/).filter(Boolean)
    if (sub === 'face') {
      const [pattern, ...faceParts] = rest
      const costumes = Object.values(WEARS).join(', ')
      if (!pattern) return { text: `Usage: /crew face <name-or-glob> <costume>  (no costume removes the rule). Costumes: ${costumes}` }
      const face = faceParts.join(' ').toLowerCase()
      if (face && !costumeKey(face)) return { text: `No costume "${face}". Costumes: ${costumes}` }
      const next = await update($, faces, f => {
        const copy = { ...f }
        if (face) copy[pattern] = face
        else delete copy[pattern]
        return copy
      })
      await $.store.set(STORE_FACES, next)
      return { text: face ? `${pattern} now wears ${WEARS[costumeKey(face) ?? 'other']}.` : `${pattern} takes the next costume in turn again.` }
    }
    if (sub === 'faces') {
      const rules = await rulesNow($, optionRules)
      const list = await read($, crew)
      const assigned = assignCostumes(list, rules)
      const lines = [
        ...rules.map(([p, f]) => `rule  ${p} = ${costumeKey(f) ? WEARS[costumeKey(f) ?? 'other'] : `${f} (unknown, ignored)`}`),
        ...list.map(s => `crew  ${s.name}: ${WEARS[assigned.get(s.id) ?? 'other']} (${s.status})`),
      ]
      return { text: lines.length ? lines.join('\n') : 'No crew or rules yet.' }
    }
    if (sub === 'import') {
      const parsed = parseImportArgs(rest)
      if (typeof parsed === 'object' && 'error' in parsed)
        return { text: `${parsed.error}. Usage: /crew import [parent <local_id>] [<name-glob>] [--archived], or /crew import off` }
      if (parsed === 'off') {
        await update($, importing, () => null)
        await $.store.set(STORE_IMPORT, null)
        return { text: 'Stopped importing new sessions; the ones already here keep refreshing until done or /crew clear. New sessions start without an import.' }
      }
      await update($, importing, () => parsed)
      await $.store.set(STORE_IMPORT, parsed)
      // A refresh already out fetched for the old filter: let it land, then fetch for this one.
      if (refreshing) await refreshing.catch(() => undefined)
      const result = await refresh($)
      if ((await read($, poll)).isAvailable) return { text: result }
      // The mod cannot list sessions itself here: Claude does, and the sync tool reads the result.
      // Submitted from a timer: a prompt from inside this command would wait on the turn it holds.
      const text = importPrompt(parsed)
      $.clock.after(250, () => void $.prompt.submit({ text }))
      return { text: `Asking Claude to list your sessions (${describeFilter(parsed)}); the crew fills in when it calls sync.` }
    }
    if (sub === 'refresh') return { text: await refresh($) }
    if (sub === 'clear') {
      await update($, crew, l => l.filter(s => s.status !== 'done' && s.status !== 'dismissed'))
      showStatus($, await read($, crew))
      return { text: 'Cleared finished sessions from the crew.' }
    }
    if (sub === 'sleeping') {
      const want = rest[0] === 'show' ? true : rest[0] === 'hide' ? false : !(await read($, panel)).isSleepingShown
      await update($, panel, v => ({ ...v, isSleepingShown: want }))
      await $.store.set(STORE_SLEEPING, want)
      return { text: want ? 'Sleeping sessions: shown in the pane.' : 'Sleeping sessions: folded into one row.' }
    }
    if (sub === 'hide') {
      const pattern = rest.join(' ')
      if (!pattern) return { text: `Usage: /crew hide <name-or-glob>. Hidden now: ${[...optionHide, ...(await read($, hidden))].join(', ') || 'nothing'}` }
      const next = await update($, hidden, h => (h.includes(pattern) ? h : [...h, pattern]))
      await $.store.set(STORE_HIDDEN, next)
      return { text: `Hiding ${pattern} from the pane and the strip. /crew unhide ${pattern} brings it back.` }
    }
    if (sub === 'unhide') {
      const pattern = rest.join(' ')
      const next = await update($, hidden, h => (pattern ? h.filter(p => p !== pattern) : []))
      await $.store.set(STORE_HIDDEN, next)
      const left = optionHide.length ? ` (the hidePatterns option still hides ${optionHide.join(', ')})` : ''
      return { text: (pattern ? `${pattern} shows again.` : 'Every /crew hide rule removed.') + left }
    }
    if (sub === 'label') {
      const [pattern, ...words] = rest
      if (!pattern) return { text: 'Usage: /crew label <name-or-glob> <label>  (no label removes the rule)' }
      const label = words.join(' ')
      const next = await update($, labels, l => {
        const copy = { ...l }
        if (label) copy[pattern] = label
        else delete copy[pattern]
        return copy
      })
      await $.store.set(STORE_LABELS, next)
      return { text: label ? `${pattern} is labelled "${label}".` : `${pattern} takes its short title again.` }
    }
    if (sub === 'labels') {
      const list = await read($, crew)
      const rules = await labelRulesNow($, labelRules)
      const shown = assignLabels(list, rules, await read($, written))
      const lines = [...rules.map(([p, l]) => `rule  ${p} = ${l}`), ...list.map(s => `crew  ${s.name}: ${shown.get(s.id)}`)]
      return { text: lines.length ? lines.join('\n') : 'No crew or rules yet.' }
    }
    if (sub === 'strip') {
      const want = rest[0] === 'on' ? true : rest[0] === 'off' ? false : !(await read($, stripOn))
      await update($, stripOn, () => want)
      await $.store.set(STORE_STRIP, want)
      return { text: want ? 'Crab strip above the prompt: on.' : 'Crab strip above the prompt: off.' }
    }
    if (sub === 'compact') {
      const p = await update($, panel, prev => ({ ...prev, isCompact: !prev.isCompact }))
      return { text: p.isCompact ? 'Crew panel: faces only.' : 'Crew panel: full rows.' }
    }
    if (sub === 'debug') {
      const p = await read($, poll)
      const list = await read($, crew)
      return { text: JSON.stringify({ poll: p, importing: await read($, importing), strip: { isOn: await read($, stripOn), band: bandLog, pane: paneLog }, crew: list }, null, 2) }
    }
    const isOpen = await togglePane($)
    return { text: isOpen ? 'Session crew opened.' : 'Session crew closed.' }
  })

  // --- the app's own session tools, as the model calls them ----------------

  on('tool.call', { tool: START }, async ($, e, next) => {
    const r = await next(e)
    if (r.deny !== undefined || r.isError) return r
    const input = e as unknown as { proposal_id?: string }
    const patch = parseStartResult(textOf(r), input.proposal_id)
    if (patch) {
      await apply($, [patch], 'start_session')
      if (autoOpen) void $.ui.open({ id: PANE, title: TITLE })
    }
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: DISMISS }, async ($, e, next) => {
    const r = await next(e)
    const input = e as unknown as { task_id?: string }
    if (r.deny === undefined && input.task_id && isWithdrawn(textOf(r))) await apply($, [{ id: input.task_id, status: 'dismissed' }], 'dismiss_task')
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: LIST }, async ($, e, next) => {
    const r = await next(e)
    const args = e as unknown as { linked?: boolean; group?: string; limit?: number; include_archived?: boolean }
    const rows = parseListing(textOf(r))
    // The app's own default limit is 20.
    const isComplete = !args.linked && !args.group && rows !== null && rows.length < (args.limit ?? 20)
    await ingestListed($, textOf(r), r.deny === undefined && !r.isError, args.linked === true, isComplete, true)
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: GET }, async ($, e, next) => {
    const r = await next(e)
    await ingestListed($, textOf(r), r.deny === undefined && !r.isError, true, false, false)
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: STATUS_TOOL }, async ($, e) => {
    const input = e as unknown as { sessions?: Patch[]; debug?: boolean }
    const patches = (input.sessions ?? []).filter(p => p && (p.id || p.name))
    const list = await apply($, patches, 'tool')
    // `debug`: what /crew debug shows of the strip and polling, for diagnosing a session from the model's side.
    if (input.debug === true)
      return {
        result: JSON.stringify({
          crew: list.length,
          poll: await read($, poll),
          panes: await $.ui.panes(),
          strip: { isOn: await read($, stripOn), band: bandLog, pane: paneLog },
          labels: Object.fromEntries([...assignLabels(list, await labelRulesNow($, labelRules), await read($, written))].slice(0, 12).map(([id, l]) => [list.find(s => s.id === id)?.name ?? id, l])),
          writtenLabels: Object.keys(await read($, written)).length,
        }),
      }
    return { result: `ok: ${list.length} in the crew` }
  })

  on('tool.call', { tool: SYNC_TOOL }, async ($, e) => {
    const input = e as unknown as { sessions?: unknown[]; parent?: string; match?: string; includeArchived?: boolean }
    const f: CrewImport = {
      ...(typeof input.parent === 'string' && input.parent ? { parent: input.parent } : {}),
      ...(typeof input.match === 'string' && input.match ? { match: input.match } : {}),
      ...(input.includeArchived === true ? { includeArchived: true } : {}),
    }
    const isGiven = Array.isArray(input.sessions)
    const rows = isGiven ? normalizeListed(input.sessions ?? []) : await read($, listing)
    if (!rows.length)
      return { result: isGiven ? 'nothing to import: the sessions given hold no local_… ids' : 'nothing to import: call mcp__ccd_session_mgmt__list_sessions first (limit 100), then sync again' }
    await update($, importing, () => f)
    await $.store.set(STORE_IMPORT, f)
    const n = await ingestRows($, rows, false, false, 'sync')
    const p = await read($, poll)
    const live = p.via ? `the mod refreshes them itself (via ${p.via === 'mcp' ? "the app's MCP server" : 'a tool call'})` : 'they refresh when list_sessions runs again'
    return { result: `imported ${n} of ${rows.length} sessions (${describeFilter(f)}) from ${isGiven ? 'the rows given' : 'the last list_sessions'}; ${live}` }
  })

  // --- what the app writes into this session's prompts ---------------------
  // The "Linked sessions now" note and "The user started your proposal" ride
  // in the user-side text of each prompt and delivery the app sends.

  on('session.append', async ($, e, next) => {
    const r = await next(e)
    try {
      const m = e.message
      if (e.agentId || m.role !== 'user' || !['prompt', 'delivery', 'attachment', 'hook-context'].includes(e.door)) return r
      const text = m.content.map(b => (b.type === 'text' ? b.text : '')).join('\n')
      await apply($, parsePromptText(text), 'linked-note')
      // The person's own prompt (not another session's note): finished crabs may leave the strip after it.
      const kind = (e.origin as { kind?: string }).kind
      if (e.door === 'prompt' && (kind === 'composer' || kind === 'sdk' || kind === 'bridge') && !/^\s*<(cross-session-message|side-sessions-event)/.test(text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, ''))) {
        const at = await $.clock.now()
        await update($, lastPromptAt, () => at)
        await update($, bandNow, () => at)
      }
      // Imported sessions aren't in the linked note: refresh them with each prompt, when the mod can list sessions itself.
      if (e.door === 'prompt' && ((await read($, importing)) || (await read($, crew)).some(isLiveImport))) {
        const p = await read($, poll)
        const at = await $.clock.now()
        if (at - p.lastAt > (p.isAvailable ? PROMPT_REFRESH_MS : RETRY_MS)) $.clock.after(0, () => void refresh($))
      }
    } catch {
      // A row we could not read changes nothing.
    }
    return r
  })

  // --- drawing --------------------------------------------------------------

  // The strip above the prompt. Other mods may draw there too (savvy-progress's bar): the
  // strip goes on top of whatever the hooks beneath drew, never in its place.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    bandLog.count++
    bandLog.lastAt = Date.now()
    bandLog.surface = e.surface
    bandLog.bodyColumns = e.props.bodyColumns
    bandLog.maxRows = e.props.maxRows
    if (e.props.hasSurvey || !(await read($, stripOn))) return next(e)
    const all = await read($, crew)
    const shownCrew = await visibleCrew($, optionHide)
    const at = Math.max(await read($, bandNow), await read($, now), ...all.map(s => s.changedAt), 0)
    const items = stripItems(shownCrew, at, await read($, lastPromptAt))
    // Sleeping sessions are only a count in the summary.
    const sleepingCount = paneGroups(shownCrew, at, { needsMs: STRIP_TIMES.needsMs, recentMs }).sleeping.length
    if (!items.length && !sleepingCount) return next(e)
    const below = await next(e)
    bandLog.below = JSON.stringify(below).slice(0, 160)
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const costumeOf = assignCostumes(all, await rulesNow($, optionRules))
    const labelOf = assignLabels(all, await labelRulesNow($, labelRules), await read($, written))
    const label = (s: CrewSession) => labelOf.get(s.id) ?? s.name

    // Everyone asleep: no crab, only the count, which opens the pane.
    if (!items.length) {
      const cols = e.props.bodyColumns || 80
      const words = stripSummary(items, false, sleepingCount)
      bandLog.drew = 0
      return (
        <Box flexDirection="column">
          <Box key="session-crew-strip" flexDirection="row">
            <Button key="session-crew-open" label={e.surface !== 'desktop' && cells(words) > cols ? clipCells(stripSummary(items, true, sleepingCount), cols) : words} plain onPress={() => void togglePane($)} />
          </Box>
          {below}
        </Box>
      )
    }

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(200, Math.min(1600, (e.props.bodyColumns || 100) * 8 - 16))
      const { band, summary, shown } = layoutStrip(W, items, i => cardOf(i, label(i.session), costumeOf.get(i.session.id) ?? 'other', at, stripScale), stripScale, isNarrow =>
        stripSummary(items, isNarrow, sleepingCount),
      )
      bandLog.drew = shown
      const alt = items.map(i => `${label(i.session)}: ${pillText(i, at)}`).join(', ')
      return (
        <Box flexDirection="column">
          <Box key="session-crew-strip" flexDirection="row" alignItems="center" gap={1}>
            <Svg source={band.source} alt={alt} width={band.width} height={band.height} isInteractive />
            <Button key="session-crew-open" label={summary} plain onPress={() => void togglePane($)} />
          </Box>
          {below}
        </Box>
      )
    }

    // Terminal: the same cards in text, `▣ Label` and a coloured pill in words, the row
    // sized in cells to the columns (fitTerminalRow, beside the summary and "+N more").
    const cols = e.props.bodyColumns || 80
    const { shown, more, summary: termSummary } = fitTerminalRow(
      items,
      cols,
      i => termCardCells(i.pose, label(i.session), pillText(i, at)),
      isNarrow => stripSummary(items, isNarrow, sleepingCount),
    )
    bandLog.drew = shown.length
    return (
      <Box flexDirection="column">
        <Box key="session-crew-strip" flexDirection="row" gap={TERM_GAP}>
          {shown.map(i => (
            <Text key={i.session.id} wrap="truncate-end">
              <Text color={COSTUME_COLOR[costumeOf.get(i.session.id) ?? 'other']}>▣</Text> <Text bold={i.pose !== 'finished'} dimColor={i.pose === 'finished'}>{label(i.session)}</Text>{' '}
              <Text color={PILL_COLOR[i.pose]} bold={i.pose === 'needs'} inverse={i.pose === 'needs'}>
                {i.pose === 'working' ? frame(i.session, at) : i.pose === 'needs' ? ' !' : i.pose === 'idle' ? 'z' : '✓'} {pillText(i, at)}{i.pose === 'needs' ? ' ' : ''}
              </Text>
            </Text>
          ))}
          {more > 0 && <Text dimColor>+{more} more</Text>}
          <Button key="session-crew-open" label={termSummary} plain onPress={() => void togglePane($)} />
        </Box>
        {below}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    paneLog.count++
    paneLog.lastAt = Date.now()
    paneLog.surface = e.surface
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const all = await read($, crew)
    const shownCrew = await visibleCrew($, optionHide)
    const p: CrewPanel = await read($, panel)
    const pl = await read($, poll)
    const at = Math.max(await read($, now), ...all.map(s => s.changedAt), 0)
    // Faces from the crew in the order it joined, never the panel's status order,
    // so a session changing state never swaps crabs with another.
    const costumeOf = assignCostumes(all, await rulesNow($, optionRules))
    const costume = (s: CrewSession) => costumeOf.get(s.id) ?? 'other'
    const labelOf = assignLabels(all, await labelRulesNow($, labelRules), await read($, written))
    const label = (s: CrewSession) => labelOf.get(s.id) ?? s.name
    const { main, sleeping, finished } = paneGroups(shownCrew, at, { needsMs: STRIP_TIMES.needsMs, recentMs })
    const isSleepingShown = p.isSleepingShown === true
    const isFinishedShown = p.isDoneHidden === false

    const sleepToggle =
      sleeping.length > 0 ? (
        <Button
          key="sleeping"
          label={`${isSleepingShown ? '▾' : '▸'} ${sleeping.length} sleeping · ${isSleepingShown ? 'hide' : 'show'}`}
          plain
          onPress={() =>
            void (async () => {
              const v = await update($, panel, x => ({ ...x, isSleepingShown: !x.isSleepingShown }))
              await $.store.set(STORE_SLEEPING, v.isSleepingShown === true)
            })()
          }
        />
      ) : null
    const finishedToggle =
      finished.length > 0 ? (
        <Button
          key="done"
          label={`${isFinishedShown ? '▾' : '▸'} ${finished.length} finished · ${isFinishedShown ? 'hide' : 'show'}`}
          plain
          onPress={() => update($, panel, x => ({ ...x, isDoneHidden: x.isDoneHidden === false }))}
        />
      ) : null
    const controls = (
      <Box key="controls" flexDirection="row" gap={2}>
        <Button key="compact" label={p.isCompact ? 'Rows' : 'Crabs only'} plain onPress={() => update($, panel, v => ({ ...v, isCompact: !v.isCompact }))} />
        <Button key="refresh" label="Refresh" plain onPress={() => void refresh($)} />
      </Box>
    )
    const isEmpty = shownCrew.every(isArchivedRow)
    const empty = (
      <Text key="empty" dimColor>
        No side sessions yet. They appear when this session starts or proposes one, or when the app reports linked sessions; /crew import brings in ones that already exist.
      </Text>
    )
    const quiet =
      !isEmpty && main.length === 0 ? (
        <Text key="quiet" dimColor>
          Nobody is working or waiting on you.
        </Text>
      ) : null
    const pollNote = !pl.isAvailable && pl.lastAt ? (
      <Text key="poll" dimColor>
        Can't list sessions right now ({pl.lastError?.slice(0, 80) ?? 'no answer'}); retrying about once a minute. Updates also arrive with each prompt.
      </Text>
    ) : null

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      return (
        <Box flexDirection="column">
          {isEmpty && empty}
          {quiet}
          {main.length > 0 && p.isCompact && (
            <Svg key="strip" source={stripSvg(W, main.map(r => r.session), costumeOf)} alt={main.map(r => `${label(r.session)} ${paneRowText(r, at)}`).join(', ')} width={W} height={40} />
          )}
          {!p.isCompact &&
            main.map(r => (
              <Svg
                key={r.session.id}
                source={mainRowSvg(W, r, label(r.session), costume(r.session), at)}
                alt={`${label(r.session)}, the ${WEARS[costume(r.session)]} crab: ${paneRowText(r, at)}`}
                width={W}
                height={MAIN_ROW_H}
                isInteractive
              />
            ))}
          {sleepToggle}
          {isSleepingShown &&
            sleeping.map(s => (
              <Svg key={s.id} source={sleepRowSvg(W, s, label(s), costume(s), at)} alt={`${label(s)}: idle ${fmtAgo(at - s.changedAt)}`} width={W} height={SLEEP_ROW_H} isInteractive />
            ))}
          {finishedToggle}
          {isFinishedShown &&
            finished.map(s => (
              <Svg
                key={s.id}
                source={sleepRowSvg(W, s, label(s), costume(s), at, finishedText(s))}
                alt={`${label(s)}: ${finishedText(s)}`}
                width={W}
                height={SLEEP_ROW_H}
                isInteractive
              />
            ))}
          {!isEmpty && controls}
          {pollNote}
        </Box>
      )
    }

    // Terminal and the other surfaces: the same rows in text; sleeping ones on one line.
    const KIND_COLOR: Record<PaneKind, string> = { needs: '#D85A30', working: '#378ADD', proposed: '#BA7517', done: '#3B9C5F' }
    const mainRow = (r: PaneRow) => {
      const s = r.session
      const sub = [s.title && s.title !== label(s) ? s.title : '', r.kind !== 'done' ? prOf(s) ?? '' : ''].filter(Boolean).join(' · ')
      return (
        <Box key={s.id} flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={COSTUME_COLOR[costume(s)]}>▣</Text>
            <Text dimColor>{r.kind === 'working' ? frame(s, at) : r.kind === 'needs' ? '!' : r.kind === 'done' ? '✓' : '?'}</Text>
            <Text bold wrap="truncate-end">
              {label(s)}
            </Text>
            <Text color={KIND_COLOR[r.kind]} bold={r.kind === 'needs'}>
              {paneRowText(r, at)}
            </Text>
          </Box>
          {sub && (
            <Text dimColor wrap="truncate-end">
              {'    '}
              {sub}
            </Text>
          )}
        </Box>
      )
    }
    const lineRow = (s: CrewSession, right: string) => (
      <Box key={s.id} flexDirection="row" gap={1}>
        <Text color={COSTUME_COLOR[costume(s)]}>▣</Text>
        <Text wrap="truncate-end">{label(s)}</Text>
        <Text dimColor>{right}</Text>
      </Box>
    )
    return (
      <Box flexDirection="column">
        {isEmpty && empty}
        {quiet}
        {p.isCompact ? (
          <Text key="strip" wrap="truncate-end">
            {main.map(r => (
              <Text key={r.session.id} color={COSTUME_COLOR[costume(r.session)]}>
                ▣{frame(r.session, at)}{' '}
              </Text>
            ))}
          </Text>
        ) : (
          main.map(mainRow)
        )}
        {sleepToggle}
        {isSleepingShown && sleeping.map(s => lineRow(s, `idle ${fmtAgo(at - s.changedAt)}`))}
        {finishedToggle}
        {isFinishedShown && finished.map(s => lineRow(s, finishedText(s)))}
        {!isEmpty && controls}
        {pollNote}
      </Box>
    )
  })
}
