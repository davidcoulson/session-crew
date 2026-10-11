import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CrewPanel, CrewSession, CrewStatus } from '../types'
import {
  assignFaces,
  faceFor,
  isAsciiFace,
  isWithdrawn,
  parseFaceRules,
  parseListedSessions,
  parsePromptText,
  parseStartResult,
  timeLabel,
  upsert,
  upsertAll,
} from './parse'
import type { Patch } from './parse'

const crew = atom({ plugin: 'session-crew', key: 'crew' } as const, [])
const panel = atom({ plugin: 'session-crew', key: 'panel' } as const, { isCompact: false, isDoneHidden: false })
const poll = atom({ plugin: 'session-crew', key: 'poll' } as const, { isAvailable: true, lastAt: 0 })
const now = atom({ plugin: 'session-crew', key: 'now' } as const, 0)
const faces = atom({ plugin: 'session-crew', key: 'faces' } as const, {})

const PANE = 'session-crew'
const TITLE = 'Session crew'
const STATUS_TOOL = 'mcp__session-crew__status'
const START = 'mcp__ccd_session__start_session'
const DISMISS = 'mcp__ccd_session__dismiss_task'
const LIST = 'mcp__ccd_session_mgmt__list_sessions'
const GET = 'mcp__ccd_session_mgmt__get_session'
// The desktop app's session-management server, as /mcp names it.
const MGMT_SERVER = 'ccd_session_mgmt'
const STORE_FACES = 'session-crew.faces'

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

async function apply($: EngineInterface, patches: Patch[], source: string, weak = false): Promise<CrewSession[]> {
  if (!patches.length) return read($, crew)
  const at = await $.clock.now()
  const list = await update($, crew, l => upsertAll(l, patches, at, source, weak))
  await update($, now, () => at)
  showStatus($, list)
  return list
}

function showStatus($: EngineInterface, list: CrewSession[]): void {
  const n = (s: CrewStatus) => list.filter(c => c.status === s).length
  const parts = [n('working') && `${n('working')} working`, n('idle') && `${n('idle')} sleeping`, n('proposed') && `${n('proposed')} proposed`].filter(Boolean)
  $.ui.status(parts.length ? `crew: ${parts.join(' · ')}` : undefined)
}

// A list_sessions or get_session result. A plain list holds every session the
// person has, so only a linked list (or one session asked by id) adds rows.
async function ingestListed($: EngineInterface, text: string, isOk: boolean, isLinked: boolean): Promise<void> {
  if (!isOk) return
  const known = new Set((await read($, crew)).map(s => s.id))
  const patches = parseListedSessions(text).filter(p => isLinked || (p.id !== undefined && known.has(p.id)))
  await apply($, patches, 'list_sessions', true)
}

// Asks the desktop app itself, when a mod can reach its session server.
async function pollSessions($: EngineInterface): Promise<string> {
  const at = await $.clock.now()
  try {
    const r = await $.mcp.call(MGMT_SERVER, 'list_sessions', { linked: true, limit: 50 })
    const text = r.content.map(b => ('text' in b && typeof b.text === 'string' ? b.text : '')).join('')
    if (r.isError) throw new Error(text.slice(0, 200) || 'isError')
    const patches = parseListedSessions(text)
    await update($, poll, () => ({ isAvailable: true, lastAt: at }))
    await apply($, patches, 'poll', true)
    return `polled ${patches.length} linked sessions`
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await update($, poll, () => ({ isAvailable: false, lastAt: at, lastError: message.slice(0, 300) }))
    return `poll failed: ${message.slice(0, 200)}`
  }
}

// Faces set with /crew face win over the `faces` option.
async function rulesNow($: EngineInterface, optionRules: [string, string][]): Promise<[string, string][]> {
  return [...Object.entries(await read($, faces)), ...optionRules]
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

const sorted = (list: CrewSession[]): CrewSession[] =>
  [...list].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.changedAt - a.changedAt)

// ---------------------------------------------------------------------------
// Desktop drawing: one SVG per row, animated by CSS alone.

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"
const MONO = "ui-monospace,'SF Mono',Menlo,monospace"

const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

