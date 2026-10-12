// Día de los Muertos, Oct 28 – Nov 2: festive and colourful, not spooky.

import { C, CLAY, crabBody, eyes, fixed, stamp } from './kit'
import type { Fill, Holiday } from './kit'

const MAGENTA = '#E0338A'
const TEAL = '#1FA6A0'
const MARIGOLD = '#F08A1C'
const MARIGOLD_L = '#F7B731'
const MARIGOLD_D = '#C25E0E'
const PURPLE = '#7F4FB8'
const FACE = '#F4F1EA'

/** A cempasúchil (marigold) flower, 4×4, ruffled. */
const marigold = (f: Fill, x: number, y: number, cls?: string): void =>
  stamp(f, x, y, ['.yo.', 'yoOo', 'oOoy', '.oy.'], { o: MARIGOLD, y: MARIGOLD_L, O: MARIGOLD_D }, cls)

/** A small flame, 3 wide and 4 tall, that flickers. */
const flame = (f: Fill, x: number, y: number): void =>
  stamp(f, x, y, ['.y.', 'yWy', 'yOy', '.o.'], { y: C.flame, W: '#FFF3B0', O: C.orange, o: C.orangeD }, 'fk')

export const MUERTOS: Holiday = {
  id: 'muertos',
  name: 'Día de los Muertos',
  when: 'Oct 28 – Nov 2',
  window: fixed([10, 28], [11, 2]),
  outfits: [
    {
      id: 'muertos-calavera',
      name: 'Calavera paint',
      note: 'sugar-skull face paint with flower eyes and a stitched smile; the marigold sways',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 8, 10, [
          '.wwwwwwwwwwww.',
          'mmmmwwoowwtttt',
          'mwwmwoyowwtwwt',
          'mwwmwwoowwtwwt',
          'mmmmwwwwwwtttt',
          'wwwwwwkkwwwwww',
          'wpwwwwkwwwwwpw',
          'wwwkwkwkwkwkww',
          'wwkkkkkkkkkkkw',
          'wwwkwkwkwkwkww',
          '.wwwwwwwwwwww.',
        ], { w: FACE, m: MAGENTA, t: TEAL, o: MARIGOLD, y: MARIGOLD_L, k: C.black, p: '#E79AB0' })
        eyes(f, pose)
        marigold(f, 19, 6, 'sw')
        f(18, 9, 2, 1, C.green, 'sw')
      },
    },
    {
      id: 'muertos-marigolds',
      name: 'Marigold crown',
      note: 'a crown of cempasúchil flowers and leaves; petals drift down',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 7, 9, ['g.gg.gg..gg.gg.g'], { g: C.green })
        marigold(f, 7, 6); marigold(f, 11, 5); marigold(f, 15, 5); marigold(f, 19, 6)
        f(1, 12, 1, 1, MARIGOLD, 'fx'); f(26, 6, 1, 1, MARIGOLD_L, 'fx2')
        f(27, 19, 1, 1, MARIGOLD, 'fx'); f(2, 20, 1, 1, MARIGOLD_L, 'fx2'); f(24, 2, 1, 1, MARIGOLD, 'fx')
      },
    },
    {
      id: 'muertos-papel',
      name: 'Papel picado',
      note: 'a string of cut-paper flags on a pole; the flags flutter',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        f(26, 1, 1, 14, C.brown)
        f(8, 2, 18, 1, C.gray)
        const flag = ['fff', 'f.f', 'fff', 'fff', 'f.f']
        const colours = [MAGENTA, MARIGOLD, TEAL, C.gold]
        colours.forEach((c, i) => stamp(f, 9 + i * 4, 3, flag, { f: c }, `swt ${'abcd'[i]}`))
      },
    },
    {
      id: 'muertos-pan',
      name: 'Pan de muerto',
      note: 'holds up a round sweet bread with bone shapes on top; the sugar sparkles',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 21, 3, [
          '...BBB...',
          '..oBbBo..',
          '.oBoooBo.',
          'oBoooooBo',
          'oooBoBooo',
          'ooooooooo',
          '.OOOOOOO.',
        ], { o: '#D08A3C', b: '#E0A65A', B: '#9C5A24', O: '#8A4E1E' })
        for (const [x, y, c] of [[23, 5, 'bl'], [26, 6, 'bl2'], [24, 8, 'bl2'], [27, 8, 'bl'], [22, 7, 'bl2'], [25, 3, 'bl']] as const) f(x, y, 1, 1, '#FFF7E6', c)
      },
    },
    {
      id: 'muertos-velas',
      name: 'Candles',
      note: 'a glass veladora held up and two pillar candles at its feet; the flames flicker',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 24, 4, ['RrrR', 'Rrrr', 'gggg', 'RmmR', 'Rrrr', 'Rrrr'], { r: C.red, R: '#E8574F', g: C.gold, m: MARIGOLD_L })
        flame(f, 24, 0)
        stamp(f, 0, 20, ['www', 'sww', 'sww', 'sww', 'sww', 'sww'], { w: C.white, s: C.shade })
        flame(f, 0, 16)
        stamp(f, 4, 22, ['www', 'sww', 'sww', 'sww'], { w: C.white, s: C.shade })
        flame(f, 4, 18)
      },
    },
    {
      id: 'muertos-monarca',
      name: 'Monarch butterfly',
      note: 'a monarch butterfly perched on its head, wings spread; the wings flap',
      draw: (f, pose) => {
        crabBody(f, pose)
        // Two big upper wings spread above its head, veined black with white spots on the rim.
        const wing = { k: '#2A2228', o: '#F08A1C', O: '#C25E0E', w: '#FFFFFF' }
        const left = [
          'kkkkk......',
          'kwwkookk...',
          'kwoooookkk.',
          'kkoookoooOk',
          '.kwooookooo',
          '.kooooOkooo',
          '..kwoooookO',
          '...kkoooook',
          '.....kkkkkk',
        ]
        stamp(f, 4, 1, left, wing, 'fp a')
        stamp(f, 15, 1, left.map((r) => [...r].reverse().join('')), wing, 'fp b')
        // The butterfly's body and antennae between the wings.
        f(14, 3, 2, 7, '#3A2E2A', 'th'); f(14, 3, 1, 6, '#6A5A54', 'th')
        stamp(f, 11, 0, ['oo....oo', '..a..a..', '...aa...'], { a: '#3A2E2A', o: MARIGOLD }, 'th')
      },
    },
    {
      id: 'muertos-mariachi',
      name: 'Mariachi',
      note: 'a gold-trimmed charro sombrero, a red bow tie and a guitar; it strums',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 2, 0, [
          '...........llll...........',
          '..........lkkkkl..........',
          '.........lkkkkkkl.........',
          '.........kkgkkgkk.........',
          '........lkkkkkkkkl........',
          '........gggggggggg........',
          'll......kkkkkkkkkk......ll',
          'lkkl...lkkkkkkkkkkl...lkkl',
          'gkkkllkkkkkkkkkkkkkkllkkkg',
          '.gggggggggggggggggggggggg.',
        ].map((r) => r.slice(0, 26)), { k: C.black, l: C.rim, g: C.gold })
        stamp(f, 12, 15, ['rr..rr', 'rrRRrr', 'rr..rr'], { r: C.red, R: C.redD })
        stamp(f, 23, 3, [
          '..hhh..',
          '..hnh..',
          '...n...',
          '...n...',
          '...n...',
          '...n...',
          '...n...',
          '...n...',
          '.bbnbb.',
          '.bbkbb.',
          '..bkb..',
          '.bbbbb.',
          'bbbbbbb',
          'bbbnbbb',
          '.bbbbb.',
        ], { h: '#5A3519', n: '#3E2614', b: '#D49A55', k: '#4A2C14' }, 'sh')
      },
    },
    {
      id: 'muertos-catrina',
      name: 'Catrina hat',
      note: 'a grand wide-brimmed hat piled with roses and marigolds; the plume sways',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 4, 3, [
          '......lllllllllll.....',
          '.....lkkkkkkkkkkkk....',
          '.....lkkkkkkkkkkkk....',
          '.....lkkkkkkkkkkkk....',
          '.....pppppppppppppp...',
          'llllllllllllllllllllll',
          'kkkkkkkkkkkkkkkkkkkkkk',
        ], { k: '#4B2A6E', l: '#7A57A6', p: MAGENTA })
        stamp(f, 8, 2, [
          '.rr.....',
          'rRrr.PP.',
          'rrRr PpP',
          '.rrgPPpP',
          '..gg.PP.',
        ].map((r) => r.replace(' ', 'P')), { r: C.red, R: C.redD, P: C.pink, p: '#C8577A', g: C.green })
        marigold(f, 16, 3)
        stamp(f, 20, 0, ['..www.', '.wwpww', 'wwpw.w', 'wpw...', 'pp....'], { w: C.white, p: C.pink }, 'sw')
      },
    },
    {
      id: 'muertos-alebrije',
      name: 'Alebrije',
      note: 'painted in bright alebrije patterns with a spiky crest; the crest quivers',
      draw: (f, pose) => {
        crabBody(f, pose, 0, undefined, TEAL)
        stamp(f, 7, 15, [
          'm...m...m...m...',
          '.m.m.m.m.m.m.m.m',
          '..m...m...m...m.',
        ], { m: MAGENTA })
        for (let x = 8; x < 22; x += 3) f(x, 19, 1, 1, C.gold)
        for (let x = 9; x < 22; x += 3) f(x, 20, 1, 1, C.white)
        f(8, 11, 4, 1, C.gold); f(18, 11, 4, 1, C.gold); f(14, 13, 2, 1, MARIGOLD)
        f(3, 14 - (pose.isCheering ? 4 : 0), 4, 1, MAGENTA, pose.isCheering ? 'ar' : undefined)
        f(23, 14 - (pose.isCheering ? 4 : 0), 4, 1, MAGENTA, pose.isCheering ? 'ar' : undefined)
        for (const [x, c] of [[7, 'la'], [17, 'la'], [11, 'lb'], [21, 'lb']] as const) f(x, 23, 2, 1, C.gold, c)
        eyes(f, pose)
        stamp(f, 7, 6, [
          '.m...y...o...p..',
          '.m...y...o...p..',
          'mmm.yyy.ooo.ppp.',
          'mmmmyyyyoooopppp',
        ], { m: MAGENTA, y: C.gold, o: MARIGOLD, p: PURPLE }, 'sh')
      },
    },
    {
      id: 'muertos-ofrenda',
      name: 'Ofrenda photo',
      note: 'a gold photo frame from the ofrenda, ringed with marigolds; it bobs as it is held up',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'up')
        stamp(f, 21, 1, [
          'ggggggggg',
          'gbbbbbbbg',
          'gbbcccbbg',
          'gbckcccbg',
          'gbbcccbbg',
          'gbc.c.cbg',
          'gbbbbbbbg',
          'ggggggggg',
        ].map((r) => r.replace(/\./g, 'b')), { g: C.gold, b: '#BFE0F0', c: CLAY, k: C.black }, 'up')
        marigold(f, 19, 0, 'up')
        marigold(f, 26, 7, 'up')
      },
    },
  ],
}
