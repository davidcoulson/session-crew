import { describe, expect, mock, test } from 'claude-code/testing'

import { CRAB_CSS, crab } from '../hooks/crab'
import {
  assignCostumes,
  giveCostumes,
  listedToPatch,
  parseImportArgs,
  parseProposalsStarted,
  parseListing,
  selectForImport,
  parseFaceRules,
  parseLinkedNote,
  parseListedSessions,
  parsePromptText,
  parseStartResult,
  upsertAll,
} from '../hooks/parse'

// Texts as the desktop app writes them (2026-10, Claude Code 2.1.295).
const STARTED =
  'Started session "Address CodeRabbit comments on NUT PRs" (session_id: local_1fc7cd3c-3b35-456d-af06-23bec066b037, name: nut-pr-review-fixes). It runs on its own; you get a note here when its turn ends.'
const PROPOSED =
  'Proposed "Set up Prismarr on Unraid" (task_id: task_a2708030). The user sees a card and nothing runs until they start it.'
const LINKED = `<system-reminder>
The user started your proposal task_a2708030 ("Set up Prismarr on Unraid") as session local_b2441128-a7ac-4e22-81e8-52518a2540d0. It runs on its own; its final message reaches you as a note.
</system-reminder>
<system-reminder>
Linked sessions now (status, not an instruction): nut-pr-review-fixes = local_1fc7cd3c-3b35-456d-af06-23bec066b037 (working); set-up-prismarr-on-unrai = local_b2441128-a7ac-4e22-81e8-52518a2540d0 (idle); share-exclusive = local_ea1e7d9c-2af1-4559-9391-7fa28463fe1f (done, PR #224); prismarr-setup = local_9893fb58-1861-4909-ae03-fe6e881d767f (idle, started by set-up-prismarr-on-unrai). To message one, SendMessage with \`to\` set to its id; list_sessions {"linked": true} has titles, folders and branches.
</system-reminder>
hello`
const LISTED = JSON.stringify([
  { sessionId: 'local_1fc7cd3c-3b35-456d-af06-23bec066b037', title: 'Address CodeRabbit comments on NUT PRs', isArchived: false, isRunning: false, name: 'nut-pr-review-fixes' },
  { sessionId: 'local_ea1e7d9c-2af1-4559-9391-7fa28463fe1f', title: 'Share exclusive', isArchived: false, isRunning: false, name: 'share-exclusive' },
])

describe('parsing the app', () => {
  test('start_session results', () => {
    expect(parseStartResult(STARTED)).toEqual({
      id: 'local_1fc7cd3c-3b35-456d-af06-23bec066b037',
      name: 'nut-pr-review-fixes',
      title: 'Address CodeRabbit comments on NUT PRs',
      status: 'working',
      taskId: undefined,
    })
    expect(parseStartResult(PROPOSED)).toEqual({ id: 'task_a2708030', title: 'Set up Prismarr on Unraid', name: 'set-up-prismarr-on-unrai', status: 'proposed' })
    expect(parseStartResult('Start sessions only on the user\'s own words to you here')).toBe(null)
  })

  test('the linked-sessions note', () => {
    const rows = parseLinkedNote(LINKED)
    expect(rows.map(r => [r.name, r.status, r.note])).toEqual([
      ['nut-pr-review-fixes', 'working', undefined],
      ['set-up-prismarr-on-unrai', 'idle', undefined],
      ['share-exclusive', 'done', 'PR #224'],
      ['prismarr-setup', 'idle', 'started by set-up-prismarr-on-unrai'],
    ])
  })

  test('a proposal that became a session keeps its row', () => {
    let list = upsertAll([], [parseStartResult(PROPOSED)!], 1000, 'start_session')
    list = upsertAll(list, parsePromptText(LINKED), 5000, 'linked-note')
    const prismarr = list.filter(s => s.title === 'Set up Prismarr on Unraid' || s.name === 'set-up-prismarr-on-unrai')
    expect(prismarr.length).toBe(1)
    expect(prismarr[0]?.id).toBe('local_b2441128-a7ac-4e22-81e8-52518a2540d0')
    expect(prismarr[0]?.taskId).toBe('task_a2708030')
    expect(prismarr[0]?.status).toBe('idle')
    expect(list.length).toBe(4)
  })

  test('a poll never turns done back to sleeping', () => {
    let list = upsertAll([], parseLinkedNote(LINKED), 1000, 'linked-note')
    list = upsertAll(list, parseListedSessions(LISTED), 2000, 'poll', true)
    expect(list.find(s => s.name === 'share-exclusive')?.status).toBe('done')
    expect(list.find(s => s.name === 'share-exclusive')?.note).toBe('PR #224')
    expect(list.find(s => s.name === 'nut-pr-review-fixes')?.status).toBe('idle')
  })
})