const fit = (s: string, size: number, maxW: number): string => {
  const max = Math.max(4, Math.floor(maxW / (size * 0.56)))
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

const CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.ln{stroke:#e4e4e1}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.ln{stroke:#333331}}
.f{transform-box:fill-box;transform-origin:50% 85%}
.working .f{animation:bob .5s ease-in-out infinite alternate}
@keyframes bob{from{transform:translateY(1px) rotate(-5deg)}to{transform:translateY(-3px) rotate(5deg)}}
.working .sp{animation:tw .8s steps(2) infinite}.working .sp2{animation-delay:-.4s}
@keyframes tw{50%{opacity:.1}}
.idle .f{transform:rotate(-14deg);opacity:.8;animation:br 4s ease-in-out infinite}
@keyframes br{50%{transform:rotate(-14deg) scale(.93)}}
.z{opacity:0;animation:zz 3s linear infinite}.z2{animation-delay:1s}.z3{animation-delay:2s}
@keyframes zz{0%{opacity:0;transform:translate(0,0)}25%{opacity:.9}100%{opacity:0;transform:translate(9px,-15px)}}
.done .f{animation:party 1.4s ease-in-out infinite}
@keyframes party{0%,100%{transform:rotate(0)}25%{transform:rotate(-16deg) translateY(-2px)}75%{transform:rotate(16deg) translateY(-2px)}}
.cf{animation:fall 1.8s linear infinite}.cf1{animation-delay:-.4s}.cf2{animation-delay:-.9s}.cf3{animation-delay:-1.3s}
@keyframes fall{0%{transform:translateY(-4px) rotate(0);opacity:1}100%{transform:translateY(30px) rotate(300deg);opacity:0}}
.cf{transform-box:fill-box;transform-origin:center}
.proposed .f{opacity:.45}.q{animation:tw 1.6s steps(2) infinite}
.dismissed .f{opacity:.3;filter:grayscale(1)}
@media (prefers-reduced-motion: reduce){.f,.z,.cf,.sp,.q{animation:none!important}}
</style>`

// The face and what floats around it, in a 44×48 box at (x, y).
function faceSvg(x: number, y: number, face: string, status: CrewStatus): string {
  const shown = faceFor(face, status)
  const ascii = isAsciiFace(face)
  const glyph = ascii
    ? `<text class="f t" x="22" y="31" text-anchor="middle" font-family="${MONO}" font-size="${Math.max(8, Math.min(13, 70 / [...shown].length))}">${xml(shown)}</text>`
    : `<text class="f" x="22" y="35" text-anchor="middle" font-size="28">${xml(shown)}</text>`
  let extra = ''
  if (status === 'working')
    extra = `<text class="sp" x="38" y="12" font-size="10" fill="${COLOR.working}">✦</text><text class="sp sp2" x="2" y="16" font-size="8" fill="${COLOR.working}">✦</text>`
  if (status === 'idle')
    extra = `<text class="z s" x="32" y="16" font-family="${FONT}" font-size="9" font-weight="700">z</text><text class="z z2 s" x="32" y="16" font-family="${FONT}" font-size="11" font-weight="700">z</text><text class="z z3 s" x="32" y="16" font-family="${FONT}" font-size="13" font-weight="700">Z</text>`
  if (status === 'done')
    extra =
      `<text x="30" y="14" font-size="13">🥳</text>` +
      ['#D85A30', '#378ADD', '#F5C542', '#7F77DD']
        .map((c, i) => `<rect class="cf cf${i}" x="${4 + i * 10}" y="2" width="3" height="5" fill="${c}"/>`)
        .join('')
  if (status === 'proposed') extra = `<text class="q" x="34" y="14" font-family="${FONT}" font-size="12" font-weight="700" fill="${COLOR.proposed}">?</text>`
  return `<g transform="translate(${x},${y})" class="${status}">${glyph}${extra}</g>`
}

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS}${body}</svg>`

function rowSvg(W: number, s: CrewSession, face: string, at: number): string {
  const right = `${WORD[s.status]} · ${timeLabel(s, at)}`
  const rightW = right.length * 6.4
  const textW = W - 54 - rightW - 12
  const sub = [s.title, s.note].filter(Boolean).join(' · ')
  return svg(
    W,
    56,
    `${faceSvg(2, 4, face, s.status)}
<text class="t" x="54" y="23" font-family="${FONT}" font-size="13" font-weight="600">${xml(fit(s.name, 13, textW))}</text>
<text class="s" x="54" y="40" font-family="${FONT}" font-size="11">${xml(fit(sub, 11, W - 54))}</text>
<circle cx="${W - rightW - 8}" cy="19" r="3.5" fill="${COLOR[s.status]}"/>
<text class="s" x="${W}" y="23" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(right)}</text>
<line class="ln" x1="0" y1="55.5" x2="${W}" y2="55.5"/>`,
  )
}

function stripSvg(W: number, list: CrewSession[], faceOf: Map<string, string>): string {
  const fitN = Math.max(1, Math.floor(W / 46))
  const shown = list.slice(0, fitN)
  const more = list.length - shown.length
  return svg(
    W,
    52,
    shown.map((s, i) => faceSvg(i * 46, 2, faceOf.get(s.id) ?? '🦊', s.status)).join('') +
      (more ? `<text class="s" x="${shown.length * 46 + 4}" y="30" font-family="${FONT}" font-size="12">+${more}</text>` : ''),
  )
}

// Terminal frames: the clock ticks once a second while anyone works or sleeps.
const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const ZZZ = ['z  ', 'zZ ', 'zZz']
const frame = (s: CrewSession, at: number): string => {
  const tick = Math.floor(at / 1000)
  if (s.status === 'working') return SPIN[tick % SPIN.length] ?? ''
  if (s.status === 'idle') return ZZZ[tick % ZZZ.length] ?? ''
  if (s.status === 'done') return tick % 2 ? '🎉' : '🥳'
  if (s.status === 'proposed') return '?'
  return '·'
}

// ---------------------------------------------------------------------------

export const register: Register = (on, options) => {
  const optionRules = parseFaceRules(options.faces as readonly string[] | string | undefined)
  const pollMs = Math.max(0, Number(options.pollSeconds ?? 30)) * 1000
  const autoOpen = options.autoOpen !== false

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const stored = (await $.store.get(STORE_FACES)) as Record<string, string> | undefined
    if (stored && typeof stored === 'object') await update($, faces, () => ({ ...stored }))

    await $.command.register({
      name: 'crew',
      description: 'Show or hide the side-session crew. Also: /crew face <name-or-glob> <emoji>, /crew faces, /crew refresh, /crew clear, /crew compact',
      argumentHint: '[face <pattern> <face> | faces | refresh | clear | compact]',
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
        },
        required: ['sessions'],
      },
    })

    // Elapsed times and terminal frames, only while the pane is up and someone is busy or asleep.
    $.clock.every(1000, () => {
      void (async () => {
        const list = await read($, crew)
        if (!list.some(s => s.status === 'working' || s.status === 'idle')) return
        if (!(await $.ui.panes()).some(p => p.id === PANE)) return
        const at = await $.clock.now()
        await update($, now, () => at)
      })()
    })
    if (pollMs > 0) {
      $.clock.every(pollMs, () => {
        void (async () => {
          const p = await read($, poll)
          if (!p.isAvailable) return
          const list = await read($, crew)
          if (list.some(s => s.status === 'working')) await pollSessions($)
        })()
      })
      // One look at start, to seed the crew from the app.
      $.clock.after(1500, () => void pollSessions($))
    }
    showStatus($, await read($, crew))
    return started
  })

  on('command.run', { command: 'crew' }, async ($, e) => {
    const [sub = '', ...rest] = e.args.trim().split(/\s+/).filter(Boolean)
    if (sub === 'face') {
      const [pattern, ...faceParts] = rest
      if (!pattern) return { text: 'Usage: /crew face <name-or-glob> <emoji or ASCII face>  (no face removes it)' }
      const face = faceParts.join(' ')
      const next = await update($, faces, f => {
        const copy = { ...f }
        if (face) copy[pattern] = face
        else delete copy[pattern]
        return copy
      })
      await $.store.set(STORE_FACES, next)
      return { text: face ? `${pattern} is now ${face}.` : `${pattern} gets a random animal again.` }
    }
    if (sub === 'faces') {
      const rules = await rulesNow($, optionRules)
      const list = await read($, crew)
      const assigned = assignFaces(list, rules)
      const lines = [
        ...rules.map(([p, f]) => `rule  ${p} = ${f}`),
        ...list.map(s => `crew  ${assigned.get(s.id)} ${s.name} (${s.status})`),
      ]
      return { text: lines.length ? lines.join('\n') : 'No faces yet.' }
    }
    if (sub === 'refresh') return { text: await pollSessions($) }
    if (sub === 'clear') {
      await update($, crew, l => l.filter(s => s.status !== 'done' && s.status !== 'dismissed'))
      showStatus($, await read($, crew))
      return { text: 'Cleared finished sessions from the crew.' }
    }
    if (sub === 'compact') {
      const p = await update($, panel, prev => ({ ...prev, isCompact: !prev.isCompact }))
      return { text: p.isCompact ? 'Crew panel: faces only.' : 'Crew panel: full rows.' }
    }
    if (sub === 'debug') {
      const p = await read($, poll)
      const list = await read($, crew)
      return { text: JSON.stringify({ poll: p, crew: list }, null, 2) }
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
    await ingestListed($, textOf(r), r.deny === undefined && !r.isError, (e as unknown as { linked?: boolean }).linked === true)
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: GET }, async ($, e, next) => {
    const r = await next(e)
    await ingestListed($, textOf(r), r.deny === undefined && !r.isError, true)
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: STATUS_TOOL }, async ($, e) => {
    const input = e as unknown as { sessions?: Patch[] }
    const patches = (input.sessions ?? []).filter(p => p && (p.id || p.name))
    const list = await apply($, patches, 'tool')
    return { result: `ok: ${list.length} in the crew` }
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
    } catch {
      // A row we could not read changes nothing.
    }
    return r
  })

  // --- drawing --------------------------------------------------------------

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = sorted(await read($, crew))
    const p: CrewPanel = await read($, panel)
    const pl = await read($, poll)
    const at = Math.max(await read($, now), ...list.map(s => s.changedAt), 0)
    const faceOf = assignFaces(list, await rulesNow($, optionRules))
    const finished = list.filter(s => s.status === 'done' || s.status === 'dismissed')
    const active = list.filter(s => s.status !== 'done' && s.status !== 'dismissed')
    const shown = p.isDoneHidden ? active : list

    const controls = (
      <Box key="controls" flexDirection="row" gap={2}>
        <Button key="compact" label={p.isCompact ? 'Rows' : 'Faces only'} plain onPress={() => update($, panel, v => ({ ...v, isCompact: !v.isCompact }))} />
        {finished.length > 0 && (
          <Button
            key="done"
            label={`${p.isDoneHidden ? '▸' : '▾'} finished · ${finished.length}`}
            plain
            onPress={() => update($, panel, v => ({ ...v, isDoneHidden: !v.isDoneHidden }))}
          />
        )}
        <Button key="refresh" label="Refresh" plain onPress={() => void pollSessions($)} />
      </Box>
    )
    const empty = (
      <Text key="empty" dimColor>
        No side sessions yet. They appear when this session starts or proposes one, or when the app reports linked sessions.
      </Text>
    )
    const pollNote = !pl.isAvailable && pl.lastAt ? (
      <Text key="poll" dimColor>
        Live polling unavailable; updates arrive with each prompt.
      </Text>
    ) : null

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      return (
        <Box flexDirection="column">
          {list.length === 0 && empty}
          {list.length > 0 && p.isCompact && (
            <Svg key="strip" source={stripSvg(W, shown, faceOf)} alt={shown.map(s => `${s.name} ${WORD[s.status]}`).join(', ')} width={W} height={52} />
          )}
          {list.length > 0 &&
            !p.isCompact &&
            shown.map(s => (
              <Svg key={s.id} source={rowSvg(W, s, faceOf.get(s.id) ?? '🦊', at)} alt={`${s.name}: ${WORD[s.status]}, ${timeLabel(s, at)}`} width={W} height={56} />
            ))}
          {list.length > 0 && controls}
          {pollNote}
        </Box>
      )
    }

    // Terminal and the other surfaces: the same rows in text.
    return (
      <Box flexDirection="column">
        {list.length === 0 && empty}
        {p.isCompact ? (
          <Text key="strip" wrap="truncate-end">
            {shown.map(s => `${faceOf.get(s.id)}${frame(s, at)} `).join('')}
          </Text>
        ) : (
          shown.map(s => (
            <Box key={s.id} flexDirection="column" marginBottom={1}>
              <Box flexDirection="row" gap={1}>
                <Text>
                  {faceFor(faceOf.get(s.id) ?? '🦊', s.status)} {frame(s, at)}
                </Text>
                <Text bold wrap="truncate-end">
                  {s.name}
                </Text>
                <Text color={COLOR[s.status]}>{WORD[s.status]}</Text>
                <Text dimColor>{timeLabel(s, at)}</Text>
              </Box>
              <Text dimColor wrap="truncate-end">
                {'   '}
                {[s.title, s.note].filter(Boolean).join(' · ')}
              </Text>
            </Box>
          ))
        )}
        {list.length > 0 && controls}
        {pollNote}
      </Box>
    )
  })
}
