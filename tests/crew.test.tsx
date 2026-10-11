import { describe, expect, mock, test } from 'claude-code/testing'

import { CRAB_CSS, crab } from '../hooks/crab'
import {
  assignCostumes,
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

// What a session's engine would answer beneath the mod.
const host = (on: Parameters<typeof mock.clock>[0]) => {
  mock.clock(on)
  mock.store(on)
  on('session.start', () => ({ cwd: '/tmp' }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: [] }))
}

type Row = { name: string; status: string; id: string }
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