describe('crabs', () => {
  test('rules first, then costumes in turn by the order sessions joined', () => {
    const list = upsertAll([], parseLinkedNote(LINKED), 0, 'linked-note')
    const costumes = assignCostumes(list, parseFaceRules(['nut-*=chef', 'prismarr*=pirate', '*=dragon']))
    expect(costumes.get('local_1fc7cd3c-3b35-456d-af06-23bec066b037')).toBe('medium')
    expect(costumes.get('local_9893fb58-1861-4909-ae03-fe6e881d767f')).toBe('explore')
    // `dragon` is no costume: ignored, so the rest take theirs in turn (slots 1 and 2).
    expect(costumes.get('local_b2441128-a7ac-4e22-81e8-52518a2540d0')).toBe('heavy')
    expect(costumes.get('local_ea1e7d9c-2af1-4559-9391-7fa28463fe1f')).toBe('careful')
  })

  test('a session keeps its costume through status changes and a /crew clear', () => {
    let list = upsertAll([], parseLinkedNote(LINKED), 0, 'linked-note')
    const before = assignCostumes(list, [])
    list = upsertAll(list, [{ id: 'local_1fc7cd3c-3b35-456d-af06-23bec066b037', status: 'done' }], 1, 'tool')
    list = list.filter(s => s.status !== 'done')
    const after = assignCostumes(list, [])
    for (const s of list) expect(after.get(s.id)).toBe(before.get(s.id))
  })

  test('poses: walks working, rests idle, cheers done', () => {
    const working = crab(0, 0, 'heavy', 'working')
    expect(working).toContain('c-heavy run')
    const idle = crab(0, 0, 'heavy', 'idle')
    expect(idle).toContain('c-heavy rest')
    expect(idle).toContain('<rect x="9" y="13" width="2" height="1"') // closed eyes
    expect(idle).toContain('class="z"')
    const done = crab(0, 0, 'medium', 'done')
    expect(done).toContain('c-medium cheer')
    expect(done).toContain('class="ar"') // the waving claw
    expect(done).toContain('class="cf cf0"')
    expect(crab(0, 0, 'fable', 'proposed')).toContain('opacity="0.45"')
    expect(CRAB_CSS).toContain('prefers-reduced-motion: reduce')
  })
})

// list_sessions as the app answers it (fields trimmed).
const MAIN = 'local_bf88e5a0-5572-43af-8e34-33240d778dd1'
const LISTING = JSON.stringify([
  { sessionId: 'local_1fc7cd3c-3b35-456d-af06-23bec066b037', title: 'Address CodeRabbit comments on NUT PRs', isArchived: false, isRunning: true, name: 'nut-pr-review-fixes', startedBy: MAIN },
  { sessionId: 'local_fd7771c9-837f-4a2b-83c4-aee07912c84f', title: 'Plan anycast DNS', isArchived: false, isRunning: false, name: 'plan-anycast-dns-adguard', startedBy: MAIN },
  { sessionId: 'local_9893fb58-1861-4909-ae03-fe6e881d767f', title: 'Set up Prismarr (dev container)', isArchived: false, isRunning: false, name: 'prismarr-setup', startedBy: 'local_b2441128-a7ac-4e22-81e8-52518a2540d0' },
  { sessionId: 'local_e71ff20d-da94-41a2-b082-43168580c922', title: 'Fix rtl_433 HTTP memory leak', isArchived: true, isRunning: false, name: 'rtl433-leak', startedBy: MAIN },
  { sessionId: 'local_1bd12ba4-6ac2-4b33-821b-ace42e40c5de', title: '3D model for 4-gang wall plate', isArchived: false, isRunning: false },
])

