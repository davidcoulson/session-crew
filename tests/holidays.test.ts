import { describe, expect, test } from 'claude-code/testing'

import { HOLIDAYS, HOLIDAY_CSS, OUTFITS, activeHolidays, assignOutfits, costumeColor, crab, holidayCrab, holidaysOn, seasonAt, wears } from '../hooks/holidays'
import { assignCostumes } from '../hooks/parse'
import type { CrewSession } from '../types'
import type { CrabPose } from '../hooks/crab'
import { easterSunday } from '../hooks/holidays/easter'
import { thanksgivingDay } from '../hooks/holidays/thanksgiving'

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
  test('4 to 12 named outfits per holiday, ids unique', () => {
    const ids = new Set<string>()
    for (const h of HOLIDAYS) {
      expect(h.outfits.length >= 4 && h.outfits.length <= 12).toBe(true)
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

  test('moving and wrapping windows', () => {
    // Hanukkah 2026: the first evening Dec 4, eight nights.
    expect(on(2026, 12, 3)).not.toContain('hanukkah')
    expect(on(2026, 12, 4)).toContain('hanukkah')
    expect(on(2026, 12, 12)).toContain('hanukkah')
    expect(on(2026, 12, 13)).not.toContain('hanukkah')
    // Overlaps pool: Hanukkah inside Christmas, Muertos at the end of Halloween.
    expect(on(2026, 12, 10)).toEqual(expect.arrayContaining(['hanukkah', 'christmas']))
    expect(on(2026, 10, 30)).toEqual(expect.arrayContaining(['halloween', 'muertos']))
    // New Year's Eve wraps the year: on from Dec 29 to Jan 2 either side.
    expect(on(2026, 12, 29)).toContain('newyear')
    expect(on(2027, 1, 2)).toContain('newyear')
    expect(on(2027, 1, 3)).not.toContain('newyear')
    // Thanksgiving 2026 is Thursday Nov 26.
    expect(thanksgivingDay(2026).getDate()).toBe(26)
    expect(on(2026, 11, 23)).toContain('thanksgiving')
    expect(on(2026, 11, 30)).not.toContain('thanksgiving')
    // Lunar New Year 2027 is Feb 6: the eve through the first week.
    expect(on(2027, 2, 5)).toContain('lunarnewyear')
    expect(on(2027, 2, 13)).toContain('lunarnewyear')
    expect(on(2027, 2, 14)).not.toContain('lunarnewyear')
    // Easter 2027 is Mar 28: from the Sunday before through Easter Monday.
    expect(easterSunday(2027).getMonth() * 100 + easterSunday(2027).getDate()).toBe(228)
    expect(on(2027, 3, 21)).toContain('easter')
    expect(on(2027, 3, 29)).toContain('easter')
    expect(on(2027, 3, 30)).not.toContain('easter')
    // Past the tables nothing turns on by mistake.
    expect(on(2040, 2, 10)).not.toContain('lunarnewyear')
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

describe('wearing them', () => {
  const session = (n: number, name: string): CrewSession => ({
    id: `local_${String(n).padStart(8, '0')}-0000-0000-0000-000000000000`, name, title: name, status: 'working', startedAt: n, changedAt: n, slot: n,
  })
  const crew = [session(0, 'nut-pr'), session(1, 'prismarr'), session(2, 'gpu'), session(3, 'dns')]
  const halloween = seasonAt(new Date(2026, 9, 20).getTime())

  test('in a season, sessions without a rule wear its outfits, all different', () => {
    expect(halloween.holidays.map(h => h.id)).toEqual(['halloween'])
    const got = assignCostumes(crew, [], halloween)
    const ids = [...got.values()]
    expect(new Set(ids).size).toBe(crew.length)
    for (const id of ids) expect(OUTFITS.get(id)?.holiday.id).toBe('halloween')
    // Out of season: the usual rotation.
    expect([...assignCostumes(crew, [], seasonAt(new Date(2026, 7, 1).getTime())).values()]).toEqual(['fable', 'heavy', 'careful', 'medium'])
  })

  test('rules win, and may name a holiday outfit or a costume', () => {
    const got = assignCostumes(crew, [['nut-*', 'engineer'], ['gpu', 'Santa']], halloween)
    expect(got.get(crew[0]?.id ?? '')).toBe('careful')
    expect(got.get(crew[2]?.id ?? '')).toBe('santa')
    expect(OUTFITS.get(got.get(crew[1]?.id ?? '') ?? '')?.holiday.id).toBe('halloween')
  })

  test('skip leaves a holiday out, unless it is forced; New Year keeps its year past midnight', () => {
    expect(seasonAt(new Date(2026, 9, 20).getTime(), 'auto', ['halloween']).holidays).toEqual([])
    expect(seasonAt(new Date(2026, 5, 1).getTime(), 'halloween', ['halloween']).holidays.map(h => h.id)).toEqual(['halloween'])
    expect(seasonAt(new Date(2026, 11, 31).getTime()).year).toBe(2026)
    expect(seasonAt(new Date(2027, 0, 1).getTime()).year).toBe(2026)
  })

  test('one crab call draws both kinds, with a colour and words for each', () => {
    expect(crab(0, 0, 'witch', 'working')).toContain('c-h-witch hol run')
    expect(crab(0, 0, 'heavy', 'working')).toContain('c-heavy run')
    expect(costumeColor('heavy')).toBe('#D85A30')
    expect(costumeColor('witch')).toBe('#7F4FB8')
    expect(wears('heavy')).toBe('detective')
    expect(wears('pumpkin')).toBe("jack-o'-lantern")
  })
})
