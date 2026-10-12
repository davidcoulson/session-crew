// Holiday outfits for the crew's crabs: drawn by crab.ts's own frame, body and
// eyes (see hooks/holidays/kit.ts), one file per holiday. During a holiday's
// date window, sessions without a `faces` rule wear its outfits (see
// assignCostumes in parse.ts). The strip and the pane draw every crab through
// `crab` and `CRAB_CSS` here, which know the holiday outfits as well as
// crab.ts's costumes. preview/holidays.html shows them all.

import { COSTUME_COLOR, CRAB_CSS as BASE_CSS, WEARS, costumeKey, crab as baseCrab, drawCrab } from './crab'
import type { CrabPose } from './crab'
import { KIT_CSS } from './holidays/kit'
import type { Holiday, Outfit } from './holidays/kit'
import { CHRISTMAS } from './holidays/christmas'
import { DIWALI } from './holidays/diwali'
import { EASTER } from './holidays/easter'
import { HALLOWEEN } from './holidays/halloween'
import { HANUKKAH } from './holidays/hanukkah'
import { JULY_4 } from './holidays/july4'
import { LUNAR_NEW_YEAR } from './holidays/lunarnewyear'
import { MUERTOS } from './holidays/muertos'
import { NEW_YEAR } from './holidays/newyear'
import { ST_PATRICK } from './holidays/stpatrick'
import { THANKSGIVING } from './holidays/thanksgiving'
import { VALENTINE } from './holidays/valentine'

export type { Holiday, Outfit }

/** In calendar order from January. */
export const HOLIDAYS: Holiday[] = [
  LUNAR_NEW_YEAR, VALENTINE, ST_PATRICK, EASTER, JULY_4, MUERTOS, HALLOWEEN, DIWALI, THANKSGIVING, HANUKKAH, CHRISTMAS, NEW_YEAR,
]

export const OUTFITS: Map<string, { outfit: Outfit; holiday: Holiday }> = new Map(
  HOLIDAYS.flatMap(h => h.outfits.map(o => [o.id, { outfit: o, holiday: h }] as const)),
)

/** crab.ts's CSS, the kit's prop motion, then each outfit's own. */
export const HOLIDAY_CSS = BASE_CSS + KIT_CSS + `<style>${HOLIDAYS.flatMap(h => h.outfits.map(o => o.css ?? '')).join('')}</style>`

/** One crab at (x, y) in a holiday outfit, posed as crab.ts's `crab` poses it. */
export function holidayCrab(x: number, y: number, id: string, status: CrabPose, scale?: number): string {
  const found = OUTFITS.get(id)
  if (!found) throw new Error(`no holiday outfit ${id}`)
  const { outfit } = found
  return drawCrab(x, y, `c-h-${id} hol${outfit.float ? ' fl' : ''}`, outfit.draw, status, scale)
}

const dayNumber = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5

/** The holidays on `date` (local), checking this year's window and last year's (for one that wraps New Year). */
export function holidaysOn(date: Date, holidays: Holiday[] = HOLIDAYS): Holiday[] {
  const n = dayNumber(date)
  return holidays.filter(h =>
    [date.getFullYear(), date.getFullYear() - 1].some(y => {
      const [from, to] = h.window(y)
      return dayNumber(from) <= n && n <= dayNumber(to)
    }),
  )
}

/**
 * The proposed `holidays` option: `auto` (the default) follows the calendar,
 * `off` never dresses up, a holiday's id forces it whatever the date (for
 * trying them out). Anything else counts as `auto`.
 */
export function activeHolidays(date: Date, option = 'auto'): Holiday[] {
  const o = option.trim().toLowerCase()
  if (o === 'off') return []
  const forced = HOLIDAYS.find(h => h.id === o)
  return forced ? [forced] : holidaysOn(date)
}

// FNV-1a: a small stable hash, the same for a session id in every process.
const hash = (s: string): number => {
  let h = 0x811c9dc5
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0
  return h
}

