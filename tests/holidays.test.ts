import { describe, expect, test } from 'claude-code/testing'

import { HOLIDAYS, HOLIDAY_CSS, OUTFITS, activeHolidays, assignOutfits, holidayCrab, holidaysOn } from '../hooks/holidays'
import type { CrabPose } from '../hooks/crab'

const POSES: CrabPose[] = ['working', 'idle', 'done', 'proposed', 'dismissed', 'waiting', 'finished']

// Well-formed XML for the subset the crab writes: every tag closed in order, every attribute quoted.
function wellFormed(svg: string): string | undefined {
  const stack: string[] = []
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/g
  let at = 0
  for (let m = tag.exec(svg); m; m = tag.exec(svg)) {
    const between = svg.slice(at, m.index)
    if (between.includes('<')) return `stray < before ${m[0]}`
    at = m.index + m[0].length
    const [, close, name, , self] = m
    if (close) {
      if (stack.pop() !== name) return `</${name}> closes nothing open`
    } else if (!self) stack.push(name ?? '')
  }
  if (svg.slice(at).includes('<')) return 'unparsed tag at the end'
  return stack.length ? `unclosed <${stack.join('>, <')}>` : undefined
}

describe('holiday outfits', () => {
  test('8 to 12 named outfits per holiday, ids unique', () => {
    const ids = new Set<string>()
    for (const h of HOLIDAYS) {
      expect(h.outfits.length >= 8 && h.outfits.length <= 12).toBe(true)
      for (const o of h.outfits) {
        expect(/^[a-z][a-z0-9-]*$/.test(o.id)).toBe(true)
        expect(ids.has(o.id)).toBe(false)
        ids.add(o.id)
        expect(o.name.trim().length > 0 && o.note.trim().length > 0).toBe(true)
      }
    }
    expect(OUTFITS.size).toBe(ids.size)
  })

  test('every outfit renders valid SVG in every pose, inside the 30×28 grid', () => {
    for (const [id] of OUTFITS)
      for (const pose of POSES) {
        const g = holidayCrab(0, 0, id, pose, 1)
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 28">${g}</svg>`
        const bad = wellFormed(svg)
        if (bad) throw new Error(`${id} ${pose}: ${bad}`)
        expect(/undefined|NaN/.test(g)).toBe(false)
        expect(g).toContain(`c-h-${id} hol`)
        for (const r of g.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="([^"]+)"/g)) {
          const [x, y, w, h] = r.slice(1, 5).map(Number) as [number, number, number, number]
          // Confetti on `done` is crab.ts's own and starts above the grid.
          if (r[0].includes('class=')) continue
          const inGrid = Number.isInteger(x) && Number.isInteger(y) && w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= 30 && y + h <= 28
          if (!inGrid) throw new Error(`${id} ${pose}: rect ${x},${y} ${w}×${h} leaves the grid`)
          expect(/^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgba?\([\d.,\s]+\))$/.test(r[5] ?? '')).toBe(true)
        }
      }
  })

  test('working moves, idle rests, done cheers, as the usual costumes do', () => {
    const [id] = [...OUTFITS.keys()]
    expect(holidayCrab(0, 0, id ?? '', 'working')).toContain(' run"')
    expect(holidayCrab(0, 0, id ?? '', 'idle')).toContain(' rest"')
    expect(holidayCrab(0, 0, id ?? '', 'done')).toContain('class="ar"')
  })

  test('the CSS is balanced and each outfit scopes its own', () => {
    const css = HOLIDAY_CSS.replace(/<\/?style>/g, '')
    expect(css.split('{').length).toBe(css.split('}').length)
    for (const h of HOLIDAYS)
      for (const o of h.outfits)
        for (const rule of (o.css ?? '').split('}').filter(r => r.includes('{') && !r.trim().startsWith('@') && !/^\s*\d+%|^\s*(from|to)\b/.test(r)))
          expect(rule.trim().startsWith(`.c-h-${o.id}`)).toBe(true)
    expect(HOLIDAY_CSS).toContain('prefers-reduced-motion: reduce')
  })
})

describe('switching on (proposal)', () => {
  const on = (y: number, m: number, d: number) => holidaysOn(new Date(y, m - 1, d)).map(h => h.id)

  test('Halloween runs Oct 15–31', () => {
    expect(on(2026, 10, 14)).not.toContain('halloween')
    expect(on(2026, 10, 15)).toContain('halloween')
    expect(on(2026, 10, 31)).toContain('halloween')
    expect(on(2026, 11, 1)).not.toContain('halloween')
  })

  test('off never dresses up; a holiday id forces it', () => {
    expect(activeHolidays(new Date(2026, 9, 20), 'off')).toEqual([])
    expect(activeHolidays(new Date(2026, 5, 1), 'Halloween').map(h => h.id)).toEqual(['halloween'])
    expect(activeHolidays(new Date(2026, 9, 20), 'nonsense').map(h => h.id)).toContain('halloween')
  })

  test('outfits stay with a session and never double up until the pool runs out', () => {
    const h = HOLIDAYS.filter(x => x.id === 'halloween')
    const ids = Array.from({ length: 8 }, (_, i) => `local_${i}0000000-0000-0000-0000-000000000000`)
    const a = assignOutfits(ids, h, 2026)
    expect(new Set(a.values()).size).toBe(ids.length)
    expect(assignOutfits(ids, h, 2026)).toEqual(a)
    // A session keeps its outfit when one that joined before it leaves, unless it had moved to dodge a clash.
    const first = assignOutfits(ids.slice(0, 1), h, 2026)
    expect(first.get(ids[0] ?? '')).toBe(a.get(ids[0] ?? ''))
    expect(assignOutfits(ids, [], 2026).size).toBe(0)
  })
})
