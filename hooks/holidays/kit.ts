// What every holiday outfit is drawn with: the crab's own body, eyes and
// stamp from crab.ts, a shared palette, and motion classes for the props.
// Not used at runtime yet: the preview (preview/holidays.html) draws from it.

import { CLAY, INK, crabBody, eyes, stamp } from '../crab'
import type { Fill, Pose } from '../crab'

export { CLAY, INK, crabBody, eyes, stamp }
export type { Fill, Pose }

/** One costume: `draw` paints it on the 30×28 grid, as crab.ts's costumes do. */
export type Outfit = {
  /** Unique across every holiday; what a `faces` rule would name. */
  id: string
  name: string
  /** One line on what it wears and what moves while it works. */
  note: string
  draw: (f: Fill, pose: Pose) => void
  /** The whole crab floats while working instead of walking (ghosts, angels). */
  float?: boolean
  /** Extra CSS, scoped by the outfit's own class `.c-h-<id>`. */
  css?: string
}

/** Month (1-12) and day. */
export type MonthDay = [number, number]

export type Holiday = {
  id: string
  name: string
  /** When it switches on, as people would say it. */
  when: string
  /** The days it's on in `year`: [first, last], inclusive, local dates. */
  window: (year: number) => [Date, Date]
  outfits: Outfit[]
}

// Shared colours. Dark props carry a lighter rim (`rim`) on their outer edge so
// they still read on the dark app background; light props a soft shade.
export const C = {
  white: '#F4F3EE',
  shade: '#D2D1C8',
  black: '#26232B',
  rim: '#4A4656',
  gold: '#F5C542',
  goldD: '#C99A1E',
  red: '#D0312D',
  redD: '#8E1B20',
  green: '#2E8B4A',
  greenD: '#1F6334',
  brown: '#7A4A26',
  brownD: '#5A3519',
  orange: '#E8761E',
  orangeD: '#C2570F',
  purple: '#7F4FB8',
  pink: '#E79AB0',
  blue: '#2F5DA8',
  sky: '#8EC5F0',
  gray: '#8E929A',
  silver: '#C9CCD2',
  flame: '#FFD54A',
} as const

/**
 * Motion for props while working, on top of crab.ts's walk. Put a prop in a
 * group named for one of these and it moves; a second word (`sw a`) keeps two
 * props apart. Periods divide one second, as crab.ts's do, so the
 * once-a-second redraw restarts them in phase.
 */
export const KIT_CSS = `<style>
.hol.run.fl{animation:float 1s ease-in-out infinite}
.hol.run.fl .la,.hol.run.fl .lb,.hol.run.fl .bd{animation:none}
.hol.run .sw{transform-origin:50% 100%;animation:hsw .5s ease-in-out infinite}
.hol.run .swt{transform-origin:50% 0;animation:hsw .5s ease-in-out infinite}
@keyframes hsw{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
.hol.run .bl{animation:blink .5s steps(1) infinite}
.hol.run .bl2{animation:blink .5s steps(1) infinite -.25s}
.hol.run .fk{animation:hfk 1s steps(1) infinite}
@keyframes hfk{20%{opacity:.55}40%{opacity:1}70%{opacity:.75}90%{opacity:1}}
.hol.run .up{animation:hup 1s ease-in-out infinite}
.hol.run .up2{animation:hup 1s ease-in-out infinite -.5s}
@keyframes hup{50%{transform:translateY(-2px)}}
.hol.run .sh{animation:hsh .25s steps(1) infinite}
@keyframes hsh{50%{transform:translateX(1px)}}
.hol.run .wv{transform-origin:0 50%;animation:wave .25s steps(1) infinite}
.hol.run .sp{transform-origin:50% 50%;animation:hsp 1s linear infinite}
@keyframes hsp{to{transform:rotate(360deg)}}
.hol.run .pf{transform-origin:50% 50%;animation:hpf .5s ease-in-out infinite}
@keyframes hpf{50%{transform:scale(1.25)}}
.hol.run .fp{transform-origin:50% 100%;animation:hfp .25s steps(1) infinite}
@keyframes hfp{50%{transform:scaleY(.6)}}
.hol.run .fx{animation:hfx 1s linear infinite}
.hol.run .fx2{animation:hfx 1s linear infinite -.5s}
@keyframes hfx{0%{transform:translateY(-3px);opacity:0}30%{opacity:1}100%{transform:translateY(5px);opacity:0}}
.hol.run .rs{animation:hrs 1s ease-out infinite}
.hol.run .rs2{animation:hrs 1s ease-out infinite -.5s}
@keyframes hrs{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-6px);opacity:0}}
.hol.run .tl{transform-origin:0 50%;animation:tilt 1s ease-in-out infinite}
</style>`

/** A date in local time. */
export const day = (year: number, month: number, d: number): Date => new Date(year, month - 1, d)

export const addDays = (date: Date, n: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)

/** A fixed window, e.g. Oct 15–31; one that wraps the new year (Dec 29–Jan 2) ends next year. */
export const fixed = (from: MonthDay, to: MonthDay) => (year: number): [Date, Date] => {
  const start = day(year, from[0], from[1])
  const end = day(to[0] < from[0] ? year + 1 : year, to[0], to[1])
  return [start, end]
}

/** A window around a day looked up per year (moving holidays); `before`/`after` in days. */
export const around = (dates: Record<number, MonthDay>, before: number, after: number) => (year: number): [Date, Date] => {
  const md = dates[year]
  // A year past the table: an empty window, never on.
  if (!md) return [day(year, 1, 2), day(year, 1, 1)]
  const d = day(year, md[0], md[1])
  return [addDays(d, -before), addDays(d, after)]
}