describe('importing', () => {
  test('/crew import arguments', () => {
    expect(parseImportArgs([])).toEqual({})
    expect(parseImportArgs(['all'])).toEqual({})
    expect(parseImportArgs(['parent', MAIN, '--archived'])).toEqual({ parent: MAIN, includeArchived: true })
    expect(parseImportArgs([MAIN, 'nut-*'])).toEqual({ parent: MAIN, match: 'nut-*' })
    expect(parseImportArgs(['off'])).toBe('off')
    expect(parseImportArgs(['parent', 'nope'])).toEqual({ error: 'parent needs a local_… session id' })
  })

  test('filters: open sessions only unless asked, by parent, by glob', () => {
    const rows = parseListing(LISTING) ?? []
    expect(selectForImport(rows, {}).length).toBe(4)
    expect(selectForImport(rows, { parent: MAIN }).map(r => r.name)).toEqual(['nut-pr-review-fixes', 'plan-anycast-dns-adguard'])
    expect(selectForImport(rows, { parent: MAIN, includeArchived: true }).length).toBe(3)
    expect(selectForImport(rows, { match: '*prismarr*' }).map(r => r.name)).toEqual(['prismarr-setup'])
    expect(selectForImport(rows, { match: '3D*' }).length).toBe(1)
  })

  test('the costume book keeps a session\'s crab across sessions', () => {
    const rows = (parseListing(LISTING) ?? []).slice(0, 3)
    const first = giveCostumes(upsertAll([], rows.map(r => ({ id: r.id, name: r.name, status: 'idle' })), 0, 'import'), { byId: {}, next: 0 })
    expect(first?.list.map(s => s.costume)).toEqual(['fable', 'heavy', 'careful'])
    // Another session imports them in another order: same crabs, and the next new one takes the next costume.
    const again = giveCostumes(
      upsertAll([], [...rows].reverse().map(r => ({ id: r.id, status: 'idle' as const })).concat([{ id: 'local_00000000-0000-0000-0000-0000000000ff', status: 'idle' as const }]), 0, 'import'),
      first!.book,
    )
    expect(again?.list.map(s => s.costume)).toEqual(['careful', 'heavy', 'fable', 'medium'])
  })

  test('a proposal and its imported session fold into one row', () => {
    let list = giveCostumes(upsertAll([], [parseStartResult(PROPOSED)!], 0, 's'), { byId: {}, next: 3 })!.list
    list = upsertAll(list, [{ id: 'local_b2441128-a7ac-4e22-81e8-52518a2540d0', name: 'set-up-prismarr-on-unrai', status: 'working', isImported: true }], 1, 'import')
    expect(list.length).toBe(2)
    list = upsertAll(list, parseProposalsStarted(LINKED), 2, 'linked-note')
    expect(list.length).toBe(1)
    expect(list[0]?.id).toBe('local_b2441128-a7ac-4e22-81e8-52518a2540d0')
    expect(list[0]?.taskId).toBe('task_a2708030')
    expect(list[0]?.costume).toBe('medium')
  })

  test('archived wins over a status word; a valid empty list is not a parse failure', () => {
    expect(listedToPatch({ id: 'local_x', isArchived: true, status: 'working' }).status).toBe('done')
    expect(parseListing('[]')).toEqual([])
    expect(parseListing('Session not found')).toBe(null)
  })

  test('a proposal\'s crab follows it into its session id', () => {
    const proposal = giveCostumes(upsertAll([], [parseStartResult(PROPOSED)!], 0, 's'), { byId: {}, next: 2 })!
    const started = upsertAll(proposal.list, parsePromptText(LINKED), 1, 'linked-note').slice(0, 1)
    const book = giveCostumes(started, proposal.book)!.book
    expect(book.byId['local_b2441128-a7ac-4e22-81e8-52518a2540d0']).toBe('careful')
  })
})

