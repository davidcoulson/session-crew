// Diwali, the five days of the festival around the main day (Lakshmi Puja).

import { C, around, crabBody, eyes, stamp } from './kit'
import type { Fill, Holiday, MonthDay } from './kit'

// The main day of Diwali (Lakshmi Puja). Dates from published calendars; verify
// before relying on them, and extend the table past 2035.
const LAKSHMI_PUJA: Record<number, MonthDay> = {
  2026: [11, 8],
  2027: [10, 29],
  2028: [10, 17],
  2029: [11, 5],
  2030: [10, 26],
  2031: [11, 14],
  2032: [11, 2],
  2033: [10, 22],
  2034: [11, 10],
  2035: [10, 30],
}

const SAFFRON = '#F29A1D'
const SAFFRON_D = '#C9700E'
const MAGENTA = '#D6267A'
const MAGENTA_D = '#9E1A5A'
const TEAL = '#1F9E9A'
const MARIGOLD = '#F08A1C'
const MARIGOLD_L = '#F7C531'
const CLAY_POT = '#B5532A'
const CLAY_POT_D = '#7E3417'
const SPARK = '#FFF3B0'

/** A small flame, 3 wide and 4 tall, in its own group so it flickers. */
const flame = (f: Fill, x: number, y: number, cls = 'fk'): void =>
  stamp(f, x, y, ['.y.', 'yYy', 'yOy', '.o.'], { y: C.flame, Y: SPARK, O: C.orange, o: C.orangeD }, cls)

