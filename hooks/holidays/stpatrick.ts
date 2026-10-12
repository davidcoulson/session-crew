// St Patrick's Day, Mar 14–17.

import { C, INK, crabBody, eyes, fixed, stamp } from './kit'
import type { Holiday } from './kit'

const G = '#2E9E4F'
const GD = '#1F6E37'
const GL = '#6FD083'
const GINGER = '#B5441A'
const GINGER_L = '#E58A3E'

// A three-leaf shamrock, 9×5: heart-shaped leaves pointing in to the middle.
const SHAMROCK = ['..gg.gg..', '..ggggg..', 'gg.ggg.gg', '.gggGggg.', 'gg.ggg.gg']

export const ST_PATRICK: Holiday = {
  id: 'stpatrick',
  name: "St Patrick's Day",
  when: 'Mar 14–17',
  window: fixed([3, 14], [3, 17]),
  outfits: [
    {
      id: 'leprechaun',
      name: 'Leprechaun',
      note: 'green top hat with a gold buckle and a ginger beard; flips a gold coin',
      css: '.c-h-leprechaun.run .cn{animation:flip 1s ease-in-out infinite}',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 7, 13, [
          'bb............bb',
          'bh............hb',
          'bbb..........bbb',
          'bhbb........bbhb',
          'bbbbbhbbbbhbbbbb',
          '.bhbbbbbbbbbbhb.',
          '..bbbhbbbbhbbb..',
          '...bbbbbbbbbb...',
          '.....bbhbbb.....',
        ], { b: GINGER, h: GINGER_L })
        f(13, 16, 4, 1, INK)
        stamp(f, 7, 1, [
          '...llllllllll...',
          '...lggggggggg...',
          '...lggggggggg...',
          '...lggggggggg...',
          '...kkkyyyykkk...',
          '...kkkykkykkk...',
          '...kkkyyyykkk...',
          'lllgggggggggglll',
          'gggggggggggggggg',
        ], { g: G, l: GL, k: C.black, y: C.gold })
        const cy = pose.isCheering ? 7 : 11
        f(24, cy, 3, 2, C.gold, 'cn'); f(24, cy + 1, 3, 1, C.goldD, 'cn'); f(24, cy, 1, 1, '#FFF3B8', 'cn')
      },
    },
    {
      id: 'shamrock',
      name: 'Shamrock boppers',
      note: 'a headband with two shamrocks on springs; the shamrocks wobble',
      draw: (f, pose) => {
        crabBody(f, pose)
        f(7, 9, 16, 1, G)
        for (const [x, c] of [[6, 'sw a'], [16, 'sw b']] as const) {
          stamp(f, x, 0, SHAMROCK, { g: G, G: GD }, c)
          f(x + 2, 0, 2, 1, GL, c); f(x + 5, 0, 2, 1, GL, c); f(x, 2, 2, 1, GL, c); f(x + 7, 2, 2, 1, GL, c)
          stamp(f, x + 3, 5, ['.s', 's.', '.s', 's.'], { s: C.gray }, c)
        }
      },
    },
    {
      id: 'irishdancer',
      name: 'Irish dancer',
      note: 'ginger ringlets with a gold band and an embroidered green dress; the curls bounce',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 6, 16, [
          '.yyyyyyyyyyyyyyyy.',
          '.gggyggggggggyggg.',
          '.ggyYyggggggyYygg.',
          '.gggyggggggggyggg.',
          'gggggggggggggggggg',
          'yygyygyygyygyygyyy',
        ], { g: G, y: C.gold, Y: '#FFF3B8' })
        stamp(f, 7, 5, [
          '....hhhhhhhh....',
          '..hhHhhHhhHhhh..',
          '.hHhhhhhhhhhhHh.',
          'hhyyyyyyyyyyyyhh',
          'hhhhhhhhhhhhhhhh',
        ], { h: GINGER, H: GINGER_L, y: C.gold })
        for (const x of [6, 22]) stamp(f, x, 10, ['hH', 'Hh', 'hH', 'Hh', 'hH', 'Hh', '.h'], { h: GINGER, H: GINGER_L }, 'up')
      },
    },
    {
      id: 'cloverglasses',
      name: 'Clover specs',
      note: 'four-leaf-clover glasses; the lenses glint',
      draw: (f, pose) => {
        crabBody(f, pose)
        const lens = ['.gg..gg.', 'gLgggLgg', 'gggggggg', '.gggggg.', '.gggggg.', 'gggggggg', 'gggggggg', '.gg..gg.']
        stamp(f, 6, 9, lens, { g: '#4DBA62', L: GL })
        stamp(f, 16, 9, lens, { g: '#4DBA62', L: GL })
        f(14, 12, 2, 1, GD); f(5, 12, 1, 1, GD); f(24, 12, 1, 1, GD)
        eyes(f, pose)
        f(7, 10, 1, 1, '#FFFFFF', 'bl'); f(17, 10, 1, 1, '#FFFFFF', 'bl2')
      },
    },
  ],
}