/**
 * Who wears what: each session's outfit comes from a hash of its id and the
 * year, so it is the same in every panel and after a restart, with nothing to
 * store. Sessions take theirs in join order and a clash moves to the next
 * free outfit, so no two crabs on screen match until the pool runs out.
 * Overlapping holidays (Hanukkah in December) pool their outfits.
 */
export function assignOutfits(ids: string[], holidays: Holiday[], year: number): Map<string, string> {
  const pool = holidays.flatMap(h => h.outfits.map(o => o.id))
  const out = new Map<string, string>()
  if (!pool.length) return out
  const taken = new Set<string>()
  for (const id of ids) {
    const start = hash(`${id}:${year}`) % pool.length
    let pick = pool[start] ?? ''
    for (let i = 0; i < pool.length; i++) {
      const p = pool[(start + i) % pool.length] ?? ''
      if (!taken.has(p)) { pick = p; break }
    }
    taken.add(pick)
    out.set(id, pick)
  }
  return out
}

/** Every crab's CSS: crab.ts's costumes and the holiday outfits. */
export const CRAB_CSS = HOLIDAY_CSS

/** One crab in any costume: a holiday outfit's id, else crab.ts's costumes. */
export function crab(x: number, y: number, costume: string, status: CrabPose, scale?: number): string {
  return OUTFITS.has(costume) ? holidayCrab(x, y, costume, status, scale) : baseCrab(x, y, costume, status, scale)
}

/** A colour per holiday: the terminal's ▣ for its outfits, the gallery's calendar. */
export const HOLIDAY_COLOR: Record<string, string> = {
  newyear: '#C9A227', lunarnewyear: '#D0312D', valentine: '#E0558A', stpatrick: '#2E8B4A', easter: '#9C7FD1',
  july4: '#2F5DA8', muertos: '#E8761E', halloween: '#7F4FB8', diwali: '#E09A1A', thanksgiving: '#A0522D',
  hanukkah: '#3B7DD8', christmas: '#2E7D4F',
}

export const costumeColor = (costume: string): string =>
  COSTUME_COLOR[costume] ?? HOLIDAY_COLOR[OUTFITS.get(costume)?.holiday.id ?? ''] ?? '#888780'

/** What a costume is called in words: `detective`, `witch`, `jack-o'-lantern`. */
export const wears = (costume: string): string => WEARS[costume] ?? OUTFITS.get(costume)?.outfit.name.toLowerCase() ?? 'plain'

/** A `faces` rule's costume: crab.ts's names, or a holiday outfit's id. */
export const dressKey = (name: string): string | undefined => {
  const n = name.trim().toLowerCase()
  return costumeKey(n) ?? (OUTFITS.has(n) ? n : undefined)
}

/** What's on: the holidays whose outfits sessions wear now, and the year that seeds who wears what. */
export type Season = { holidays: Holiday[]; year: number }

/**
 * The season on `at` (ms) for the `holidays` option (`auto`, `off` or a
 * holiday id) less `skip`ped holidays. A forced holiday ignores `skip`. The
 * year is the one its window started in, so New Year's Eve keeps its outfits
 * across midnight on Dec 31.
 */
export function seasonAt(at: number, option = 'auto', skip: readonly string[] = []): Season {
  const date = new Date(at)
  const forced = HOLIDAYS.some(h => h.id === option.trim().toLowerCase())
  const holidays = activeHolidays(date, option).filter(h => forced || !skip.includes(h.id))
  const n = dayNumber(date)
  const first = holidays[0]
  const year = first
    ? [date.getFullYear(), date.getFullYear() - 1].find(y => {
        const [from, to] = first.window(y)
        return dayNumber(from) <= n && n <= dayNumber(to)
      }) ?? date.getFullYear()
    : date.getFullYear()
  return { holidays, year }
}
