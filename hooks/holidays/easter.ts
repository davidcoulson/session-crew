// Easter, from the Sunday before through Easter Monday.

import { C, INK, addDays, crabBody, day, eyes, stamp } from './kit'
import type { Fill, Holiday } from './kit'

/** Easter Sunday in `year` (Gregorian), by the anonymous Meeus/Jones/Butcher algorithm. */
export const easterSunday = (year: number): Date => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const g = Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const n = h + l - 7 * m + 114
  return day(year, Math.floor(n / 31), (n % 31) + 1)
}

const PINK = '#F2A7C3'
const PINK_D = '#E07A9C'
const BLUE = '#9CC8F2'
const YELLOW = '#F7DD6B'
const MINT = '#9EDDB0'
const LILAC = '#C9B3EE'
const EDGE = '#BDBAB0'
const CHOC = '#8A5530'
const CHOC_L = '#B9824F'

const legs = (f: Fill, color: string, y = 22, h = 4): void => {
  for (const [x, c] of [[7, 'la'], [17, 'la'], [11, 'lb'], [21, 'lb']] as const) f(x, y, 2, h, color, c)
}

export const EASTER: Holiday = {
  id: 'easter',
  name: 'Easter',
  when: 'the week before through Easter Monday',
  window: (year: number): [Date, Date] => {
    const sunday = easterSunday(year)
    return [addDays(sunday, -7), addDays(sunday, 1)]
  },
  outfits: [
    {
      id: 'bunnyears',
      name: 'Bunny ears',
      note: 'tall bunny ears, a pink nose, whiskers and buck teeth; the ears twitch',
      draw: (f, pose) => {
        crabBody(f, pose)
        const ear = ['.ggg.', 'gwwwg', 'gwpwg', 'gwpwg', 'gwpwg', 'gwpwg', 'gwpwg', 'gwpwg', 'gwwwg', '.www.']
        stamp(f, 8, 0, ear, { g: EDGE, w: C.white, p: PINK }, 'sw a')
        stamp(f, 17, 0, ear, { g: EDGE, w: C.white, p: PINK }, 'sw b')
        f(14, 14, 2, 1, PINK_D); f(13, 15, 4, 1, INK); f(14, 16, 2, 2, '#FFFFFF'); f(14, 17, 2, 1, C.shade)
        f(8, 15, 3, 1, '#F6E2D2'); f(19, 15, 3, 1, '#F6E2D2'); f(8, 17, 3, 1, '#F6E2D2'); f(19, 17, 3, 1, '#F6E2D2')
      },
    },
    {
      id: 'chick',
      name: 'Hatching chick',
      note: 'a fluffy yellow chick half out of its egg; the shell lid bobs',
      draw: (f, pose) => {
        crabBody(f, pose, 0, undefined, '#F2BE2C')
        legs(f, C.orange)
        for (let x = 6; x < 24; x++) {
          const top = 16 + ([0, 1, 2, 1][x % 4] ?? 0)
          f(x, top, 1, 22 - top, x === 6 || x === 23 ? EDGE : C.white)
          f(x, top, 1, 1, EDGE)
        }
        f(7, 21, 16, 1, EDGE)
        f(14, 14, 2, 2, C.orange); f(14, 15, 2, 1, C.orangeD)
        stamp(f, 9, 4, [
          '....gggg....',
          '..ggwwwwgg..',
          '.gwwwwwwwwg.',
          'gwwwwwwwwwwg',
          'g.gwg.gwg.gg',
        ], { g: EDGE, w: C.white }, 'up')
      },
    },
    {
      id: 'eggbasket',
      name: 'Egg basket',
      note: 'a wicker basket full of painted eggs; the basket swings',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 22, 11, [
          '..hhhh..',
          '.h....h.',
          '.h....h.',
          '.pp.yyb.',
          'ppPyYybb',
          'wwwwwwww',
          'wWwWwWwW',
          'WwWwWwWw',
          '.wWwWwW.',
        ], { h: '#9A6A30', w: '#C8924A', W: '#9A6A30', p: PINK, P: PINK_D, y: YELLOW, Y: '#E0B93A', b: BLUE }, 'swt')
      },
    },
    {
      id: 'paintedegg',
      name: 'Painted egg',
      note: 'tucked inside a decorated Easter egg, claws and legs poking out; it sparkles',
      draw: (f, pose) => {
        crabBody(f, pose)
        const inside = (x: number, y: number) => {
          const dy = (y + 0.5 - 14) / 10
          const rx = 9 * (dy < 0 ? 1 + 0.28 * dy : 1)
          return Math.abs(dy) <= 1 && Math.abs(x + 0.5 - 15) <= rx * Math.sqrt(1 - dy * dy)
        }
        for (let y = 3; y < 25; y++) for (let x = 4; x < 26; x++) {
          if (!inside(x, y)) continue
          const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
          let c = y < 8 ? YELLOW : y < 10 ? LILAC : y < 17 ? LILAC : y < 19 ? MINT : BLUE
          if ((y === 8 && x % 4 === 0) || (y === 9 && x % 2 === 1)) c = PINK_D
          if (y === 8 && x % 4 !== 0) c = YELLOW
          if ((y === 17 && x % 2 === 0) || (y === 18 && x % 4 === 1)) c = '#4FB06A'
          if (y < 8 && (x + y) % 5 === 0 && y > 4) c = PINK
          if (y > 19 && (x + y) % 4 === 0) c = C.white
          f(x, y, 1, 1, edge ? '#7E6FA6' : c)
        }
        eyes(f, pose)
        f(14, 15, 2, 1, INK)
        f(26, 4, 1, 3, '#FFF3B8', 'bl'); f(25, 5, 3, 1, '#FFF3B8', 'bl'); f(23, 1, 1, 1, '#FFF3B8', 'bl2'); f(27, 9, 1, 1, '#FFF3B8', 'bl2')
      },
    },
    {
      id: 'bonnet',
      name: 'Easter bonnet',
      note: 'a wide straw bonnet with a pink ribbon and spring flowers; the ribbon tails flutter',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 21, 9, ['pp.', '.pp', 'pp.', 'p..'], { p: PINK_D }, 'swt')
        stamp(f, 4, 3, [
          '.......SSSSSSSS.......',
          '......ssTsssTsss......',
          '.....sssssssssss......',
          '.....sTsssTsssTss.....',
          '.....ppppppppppppp....',
          '.SssssTsssssTssssssS..',
          'SSSSSSSSSSSSSSSSSSSSS.',
        ].map(r => r.padEnd(22, '.')), { s: '#E3BC6A', S: '#B98E3E', T: '#CFA552', p: PINK_D })
        stamp(f, 9, 3, ['.k.', 'kyk', '.k.'], { k: PINK, y: C.gold })
        stamp(f, 13, 2, ['.l.', 'lyl', '.l.'], { l: LILAC, y: C.gold })
        stamp(f, 17, 3, ['.w.', 'wyw', '.w.'], { w: C.white, y: C.gold })
        f(12, 4, 1, 1, '#4FB06A'); f(16, 4, 1, 1, '#4FB06A')
      },
    },
    {
      id: 'carrot',
      name: 'Carrot muncher',
      note: 'a big bitten carrot and buck teeth; the carrot tops sway',
      draw: (f, pose) => {
        stamp(f, 24, 4, [
          'oooOo',
          'oOooi',
          'oooi.',
          'Oooi.',
          'oOooi',
          '.ooOo',
          '.oOo.',
          '.ooo.',
          '..oO.',
          '..oo.',
          '..o..',
          '..o..',
        ], { o: '#F58A1F', O: '#C2600F', i: '#FFD39A' })
        crabBody(f, pose)
        stamp(f, 24, 0, ['l.l.l', '.lLl.', 'lLlL.', '.lll.'], { l: '#4FB06A', L: '#2E8B4A' }, 'sw')
        f(13, 15, 4, 1, INK); f(14, 16, 2, 2, '#FFFFFF'); f(14, 17, 2, 1, C.shade)
      },
    },
    {
      id: 'lamb',
      name: 'Lamb',
      note: 'a fluffy wool hood and fleece with floppy ears and a bell; the bell swings',
      draw: (f, pose) => {
        crabBody(f, pose)
        legs(f, '#5E565A', 23, 3)
        const puffs: [number, number, number][] = [
          [8.5, 8.5, 2.6], [11.5, 7.2, 2.6], [15, 6.8, 2.6], [18.5, 7.2, 2.6], [21.5, 8.5, 2.6],
          [7.6, 11.5, 2.2], [22.4, 11.5, 2.2], [7.6, 14.5, 2.2], [22.4, 14.5, 2.2],
          [8.5, 20, 2.4], [11.8, 20.6, 2.4], [15, 20.8, 2.4], [18.2, 20.6, 2.4], [21.5, 20, 2.4],
        ]
        const wool = (x: number, y: number) =>
          (x >= 7 && x <= 22 && y >= 17 && y <= 21) ||
          (!(x >= 9 && x <= 20 && y >= 10 && y <= 16) && puffs.some(([cx, cy, r]) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r))
        for (let y = 3; y < 24; y++) for (let x = 4; x < 26; x++) {
          if (!wool(x, y)) continue
          const edge = !wool(x - 1, y) || !wool(x + 1, y) || !wool(x, y - 1) || !wool(x, y + 1)
          f(x, y, 1, 1, edge ? '#BDB9AE' : C.white)
        }
        stamp(f, 3, 9, ['eee.', '.eee'], { e: '#9A8E93' })
        stamp(f, 23, 9, ['.eee', 'eee.'], { e: '#9A8E93' })
        f(9, 16, 12, 1, C.blue)
        f(14, 15, 2, 1, PINK_D)
        stamp(f, 13, 17, ['.gg.', 'gGgg', 'gggg', '.k..'], { g: C.gold, G: '#FFF3B8', k: C.goldD }, 'swt')
      },
    },
    {
      id: 'egghunt',
      name: 'Egg hunter',
      note: 'a safari hat and a magnifier over a hidden egg; the magnifier searches',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sh')
        stamp(f, 25, 21, ['.pp.', 'pppp', 'yYyY', 'pppp', '.pp.'], { p: PINK, y: YELLOW, Y: '#E0B93A' })
        stamp(f, 6, 4, [
          '.....kkkkkkkk.....',
          '....hhhhhhhhhh....',
          '....hhhhhhhhhh....',
          '....bbbbbbbbbb....',
          'hhhhhhhhhhhhhhhhhh',
          '.kkkkkkkkkkkkkkkk.',
        ], { h: '#CDB57E', k: '#9C8350', b: '#6B4A2E' })
        f(26, 14, 1, 2, '#6B4A2E', 'sh')
        stamp(f, 24, 16, ['.kkk.', 'kgggk', 'kgggk', 'kgggk', '.kkk.'], { k: C.goldD, g: 'rgba(169,214,245,.55)' }, 'sh')
        f(25, 17, 1, 1, '#FFFFFF', 'sh')
      },
    },
    {
      id: 'chocbunny',
      name: 'Chocolate bunny',
      note: 'a chocolate bunny with a bitten ear, icing eyes and gold foil; the foil glints',
      draw: (f, pose) => {
        crabBody(f, pose, 0, undefined, CHOC)
        stamp(f, 9, 4, ['l..l', 'lkkl', 'kiik', 'kiik', 'kiik', 'kkkk'], { k: CHOC, l: CHOC_L, i: '#A8703F' })
        stamp(f, 17, 1, ['.ll.', 'lkkl', 'kiik', 'kiik', 'kiik', 'kiik', 'kiik', 'kiik', 'kkkk'], { k: CHOC, l: CHOC_L, i: '#A8703F' })
        f(7, 10, 16, 1, CHOC_L)
        for (const x of [8, 18]) { f(x, 11, 4, 4, '#F4EAD8'); f(x, 11, 1, 1, CHOC); f(x + 3, 11, 1, 1, CHOC); f(x, 14, 1, 1, CHOC); f(x + 3, 14, 1, 1, CHOC) }
        eyes(f, pose)
        f(14, 15, 2, 1, PINK_D)
        stamp(f, 7, 18, [
          'y.yy.yy.yy.yy.yy',
          'yYyyyYyyyYyyyYyy',
          'YyyYyyyYyyyYyyyY',
          'yyyyyyyyyyyyyyyy',
        ], { y: C.gold, Y: C.goldD })
        stamp(f, 12, 16, ['rr..rr', 'rrRRrr', 'rr..rr'], { r: C.red, R: C.redD })
        f(9, 19, 1, 1, '#FFF8D8', 'bl'); f(19, 20, 1, 1, '#FFF8D8', 'bl2'); f(14, 21, 1, 1, '#FFF8D8', 'bl')
      },
    },
    {
      id: 'tulips',
      name: 'Tulip crown',
      note: 'a headband of red, yellow and pink tulips; the tulips sway',
      draw: (f, pose) => {
        crabBody(f, pose)
        f(7, 9, 16, 1, '#2E8B4A')
        const tulip = (x: number, y: number, c: string, d: string, cls: string) => {
          stamp(f, x, y, ['c.c.c', 'cdcdc', 'ccccc', '.ccc.'], { c, d }, cls)
          f(x + 2, y + 4, 1, 9 - y - 4, '#2E8B4A', cls)
        }
        tulip(7, 3, C.red, '#F26D6A', 'sw a')
        tulip(13, 1, YELLOW, C.gold, 'sw b')
        tulip(19, 3, '#E77FA6', PINK, 'sw c')
        f(8, 7, 1, 1, '#4FB06A', 'sw a'); f(16, 6, 1, 1, '#4FB06A', 'sw b'); f(22, 7, 1, 1, '#4FB06A', 'sw c')
      },
    },
  ],
}
