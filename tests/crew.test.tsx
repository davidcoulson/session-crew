import { describe, expect, mock, test } from 'claude-code/testing'

import { CRAB_CSS, crab } from '../hooks/crab'
import { TERM_GAP, cardOf, cells, fitTerminalRow, layoutStrip, termCardCells, textW } from '../hooks/band'
import {
  assignCostumes,
  giveCostumes,
  listedToPatch,
  parseImportArgs,
  parseProposalsStarted,
  parseListing,
  selectForImport,
  stripItems,
  stripShown,
  stripSummary,
  workingFor,
  paneGroups,
  paneRowText,
  nextPaneChange,
  isHiddenBy,
  pillText,
  shortLabel,
  clipLabel,
  parseLabels,
  assignLabels,
  nextStripChange,
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
    // An error object, or a list of something else, is no list of sessions.
    expect(parseListing('{"error":"server not ready"}')).toBe(null)
    expect(parseListing('[{"message":"busy"}]')).toBe(null)
    expect(parseListing('[1,2]')).toBe(null)
    expect(parseListing('[{"id":"x"}]')).toBe(null)
    expect(parseListing('[{"sessionId":"local_x"}]')).toBe(null)
    expect(parseListing('{"sessionId":"local_x","isArchived":false,"isRunning":true}')?.length).toBe(1)
  })

  test('a proposal\'s crab follows it into its session id', () => {
    const proposal = giveCostumes(upsertAll([], [parseStartResult(PROPOSED)!], 0, 's'), { byId: {}, next: 2 })!
    const started = upsertAll(proposal.list, parsePromptText(LINKED), 1, 'linked-note').slice(0, 1)
    const book = giveCostumes(started, proposal.book)!.book
    expect(book.byId['local_b2441128-a7ac-4e22-81e8-52518a2540d0']).toBe('careful')
  })
})