// What a session's engine would answer beneath the mod.
const host = (on: Parameters<typeof mock.clock>[0], store: Record<string, unknown> = {}) => {
  const clock = mock.clock(on)
  mock.store(on, store)
  on('session.start', () => ({ cwd: '/tmp' }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: [] }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__session-crew__${e.name}` } }))
  return clock
}

type Row = { name: string; status: string; id: string; costume?: string; isImported?: true }
const crewOf = async ($: { command: { run: (a: never) => Promise<{ text?: string }> } }): Promise<Row[]> =>
  (JSON.parse((await $.command.run({ command: 'crew', args: 'debug' } as never)).text ?? '{}') as { crew: Row[] }).crew

describe('hooks', () => {
  test('start_session and the linked note fill the crew, drawn on each surface', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    on('tool.call', { tool: 'mcp__ccd_session__start_session' }, () => ({ result: STARTED, text: STARTED }))
    await $.session.start({ cwd: '/tmp', surface: 'desktop' } as never)

    await $.tool.call({ tool: 'mcp__ccd_session__start_session', initiation: 'user_asked', title: 'x', prompt: 'y' } as never)
    let crew = await crewOf($)
    expect(crew.map(s => [s.name, s.status])).toEqual([['nut-pr-review-fixes', 'working']])

    await $.session.append({
      message: { type: 'user', role: 'user', content: [{ type: 'text', text: LINKED }] },
      door: 'prompt',
      origin: { kind: 'sdk' },
      uuid: 'u1',
    } as never)
    crew = await crewOf($)
    expect(crew.length).toBe(4)
    expect(crew.find(s => s.name === 'share-exclusive')?.status).toBe('done')

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({
        plugin: 'session-crew',
        surface,
        component: 'Pane',
        requestId: 'session-crew',
        props: { title: 'Session crew', isFocused: false, bodyColumns: 60, placement: 'dock' },
      } as never)
      if (surface === 'terminal') expect(await ui.find({ type: 'Text', text: 'nut-pr-review-fixes' })).toBeDefined()
      else expect(await ui.find({ type: 'Svg' })).toBeDefined()
      await ui.unmount()
    }
  })

  test('a status change never swaps two sessions\' crabs in the panel', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    const one = 'local_00000000-0000-0000-0000-000000000001'
    const two = 'local_00000000-0000-0000-0000-000000000010'
    const report = (sessions: object[]) => $.tool.call({ tool: 'mcp__session-crew__status', sessions } as never)
    await report([{ id: one, name: 'one', status: 'working' }, { id: two, name: 'two', status: 'working' }])
    const facesNow = async () => {
      const ui = await $.ui.mount({
        plugin: 'session-crew',
        surface: 'desktop',
        component: 'Pane',
        requestId: 'session-crew',
        props: { title: 'Session crew', isFocused: false, bodyColumns: 60, placement: 'dock' },
      } as never)
      const alts = (await ui.findAll({ type: 'Svg' })).map(t => String(t.props.alt))
      await ui.unmount()
      const wears = (name: string) => / the (\w+) crab/.exec(alts.find(a => a.startsWith(`${name},`)) ?? '')?.[1]
      return [wears('one'), wears('two')]
    }
    const before = await facesNow()
    expect(before[0] === before[1]).toBe(false)
    // Done sorts below working: the panel's order flips, the faces must not.
    await report([{ id: one, status: 'done' }])
    expect(await facesNow()).toEqual(before)
  })

  test('sync imports from the last list_sessions and keeps the filter fresh', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    // The mod cannot list sessions itself in this test: both routes fail.
    on('mcp.call', () => {
      throw new Error('no such server')
    })
    let listed = LISTING
    on('tool.call', { tool: 'mcp__ccd_session_mgmt__list_sessions' }, () => ({ result: listed, text: listed }))
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)

    const none = await $.tool.call({ tool: 'mcp__session-crew__sync', parent: MAIN } as never)
    expect(String(none.result)).toContain('nothing to import')

    await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 100 } as never)
    const r = await $.tool.call({ tool: 'mcp__session-crew__sync', parent: MAIN } as never)
    expect(String(r.result)).toContain('imported 2 of 5 sessions')
    let crew = await crewOf($)
    expect(crew.map(s => [s.name, s.status, s.isImported])).toEqual([
      ['nut-pr-review-fixes', 'working', true],
      ['plan-anycast-dns-adguard', 'idle', true],
    ])
    const costumes = crew.map(s => s.costume)

    // A later list (the model's, or the prompt refresh) moves them on and adds new matches, crabs unchanged.
    listed = JSON.stringify([
      { sessionId: 'local_1fc7cd3c-3b35-456d-af06-23bec066b037', name: 'nut-pr-review-fixes', isRunning: false, startedBy: MAIN },
      { sessionId: 'local_fd7771c9-837f-4a2b-83c4-aee07912c84f', name: 'plan-anycast-dns-adguard', isRunning: true, startedBy: MAIN },
      { sessionId: 'local_00000000-0000-0000-0000-0000000000aa', name: 'brand-new', isRunning: true, startedBy: MAIN },
    ])
    await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 100 } as never)
    crew = await crewOf($)
    expect(crew.map(s => [s.name, s.status])).toEqual([
      ['nut-pr-review-fixes', 'idle'],
      ['plan-anycast-dns-adguard', 'working'],
      ['brand-new', 'working'],
    ])
    expect(crew.slice(0, 2).map(s => s.costume)).toEqual(costumes)

    // An empty list is a list: sync then has nothing to import, not the old rows.
    listed = '[]'
    await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 100 } as never)
    expect(String((await $.tool.call({ tool: 'mcp__session-crew__sync' } as never)).result)).toContain('nothing to import')
    expect(String((await $.tool.call({ tool: 'mcp__session-crew__sync', sessions: [] } as never)).result)).toContain('the sessions given hold no')
  })

  test('an imported session archived while working turns done, and back if unarchived', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    on('mcp.call', () => {
      throw new Error('no such server')
    })
    let listed = LISTING
    on('tool.call', { tool: 'mcp__ccd_session_mgmt__list_sessions' }, () => ({ result: listed, text: listed }))
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 100 } as never)
    await $.tool.call({ tool: 'mcp__session-crew__sync', parent: MAIN } as never)
    const nut = async () => (await crewOf($)).find(s => s.name === 'nut-pr-review-fixes')
    expect((await nut())?.status).toBe('working')

    // A list cut at its limit says nothing about who is missing.
    listed = JSON.stringify([{ sessionId: 'local_fd7771c9-837f-4a2b-83c4-aee07912c84f', name: 'plan-anycast-dns-adguard', startedBy: MAIN }])
    await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 1 } as never)
    expect((await nut())?.status).toBe('working')
    // A complete list without it: archived.
    await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 100 } as never)
    expect((await nut())?.status).toBe('done')
    // Unarchived, it is listed again and comes back.
    listed = LISTING.replace('"isRunning":true', '"isRunning":false')
    await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 100 } as never)
    expect((await nut())?.status).toBe('idle')
  })

  test('after /crew import off, imported sessions still refresh', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    const calls: Record<string, unknown>[] = []
    let listed = LISTING
    on('mcp.call', (_$, e) => {
      calls.push((e as unknown as { args: Record<string, unknown> }).args)
      return { value: { content: [{ type: 'text', text: listed }], isError: false } }
    })
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    await $.command.run({ command: 'crew', args: `import parent ${MAIN}` } as never)
    await $.command.run({ command: 'crew', args: 'import off' } as never)
    listed = LISTING.replace('"isRunning":true', '"isRunning":false')
    await $.command.run({ command: 'crew', args: 'refresh' } as never)
    expect(calls.at(-1)).toEqual({ limit: 100 })
    expect((await crewOf($)).find(s => s.name === 'nut-pr-review-fixes')?.status).toBe('idle')
  })

  test('/crew import lists sessions itself when it can', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    on('mcp.call', () => ({ value: { content: [{ type: 'text', text: LISTING }], isError: false } }))
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    const r = await $.command.run({ command: 'crew', args: `import parent ${MAIN} --archived` } as never)
    expect(r.text).toContain('imported 3 sessions')
    const crew = await crewOf($)
    expect(crew.find(s => s.name === 'rtl433-leak')?.status).toBe('done')
    const off = await $.command.run({ command: 'crew', args: 'import off' } as never)
    expect(off.text).toContain('Stopped importing')
  })

  test('/crew import asks Claude when the mod cannot list sessions', { options: { pollSeconds: 0 } }, async ($, on) => {
    const clock = host(on)
    on('mcp.call', () => {
      throw new Error('no such server')
    })
    on('tool.call', { tool: 'mcp__ccd_session_mgmt__list_sessions' }, () => ({ deny: 'not here' }))
    const prompts: string[] = []
    on('prompt.submit', (_$, e) => {
      prompts.push(e.text)
      return { text: e.text }
    })
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    const r = await $.command.run({ command: 'crew', args: 'import *dns*' } as never)
    expect(r.text).toContain('Asking Claude')
    await clock.advance(300)
    expect(prompts.length).toBe(1)
    expect(prompts[0]).toContain('mcp__ccd_session_mgmt__list_sessions with {"limit":100}')
    expect(prompts[0]).toContain('mcp__session-crew__sync with {"match":"*dns*"}')
  })

  test('the costume book in $.store gives a returning session its crab', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on, { 'session-crew.costumes': { byId: { 'local_00000000-0000-0000-0000-000000000001': 'light' }, next: 4 } })
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    await $.tool.call({
      tool: 'mcp__session-crew__status',
      sessions: [
        { id: 'local_00000000-0000-0000-0000-000000000002', name: 'new', status: 'working' },
        { id: 'local_00000000-0000-0000-0000-000000000001', name: 'old', status: 'idle' },
      ],
    } as never)
    const crew = await crewOf($)
    expect(crew.map(s => [s.name, s.costume])).toEqual([
      ['new', 'light'],
      ['old', 'light'],
    ])
  })

  test('the status tool and /crew face', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    const r = await $.tool.call({
      tool: 'mcp__session-crew__status',
      sessions: [{ id: 'local_00000000-0000-0000-0000-000000000001', name: 'tiny', title: 'Trivial', status: 'working' }],
    } as never)
    expect(String(r.result)).toContain('1 in the crew')
    const nope = await $.command.run({ command: 'crew', args: 'face tiny 🐉' } as never)
    expect(nope.text).toContain('No costume')
    const set = await $.command.run({ command: 'crew', args: 'face tiny chef' } as never)
    expect(set.text).toContain('tiny now wears chef')
    const listed = await $.command.run({ command: 'crew', args: 'faces' } as never)
    expect(listed.text).toContain('tiny: chef (working)')
  })
})