export const DIWALI: Holiday = {
  id: 'diwali',
  name: 'Diwali',
  when: 'the five days of the festival',
  window: around(LAKSHMI_PUJA, 2, 2),
  outfits: [
    {
      id: 'diwali-diya',
      name: 'Diya',
      note: 'holds up a painted clay oil lamp; the flame flickers',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 21, 6, [
          '.......dd',
          'dddddddd.',
          '.cgcgcgc.',
          '..ccccc..',
        ], { d: CLAY_POT_D, c: CLAY_POT, g: C.gold })
        f(22, 6, 6, 1, '#E8A23A')
        flame(f, 26, 2)
      },
    },
    {
      id: 'diwali-rangoli',
      name: 'Rangoli',
      note: 'a rangoli flower in coloured powder across its front; the centre glows',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 10, 13, [
          '....mm....',
          '.y..mm..y.',
          '..yywwyy..',
          '.mywttwym.',
          'mmwt..twmm',
          '.mywttwym.',
          '..yywwyy..',
          '.y..mm..y.',
          '....mm....',
        ], { m: MAGENTA, y: SAFFRON, w: C.white, t: TEAL })
        f(14, 17, 2, 1, C.gold, 'pf')
        eyes(f, pose)
        for (const [x, y, c] of [[8, 19, TEAL], [21, 19, MAGENTA], [8, 15, MAGENTA], [21, 15, TEAL]] as const) f(x, y, 1, 1, c)
      },
    },
    {
      id: 'diwali-sparkler',
      name: 'Sparkler',
      note: 'a phuljhadi held up high; the sparks crackle',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        f(25, 5, 1, 5, C.gray)
        stamp(f, 24, 3, ['.w.', 'wyw', '.w.'], { w: SPARK, y: C.flame })
        stamp(f, 20, 0, ['y....w...', '...y...y.', '.w......w', '.........', 'w.......y', '...y.....', '.y.....w.'], { y: C.flame, w: C.orange }, 'bl')
        stamp(f, 20, 0, ['...w...y.', 'y.......w', '...w.y...', 'y.......y', '.........', 'y......y.', '...w.....'], { y: C.goldD, w: C.flame }, 'bl2')
      },
    },
    {
      id: 'diwali-kandil',
      name: 'Star lantern',
      note: 'an akash kandil star lantern with tassels hangs beside it; the lantern sways',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 20, 0, [
          '....g....',
          '....g....',
          '....M....',
          '...MmM...',
          'MMMmymMMM',
          '.Mmyyymm.',
          '..mmymm..',
          '..mM.Mm..',
          '.mM...Mm.',
          '.g.....g.',
          '.s.....s.',
        ], { g: C.gold, M: MAGENTA_D, m: MAGENTA, y: C.flame, s: SAFFRON }, 'swt')
      },
    },
    {
      id: 'diwali-garland',
      name: 'Marigold garland',
      note: 'a marigold garland draped across it and a strand held out; the strand swings',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        const beads: [number, number][] = [[7, 14], [9, 16], [11, 18], [13, 19], [15, 19], [17, 18], [19, 16], [21, 14]]
        beads.forEach(([x, y], i) => {
          f(x, y, 2, 2, i % 2 ? MARIGOLD_L : MARIGOLD)
          f(x + (i % 2), y + 1, 1, 1, i % 2 ? MARIGOLD : SAFFRON_D)
        })
        stamp(f, 13, 21, ['g..g', '.gg.'], { g: C.green })
        for (let i = 0; i < 4; i++) {
          f(24, 14 + i * 2, 2, 2, i % 2 ? MARIGOLD_L : MARIGOLD, 'swt')
          f(24 + (i % 2), 15 + i * 2, 1, 1, i % 2 ? MARIGOLD : SAFFRON_D, 'swt')
        }
        stamp(f, 24, 22, ['gg', '.g'], { g: C.green }, 'swt')
      },
    },
    {
      id: 'diwali-mithai',
      name: 'Sweets box',
      note: 'an open gift box of laddoos with gold trim; one laddoo bobs',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        const laddoo = { o: '#F3A93B', h: '#FFE3A0', O: '#C97A1E' }
        stamp(f, 22, 0, ['gggggggg', 'gMMMMMMg', 'gMMMMMMg', 'gMMMMMMg'], { g: C.gold, M: MAGENTA_D })
        stamp(f, 22, 4, ['ho.', 'oO.'], laddoo)
        stamp(f, 27, 4, ['ho', 'oO'], laddoo)
        stamp(f, 21, 6, [
          'ggggggggg',
          'mmmmmmmmm',
          'mgmgmgmgm',
          'ggggggggg',
        ], { g: C.gold, m: MAGENTA })
        stamp(f, 24, 4, ['.ho', '.oO'], laddoo, 'up')
      },
    },
    {
      id: 'diwali-anaar',
      name: 'Anaar',
      note: 'a flower-pot firework fountains beside it; the sparks shoot up',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 24, 19, [
          '..kk..',
          '..rr..',
          '.rggr.',
          '.rrrr.',
          'rrggrr',
          'RRRRRR',
          'RRRRRR',
        ], { k: '#4A3426', r: C.red, R: C.redD, g: C.gold })
        stamp(f, 22, 10, ['o......y', '..y..w..', '.w....o.', '...y.y..', '..o..w..', '...w.y..', '....y...', '...y.o..', '....w...'], { y: C.flame, w: SPARK, o: C.orange }, 'rs')
        stamp(f, 22, 10, ['...y.o..', 'y......w', '..o...y.', '.y....w.', '...y.o..', '..y.....', '...o.w..', '....y...', '...w....'], { y: C.gold, w: SPARK, o: C.orange }, 'rs2')
      },
    },
    {
      id: 'diwali-kurta',
      name: 'Festive kurta',
      note: 'a magenta kurta with gold embroidery and a saffron sash; the embroidery glints',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 7, 14, [
          'gggggggggggSsggg',
          'mmmmmmmmmmSsmmmm',
          'mmmmmmmmmSsmmmmm',
          'mmmmmmmmSsmmmmmm',
          'mmmmmmmSsmmmmmmm',
          'mmmmmmSsmmmmmmmm',
          'mmmmmSsmmmmmmmmm',
          'ggggSsgggggggggg',
        ], { m: MAGENTA, g: C.gold, s: SAFFRON, S: SAFFRON_D })
        for (const [x, y] of [[9, 17], [11, 19], [19, 17], [20, 19], [18, 20]] as const) f(x, y, 1, 1, C.gold, 'bl')
        for (const [x, y] of [[10, 18], [12, 17], [18, 18], [21, 18]] as const) f(x, y, 1, 1, C.gold, 'bl2')
        eyes(f, pose)
      },
    },
    {
      id: 'diwali-lotus',
      name: 'Lotus',
      note: 'holds up a pink lotus in bloom; the flower sways',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sw')
        stamp(f, 21, 1, [
          '....p....',
          '...pPp...',
          '.p.pPp.p.',
          '.pPpPpPp.',
          'ppPpypPpp',
          '.ppppppp.',
          '..ggggg..',
          '....s....',
          '....s....',
        ], { p: '#F28AB2', P: '#D6487E', y: C.gold, g: C.green, s: C.greenD }, 'sw')
      },
    },
    {
      id: 'diwali-petals',
      name: 'Petal shower',
      note: 'tips a brass thali of flower petals over itself; the petals fall',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'tl')
        stamp(f, 20, 7, ['.rmoymr.o', 'ggggggggg', '.GGGGGGG.'], { r: C.red, m: MAGENTA, o: MARIGOLD, y: MARIGOLD_L, g: C.gold, G: C.goldD }, 'tl')
        stamp(f, 9, 2, ['m.......o..', '...y.......', '......r....', 'o.........m', '....m......'], { r: C.red, m: MAGENTA, o: MARIGOLD, y: MARIGOLD_L }, 'fx')
        stamp(f, 9, 4, ['....o......', 'r.......y..', '.....m.....', '..y......r.'], { r: C.red, m: MAGENTA, o: MARIGOLD, y: MARIGOLD_L }, 'fx2')
      },
    },
  ],
}