describe('the strip above the prompt', () => {
  const T = { needsMs: 900_000, idleMs: 3_600_000, celebrateMs: 5_000, holdMs: 60_000 }
  const base = () => upsertAll([], [
    { id: 'local_00000000-0000-0000-0000-000000000001', name: 'busy', status: 'working' },
    { id: 'local_00000000-0000-0000-0000-000000000002', name: 'seen-idle', status: 'idle' },
    { id: 'local_00000000-0000-0000-0000-000000000003', name: 'seen-done', status: 'done' },
    { id: 'local_00000000-0000-0000-0000-000000000004', name: 'goes-idle', status: 'working' },
    { id: 'local_00000000-0000-0000-0000-000000000005', name: 'finishes', status: 'working' },
  ], 0, 'tool')

  test('working first, then waiting, then finished; first-seen idle and done stay in the pane', () => {
    let list = base()
    list = upsertAll(list, [{ id: 'local_00000000-0000-0000-0000-000000000004', status: 'idle' }, { id: 'local_00000000-0000-0000-0000-000000000005', status: 'done' }], 10_000, 'tool')
    expect(stripItems(list, 11_000, 0, T).map(i => [i.session.name, i.pose])).toEqual([
      ['goes-idle', 'needs'],
      ['busy', 'working'],
      ['finishes', 'done'],
    ])
    // A quarter of an hour on it is asleep: never a crab in the strip (the summary counts it).
    expect(stripItems(list, 10_000 + 900_001, 900_000, T).map(i => i.pose)).toEqual(['working'])
    // Celebration over: a check mark; still there after a minute while no prompt came.
    expect(stripItems(list, 16_000, 0, T).at(-1)?.pose).toBe('finished')
    expect(stripItems(list, 600_000, 0, T).some(i => i.session.name === 'finishes')).toBe(true)
    // A prompt after it finished: gone once the minute is up, not before.
    expect(stripItems(list, 30_000, 20_000, T).some(i => i.session.name === 'finishes')).toBe(true)
    expect(stripItems(list, 70_001, 20_000, T).some(i => i.session.name === 'finishes')).toBe(false)
    // Waiting for over an hour: back to the pane only.
    expect(stripItems(list, 10_000 + 3_600_001, 0, T).some(i => i.session.name === 'goes-idle')).toBe(false)
  })

  test('the clock only matters when a pose is due to change', () => {
    let list = base()
    // Working pills say "working <1m", then the minutes: the next change is on the minute.
    expect(nextStripChange(stripItems(list, 1_000, 0, T), 1_000, T)).toBe(60_000)
    expect(nextStripChange([], 1_000, T)).toBe(null)
    list = upsertAll(list, [{ id: 'local_00000000-0000-0000-0000-000000000005', status: 'done' }], 10_000, 'tool')
    expect(nextStripChange(stripItems(list, 11_000, 0, T), 11_000, T)).toBe(15_000)
  })

  test('an imported session already idle stays pane-only, however recent its activity', () => {
    const rows = [{ id: 'local_00000000-0000-0000-0000-00000000000a', name: 'imp', isArchived: false, isRunning: false, lastActivityAt: new Date(1_000_000 - 600_000).toISOString() }]
    const list = upsertAll([], rows.map(listedToPatch), 1_000_000, 'import', true)
    expect(list[0]?.changedAt).toBe(400_000) // the pane still says "idle 10m"
    expect(stripItems(list, 1_000_000, 0, T).length).toBe(0)
  })

  test('a proposal that started and went idle (or done) in one batch is in the strip', () => {
    for (const status of ['idle', 'done'] as const) {
      let list = upsertAll([], [parseStartResult(PROPOSED)!], 0, 's')
      list = upsertAll(list, [...parseProposalsStarted(LINKED), { id: 'local_b2441128-a7ac-4e22-81e8-52518a2540d0', status }], 5_000, 'linked-note')
      expect(stripItems(list, 6_000, 0, T).map(i => i.pose)).toEqual([status === 'idle' ? 'needs' : 'done'])
    }
  })

  test('pills, the summary and the overflow', () => {
    const at = 1_000_000
    const mk = (n: number, status: 'working' | 'idle' | 'done', note?: string) =>
      upsertAll(upsertAll([], [{ id: `local_00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`, name: `s${n}`, status: 'working' }], 0, 't'), [{ id: `local_00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`, status, note }], at - 720_000, 't')
    const list = [...mk(1, 'working'), ...mk(2, 'idle'), ...mk(3, 'done', 'PR #226'), ...mk(4, 'done'), ...mk(5, 'working'), ...mk(6, 'idle'), ...mk(7, 'working')]
    const items = stripItems(list, at, 0, T)
    expect(items.map(i => i.pose)).toEqual(['needs', 'needs', 'working', 'working', 'working', 'finished', 'finished'])
    const byName = (n: string) => items.find(i => i.session.name === n)!
    expect(pillText(byName('s1'), at)).toBe('working 16m')
    expect([workingFor(59_000), workingFor(61_000), workingFor(7_300_000)]).toEqual(['<1m', '1m', '2h'])
    expect(pillText(byName('s2'), at)).toBe('needs you')
    expect(pillText(byName('s3'), at)).toBe('done · PR #226')
    expect(pillText(byName('s4'), at)).toBe('done ✓')
    expect(stripSummary(items, false)).toBe('7 sessions · 3 working · 2 needs you · 2 done')
    expect(stripSummary(items, true)).toBe('● 3  ! 2  ✓ 2')
    // More than six: needs-you and working first, the rest counted.
    expect(stripShown(items, 10)).toEqual({ shown: items.slice(0, 5), more: 2 })
    expect(stripShown(items, 3).more).toBe(4)
    expect(stripShown(items.slice(0, 4), 10)).toEqual({ shown: items.slice(0, 4), more: 0 })
  })

  test('a narrow band keeps its row inside the band: counts alone, no forced card', () => {
    const list = upsertAll([], [1, 2, 3].map(n => ({ id: `local_00000000-0000-0000-0000-00000000000${n}`, name: `s${n}`, title: `Session number ${n}`, status: 'working' as const })), 0, 't')
    const items = stripItems(list, 1_000, 0, T)
    const make = (i: (typeof items)[number]) => cardOf(i, i.session.title, 'other', 1_000, 1.5)
    for (const W of [480, 900]) {
      const r = layoutStrip(W, items, make, 1.5, n => stripSummary(items, n))
      expect(r.band.width + textW(r.summary, 13) + 24).toBeLessThanOrEqual(W)
    }
    // Narrower than a card and the counts: one card within the band, the counts to wrap below it.
    for (const W of [140, 260]) {
      const r = layoutStrip(W, items, make, 1.5, n => stripSummary(items, n))
      expect(r.shown).toBe(1)
      expect(r.band.width).toBeLessThanOrEqual(W)
      expect(r.summary).toBe('● 3')
    }
    expect(layoutStrip(2000, items, make, 1.5, n => stripSummary(items, n)).shown).toBe(3)
  })

  test('the terminal row never runs past its columns', () => {
    const list = upsertAll([], [1, 2, 3, 4, 5].map(n => ({ id: `local_00000000-0000-0000-0000-00000000000${n}`, name: `s${n}`, title: n === 5 ? '你好世界任务' : `Session number ${n}`, status: (n === 2 ? 'idle' : 'working') as 'idle' | 'working' })), 0, 't')
    const late = upsertAll(list, [{ id: 'local_00000000-0000-0000-0000-000000000002', status: 'idle' }, { id: 'local_00000000-0000-0000-0000-000000000002', status: 'working' }], 1, 't')
    const items = stripItems(upsertAll(late, [{ id: 'local_00000000-0000-0000-0000-000000000002', status: 'idle' }], 2, 't'), 3, 0, T)
    const card = (i: (typeof items)[number]) => termCardCells(i.pose, i.session.title, pillText(i, 3))
    const rowCells = (r: ReturnType<typeof fitTerminalRow>) =>
      r.shown.reduce((w, i) => w + card(i), 0) + (r.more ? cells(`+${r.more} more`) : 0) + cells(r.summary) + TERM_GAP * (r.shown.length + (r.more ? 1 : 0))
    for (let cols = 1; cols <= 220; cols++) {
      const r = fitTerminalRow(items, cols, card, n => stripSummary(items, n))
      expect(rowCells(r)).toBeLessThanOrEqual(cols)
      // Every session is drawn or counted, unless there's no room even for "+N more".
      if (r.shown.length || r.more) expect(r.shown.length + r.more).toBe(items.length)
    }
    // Very narrow: the counts alone, cut to fit.
    expect(fitTerminalRow(items, 6, card, n => stripSummary(items, n))).toEqual({ shown: [], more: 0, summary: '● 4…' })
    expect(fitTerminalRow(items, 400, card, n => stripSummary(items, n)).shown.length).toBe(5)
    expect(fitTerminalRow(items, 400, card, n => stripSummary(items, n)).summary).toContain('sessions')
  })

  test('wide characters measure about an em each', () => {
    expect(textW('你好世界', 12)).toBeGreaterThan(textW('abcd', 12) * 1.7)
  })

  test('an import inferred archived does not celebrate', () => {
    let list = upsertAll([], [{ id: 'local_00000000-0000-0000-0000-000000000009', name: 'x', status: 'working', isImported: true }], 0, 'import')
    list = upsertAll(list, [{ id: 'local_00000000-0000-0000-0000-000000000009', status: 'done', note: 'archived' }], 1_000, 'import')
    expect(stripItems(list, 2_000, 0, T).length).toBe(0)
  })
})

