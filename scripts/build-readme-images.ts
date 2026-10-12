// Draws the README's pictures into docs/images/ with the mod's own code
// (hooks/crab.ts, hooks/holidays.ts, the strip from hooks/band.ts), so they
// match what the mod draws. Run with bun: bun scripts/build-readme-images.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { FONT, bandSvg, cardOf, xml } from '../hooks/band'
import { ROTATION, WEARS } from '../hooks/crab'
import type { CrabPose } from '../hooks/crab'
import { CRAB_CSS, HOLIDAYS, crab } from '../hooks/holidays'
import type { CrewSession } from '../types'

const out = join(import.meta.dir, '..', 'docs/images')
mkdirSync(out, { recursive: true })

// Captions in a grey that reads on GitHub's light and dark pages alike.
const CAPTION_CSS = `<style>.cap{fill:#57606a}@media (prefers-color-scheme: dark){.cap{fill:#9198a1}}</style>`
const SCALE = 3
const CELL_W = 37 * SCALE + 12
const CELL_H = 34 * SCALE + 22

/** A row (or rows) of crabs, each with a caption under it. */
function sheet(items: { costume: string; pose: CrabPose; caption: string }[], perRow = items.length): string {
  const rows = Math.ceil(items.length / perRow)
  const W = Math.min(items.length, perRow) * CELL_W
  const H = rows * CELL_H
  const cells = items.map((it, i) => {
    const x = (i % perRow) * CELL_W + 6
    const y = Math.floor(i / perRow) * CELL_H
    // The crab's grid is 30×28; room is left round it for the z's and confetti that drift out.
    return `${crab(x + 5 * SCALE, y + 5 * SCALE, it.costume, it.pose, SCALE)}<text class="cap" x="${x + (37 * SCALE) / 2}" y="${y + 34 * SCALE + 12}" text-anchor="middle" font-family="${FONT}" font-size="13">${xml(it.caption)}</text>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CRAB_CSS}${CAPTION_CSS}${cells.join('')}</svg>`
}

const write = (name: string, svg: string) => {
  writeFileSync(join(out, name), svg)
  console.log(`docs/images/${name}: ${(svg.length / 1024).toFixed(0)} KB`)
}

// The six costumes, working.
write('costumes.svg', sheet(ROTATION.map(c => ({ costume: c, pose: 'working' as const, caption: WEARS[c] ?? c }))))

// One crab through its statuses.
write(
  'statuses.svg',
  sheet([
    { costume: 'careful', pose: 'working', caption: 'working' },
    { costume: 'careful', pose: 'waiting', caption: 'needs you' },
    { costume: 'careful', pose: 'idle', caption: 'idle' },
    { costume: 'careful', pose: 'done', caption: 'done' },
  ]),
)

// The first outfit of each holiday.
write('holidays.svg', sheet(HOLIDAYS.map(h => ({ costume: h.outfits[0]!.id, pose: 'working' as const, caption: h.name })), 6))

// The strip above the prompt, with made-up sessions.
const at = Date.now()
const session = (name: string, status: CrewSession['status'], minutes: number, note?: string): CrewSession => ({
  id: `local_${name}`, name, title: name, status, startedAt: at - minutes * 60_000, changedAt: at - minutes * 60_000, note,
})
const strip = [
  { s: session('docs', 'working', 12), pose: 'working' as const, label: 'Fix the docs', costume: 'fable' },
  { s: session('tests', 'idle', 3), pose: 'needs' as const, label: 'Flaky tests', costume: 'heavy' },
  { s: session('deps', 'working', 4), pose: 'working' as const, label: 'Bump deps', costume: 'medium' },
  { s: session('release', 'done', 1, 'PR #42'), pose: 'done' as const, label: 'Release notes', costume: 'light' },
]
write('strip.svg', bandSvg(2000, strip.map(c => cardOf({ session: c.s, pose: c.pose }, c.label, c.costume, at, 1.5)), 0, 1.5).source)