describe('labels', () => {
  test('short labels from titles', () => {
    expect(shortLabel('Patched Prismarr build: library cache + PRs', 'prismarr-patch')).toBe('Prismarr build')
    expect(shortLabel('Add NIC optics sub-devices to the HA integration', 'add-nic-optics-sub-devic')).toBe('NIC optics…')
    expect(shortLabel('Build a to-do mod', 'todo-mod')).toBe('To-do mod')
    expect(shortLabel('', 'nut-pr-review-fixes')).toBe('Nut pr review…')
    expect(clipLabel('Set up Prismarr on Unraid server')).toBe('Set up Prismarr…')
    expect(shortLabel('Set up Prismarr on Unraid', 'set-up-prismarr-on-unrai')).toBe('Prismarr…')
    expect(shortLabel('Give each GPU its own HA sub-device', 'give-each-gpu-its-own-ha')).toBe('Each GPU…')
    expect(clipLabel('Supercalifragilisticexpialidocious')).toBe('Supercalifragil…')
  })

  test('rules first, then the model\'s label, then the short title', () => {
    const list = upsertAll([], [
      { id: 'local_00000000-0000-0000-0000-000000000001', name: 'todo-mod', title: 'Build a to-do mod for Claude Code', status: 'working' },
      { id: 'local_00000000-0000-0000-0000-000000000002', name: 'add-pool-drive-health-an', title: 'Add pool drive health and SMART attributes', status: 'working' },
      { id: 'local_00000000-0000-0000-0000-000000000003', name: 'prismarr-patch', title: 'Patched Prismarr build: library cache + PRs', status: 'working' },
    ], 0, 't')
    const labels = assignLabels(list, parseFaceRules(['todo-*=My to-do mod for Claude']), {
      'local_00000000-0000-0000-0000-000000000002': 'Pool health',
      // An old label kept cut is none: the title's short form stands until it is asked again.
      'local_00000000-0000-0000-0000-000000000003': 'Prismarr pat…',
    })
    expect([...labels.values()]).toEqual(['My to-do mod…', 'Pool health', 'Prismarr build'])
  })

  test('the model\'s answer: only the ids asked, clipped', () => {
    const got = parseLabels('Here: {"a": "Pool health", "b": "A label far longer than sixteen", "c": "x"}', ['a', 'b'])
    expect(got).toEqual({ a: 'Pool health' })
    expect(parseLabels('no json', ['a'])).toEqual({})
  })
})

describe('the pane', () => {
  const P = { needsMs: 900_000, recentMs: 1_800_000 }
  const id = (n: number) => `local_00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`
  // Seen working at 0, then each moves at 1_000_000 as given.
  const crewOf = (rows: [number, string, 'working' | 'idle' | 'done' | 'proposed', string?][], at = 1_000_000) =>
    upsertAll(upsertAll([], rows.map(([n, name]) => ({ id: id(n), name, status: 'working' as const })), 0, 't'), rows.map(([n, , status, note]) => ({ id: id(n), status, note })), at, 't')

  test('main shows working, needs you and recently finished; the rest fold; archived never shows', () => {
    let list = crewOf([
      [1, 'busy', 'working'],
      [2, 'waits', 'idle'],
      [3, 'fresh-done', 'done', 'PR #226'],
      [4, 'old-idle', 'idle'],
      [5, 'old-done', 'done'],
    ])
    // Three of them moved long before: asleep, finished.
    list = list.map(s => (s.name === 'old-idle' || s.name === 'old-done' ? { ...s, changedAt: -5_000_000, endedAt: s.endedAt === undefined ? undefined : -5_000_000 } : s))
    // An imported one, first seen idle, and an archived one.
    list = upsertAll(list, [
      { id: id(6), name: 'imported', status: 'idle', isImported: true, since: 900_000 },
      { id: id(7), name: 'archived', status: 'done', note: 'archived', isImported: true },
    ], 1_000_000, 'import', true)
    const g = paneGroups(list, 1_100_000, P)
    expect(g.main.map(r => [r.session.name, r.kind])).toEqual([
      ['waits', 'needs'],
      ['busy', 'working'],
      ['fresh-done', 'done'],
    ])
    expect(g.sleeping.map(s => s.name)).toEqual(['imported', 'old-idle'])
    expect(g.finished.map(s => s.name)).toEqual(['old-done'])
    expect(paneRowText(g.main[2]!, 1_100_000)).toBe('done · PR #226')
    expect(paneRowText(g.main[1]!, 1_100_000)).toBe('working · 18m')
    // Half an hour after it finished, it folds too.
    expect(paneGroups(list, 1_000_000 + 1_800_001, P).finished.map(s => s.name)).toContain('fresh-done')
  })

  test('a listed archived session is marked, and unmarked when it comes back', () => {
    let list = upsertAll([], [listedToPatch({ id: id(1), name: 'a', isArchived: false, isRunning: true })], 0, 'import', true)
    list = upsertAll(list, [listedToPatch({ id: id(1), isArchived: true })], 1, 'import', true)
    expect(list[0]?.isArchived).toBe(true)
    expect(paneGroups(list, 2, P).main.length + paneGroups(list, 2, P).sleeping.length + paneGroups(list, 2, P).finished.length).toBe(0)
    list = upsertAll(list, [listedToPatch({ id: id(1), isArchived: false, isRunning: false })], 3, 'import', true)
    expect(list[0]?.isArchived).toBe(undefined)
    expect(list[0]?.status).toBe('idle')
  })

  test('unarchived but still done, it shows again; a PR survives the archive', () => {
    let list = crewOf([[1, 'shipped', 'done', 'PR #226']])
    list = upsertAll(list, [listedToPatch({ id: id(1), isArchived: true })], 2_000_000, 'import', true)
    expect(paneGroups(list, 2_000_001, P).finished.length).toBe(0)
    expect(list[0]?.note).toBe('PR #226')
    list = upsertAll(list, [listedToPatch({ id: id(1), isArchived: false, status: 'done' })], 3_000_000, 'sync', true)
    expect(paneGroups(list, 3_000_001, P).finished.map(s => s.name)).toEqual(['shipped'])
    expect(list[0]?.note).toBe('PR #226')
    // A row an earlier version marked in its note comes back too.
    const old = [{ ...list[0]!, isArchived: undefined, note: 'archived' }]
    const back = upsertAll(old, [listedToPatch({ id: id(1), isArchived: false, isRunning: false })], 4_000_000, 'import', true)
    expect(back[0]?.note).toBe(undefined)
    expect(back[0]?.status).toBe('idle')
  })

  test('the pane\'s clock: due when a time\'s words change or a row changes group', () => {
    const list = crewOf([[1, 'fresh-done', 'done']])
    const g = paneGroups(list, 1_000_000, P)
    // "done · 0s ago" changes in a second; once past a minute, on the minute; it folds at 30 minutes.
    expect(nextPaneChange(g, 1_000_000, false, P)).toBe(1_001_000)
    expect(nextPaneChange(g, 1_000_000 + 90_000, false, P)).toBe(1_000_000 + 120_000)
    const pr = paneGroups(crewOf([[1, 'shipped', 'done', 'PR #9']]), 1_000_000, P)
    expect(nextPaneChange(pr, 1_000_000, false, P)).toBe(1_000_000 + 1_800_000)
    // Sleeping rows only count while they show.
    const asleep = paneGroups(upsertAll([], [{ id: id(2), name: 'z', status: 'idle' }], 0, 't'), 100_000, P)
    expect(nextPaneChange(asleep, 100_000, false, P)).toBe(null)
    expect(nextPaneChange(asleep, 100_000, true, P)).toBe(120_000)
  })

  test('hide rules match name, title or id', () => {
    const [s] = upsertAll([], [{ id: id(1), name: 'mod-ideas', title: 'Brainstorm mod ideas', status: 'idle' }], 0, 't')
    expect(isHiddenBy(s!, ['mod-*'])).toBe(true)
    expect(isHiddenBy(s!, ['*brainstorm*'])).toBe(true)
    expect(isHiddenBy(s!, ['nut-*'])).toBe(false)
  })

  test('the strip summary counts sleeping sessions', () => {
    const items = stripItems(crewOf([[1, 'busy', 'working']]), 1_000_000, 0)
    expect(stripSummary(items, false, 13)).toBe('14 sessions · 1 working · 13 sleeping')
    expect(stripSummary(items, true, 13)).toBe('● 1  z 13')
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
      // The label, not the slug: "Address CodeRabbit comments on NUT PRs" → "CodeRabbit…".
      if (surface === 'terminal') expect(await ui.find({ type: 'Text', text: /CodeRabbit/ })).toBeDefined()
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
      const wears = (label: string) => / the (\w+) crab/.exec(alts.find(a => a.startsWith(`${label},`)) ?? '')?.[1]
      return [wears('One'), wears('Two')]
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
      { sessionId: 'local_1fc7cd3c-3b35-456d-af06-23bec066b037', isArchived: false, name: 'nut-pr-review-fixes', isRunning: false, startedBy: MAIN },
      { sessionId: 'local_fd7771c9-837f-4a2b-83c4-aee07912c84f', isArchived: false, name: 'plan-anycast-dns-adguard', isRunning: true, startedBy: MAIN },
      { sessionId: 'local_00000000-0000-0000-0000-0000000000aa', isArchived: false, name: 'brand-new', isRunning: true, startedBy: MAIN },
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
    listed = JSON.stringify([{ sessionId: 'local_fd7771c9-837f-4a2b-83c4-aee07912c84f', isArchived: false, name: 'plan-anycast-dns-adguard', startedBy: MAIN }])
    await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 1 } as never)
    expect((await nut())?.status).toBe('working')
    // An error answer is no list: nothing is inferred from it.
    for (const junk of ['{"error":"server not ready"}', '[{"id":"x"}]', '[{"message":"busy"}]']) {
      listed = junk
      await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 100 } as never)
      expect((await nut())?.status).toBe('working')
    }
    listed = JSON.stringify([{ sessionId: 'local_fd7771c9-837f-4a2b-83c4-aee07912c84f', isArchived: false, name: 'plan-anycast-dns-adguard', startedBy: MAIN }])
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

  test('the strip draws above whatever the band held, on each surface, and /crew strip turns it off', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    // Another mod's bar beneath (savvy-progress's, say).
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', props: {}, children: ['other bar'] }) as never)
    await $.session.start({ cwd: '/tmp', surface: 'desktop' } as never)
    await $.tool.call({ tool: 'mcp__session-crew__status', sessions: [{ id: 'local_00000000-0000-0000-0000-000000000001', name: 'busy-crab', status: 'working' }] } as never)
    const band = { plugin: 'session-crew', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { bodyRows: 9, offset: 0, total: 0 } } }
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...band, surface } as never)
      expect(await ui.find({ type: 'Text', text: 'other bar' })).toBeDefined()
      expect(await ui.find({ type: 'Button', key: 'session-crew-open' })).toBeDefined()
      if (surface === 'desktop') expect(String((await ui.find({ type: 'Svg' }))?.props.alt)).toContain('Busy crab: working')
      else expect(await ui.find({ type: 'Text', text: /Busy crab/ })).toBeDefined()
      expect((await ui.find({ type: 'Button', key: 'session-crew-open' }))?.text).toContain('1 working')
      await ui.unmount()
    }
    expect((await $.command.run({ command: 'crew', args: 'strip off' } as never)).text).toContain('off')
    const ui = await $.ui.mount({ ...band, surface: 'desktop' } as never)
    expect(await ui.find({ type: 'Button', key: 'session-crew-open' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'other bar' })).toBeDefined()
    await ui.unmount()
  })

  test('the terminal strip\'s spinner turns with the pane closed', { options: { pollSeconds: 0 } }, async ($, on) => {
    const clock = host(on)
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }) as never)
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    await $.tool.call({ tool: 'mcp__session-crew__status', sessions: [{ id: 'local_00000000-0000-0000-0000-000000000001', name: 'spinner', status: 'working' }] } as never)
    const ui = await $.ui.mount({
      plugin: 'session-crew',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { bodyRows: 9, offset: 0, total: 0 } },
    } as never)
    const glyphs = async () => (await ui.findAll({ type: 'Text' })).map(t => t.text).join('|')
    const before = await glyphs()
    await clock.advance(1_000)
    expect(await glyphs()).not.toBe(before)
    await ui.unmount()
  })

  test('new sessions get a short label from the model, once, kept in $.store', { options: { pollSeconds: 0 } }, async ($, on) => {
    const clock = host(on)
    const asked: string[] = []
    on('model.complete', (_$, e) => {
      asked.push(e.prompt)
      return { value: { isAnswered: true, text: '{"local_00000000-0000-0000-0000-000000000001": "Pool health"}', usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } } as never
    })
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    await $.tool.call({ tool: 'mcp__session-crew__status', sessions: [{ id: 'local_00000000-0000-0000-0000-000000000001', name: 'add-pool-drive-health-an', title: 'Add pool drive health and SMART', status: 'working' }] } as never)
    await clock.advance(5_000)
    await clock.advance(5_000)
    expect(asked.length).toBe(1)
    expect(asked[0]).toContain('Add pool drive health and SMART')
    expect((await $.command.run({ command: 'crew', args: 'labels' } as never)).text).toContain('add-pool-drive-health-an: Pool health')
    // A rule wins.
    await $.command.run({ command: 'crew', args: 'label add-pool-* Disks' } as never)
    expect((await $.command.run({ command: 'crew', args: 'labels' } as never)).text).toContain('add-pool-drive-health-an: Disks')
  })

  test('a label another session already wrote is used, not asked again', { options: { pollSeconds: 0 } }, async ($, on) => {
    const clock = host(on, { 'session-crew.writtenLabels': { 'local_00000000-0000-0000-0000-000000000001': 'Pool health' } })
    let calls = 0
    on('model.complete', () => {
      calls++
      return { value: { isAnswered: true, text: '{}', usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } } as never
    })
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    await $.tool.call({ tool: 'mcp__session-crew__status', sessions: [{ id: 'local_00000000-0000-0000-0000-000000000001', name: 'pool', title: 'Add pool drive health', status: 'working' }] } as never)
    await clock.advance(5_000)
    expect(calls).toBe(0)
    expect((await $.command.run({ command: 'crew', args: 'labels' } as never)).text).toContain('pool: Pool health')
  })

  test('the drawn terminal strip fits its columns', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }) as never)
    await $.session.start({ cwd: '/tmp', surface: 'terminal' } as never)
    await $.tool.call({
      tool: 'mcp__session-crew__status',
      sessions: [1, 2, 3, 4].map(n => ({ id: `local_00000000-0000-0000-0000-00000000000${n}`, name: `s${n}`, title: `Session number ${n} with a long title`, status: 'working' })),
    } as never)
    for (const cols of [8, 14, 30, 50, 80, 120]) {
      const ui = await $.ui.mount({
        plugin: 'session-crew',
        surface: 'terminal',
        component: 'AbovePrompt',
        props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: cols, scroll: { bodyRows: 9, offset: 0, total: 0 } },
      } as never)
      const texts = await ui.findAll({ type: 'Text' })
      // A card is the outer Text that starts with its crab glyph; its parts are nested Texts.
      const cards = texts.filter(t => t.text.startsWith('▣ '))
      const more = texts.find(t => /^\+\d+ more$/.test(t.text))
      const button = await ui.find({ type: 'Button', key: 'session-crew-open' })
      const parts = [...cards.map(t => t.text), ...(more ? [more.text] : []), button?.text ?? '']
      const drawn = parts.reduce((w, t) => w + cells(t), 0) + TERM_GAP * (parts.length - 1)
      expect(drawn).toBeLessThanOrEqual(cols)
      if (cards.length) {
        // A card's text is the whole card, its nested pill included, or this would measure nothing.
        expect(cards[0]?.text).toMatch(/^▣ Session.* working <1m$/)
        expect(drawn).toBeLessThanOrEqual(cols)
      }
      expect(button).toBeDefined()
      if (cols >= 80) expect(cards.length).toBeGreaterThan(0)
      await ui.unmount()
    }
  })

  test('the pane folds sleeping sessions, /crew sleeping and /crew hide', { options: { pollSeconds: 0, hidePatterns: ['secret-*'] } }, async ($, on) => {
    host(on)
    await $.session.start({ cwd: '/tmp', surface: 'desktop' } as never)
    const sessions = [
      { id: 'local_00000000-0000-0000-0000-000000000001', name: 'busy', title: 'Busy work', status: 'working' },
      ...[2, 3, 4].map(n => ({ id: `local_00000000-0000-0000-0000-00000000000${n}`, name: `sleepy-${n}`, title: `Sleepy ${n}`, status: 'idle' })),
      { id: 'local_00000000-0000-0000-0000-000000000005', name: 'secret-thing', title: 'Secret', status: 'working' },
      { id: 'local_00000000-0000-0000-0000-000000000006', name: 'noisy', title: 'Noisy one', status: 'working' },
    ]
    await $.tool.call({ tool: 'mcp__session-crew__status', sessions } as never)
    const pane = { plugin: 'session-crew', component: 'Pane', requestId: 'session-crew', surface: 'desktop', props: { title: 'Session crew', isFocused: false, bodyColumns: 80, placement: 'dock' } }
    const alts = async () => {
      const ui = await $.ui.mount(pane as never)
      const out = { alts: (await ui.findAll({ type: 'Svg' })).map(t => String(t.props.alt)), toggle: (await ui.find({ type: 'Button', key: 'sleeping' }))?.text }
      await ui.unmount()
      return out
    }
    let view = await alts()
    // Reported idle without being seen working: asleep, folded; the option hides secret-*.
    expect(view.alts.map(a => a.split(',')[0])).toEqual(['Busy work', 'Noisy one'])
    expect(view.toggle).toBe('▸ 3 sleeping · show')
    expect((await $.command.run({ command: 'crew', args: 'sleeping show' } as never)).text).toContain('shown')
    view = await alts()
    expect(view.alts.length).toBe(5)
    expect(view.alts.filter(a => a.includes(': idle ')).length).toBe(3)
    await $.command.run({ command: 'crew', args: 'hide noisy' } as never)
    view = await alts()
    expect(view.alts.some(a => a.startsWith('Noisy'))).toBe(false)
    await $.command.run({ command: 'crew', args: 'unhide noisy' } as never)
    await $.command.run({ command: 'crew', args: 'sleeping hide' } as never)
    view = await alts()
    expect(view.alts.length).toBe(2)
  })

  test('a withdrawn proposal folds as dismissed, never done', { options: { pollSeconds: 0 } }, async ($, on) => {
    host(on)
    on('tool.call', { tool: 'mcp__ccd_session__start_session' }, () => ({ result: PROPOSED, text: PROPOSED }))
    on('tool.call', { tool: 'mcp__ccd_session__dismiss_task' }, () => ({ result: 'Task task_a2708030 withdrawn', text: 'Task task_a2708030 withdrawn' }))
    await $.session.start({ cwd: '/tmp', surface: 'desktop' } as never)
    await $.tool.call({ tool: 'mcp__ccd_session__start_session', initiation: 'own_initiative', title: 'x', prompt: 'y' } as never)
    await $.tool.call({ tool: 'mcp__ccd_session__dismiss_task', task_id: 'task_a2708030' } as never)
    for (const surface of ['desktop', 'terminal'] as const) {
      const ui = await $.ui.mount({ plugin: 'session-crew', component: 'Pane', requestId: 'session-crew', surface, props: { title: 'Session crew', isFocused: false, bodyColumns: 80, placement: 'dock' } } as never)
      // The fold is the pane's state, shared by surfaces: opened once.
      if (surface === 'desktop') await ui.press({ key: 'done' })
      if (surface === 'desktop') {
        const alts = (await ui.findAll({ type: 'Svg' })).map(t => String(t.props.alt))
        expect(alts.some(a => a.endsWith(': dismissed'))).toBe(true)
        expect(alts.some(a => a.includes('done'))).toBe(false)
      } else expect(await ui.find({ type: 'Text', text: 'dismissed' })).toBeDefined()
      await ui.unmount()
    }
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
