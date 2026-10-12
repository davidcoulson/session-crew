// The 4th of July, Jul 1–5.

import { C, INK, crabBody, eyes, fixed, stamp } from './kit'
import type { Fill, Holiday } from './kit'

const RED = '#D0312D'
const BLUE = '#2F5DA8'
const NAVY = '#25407A'
const NAVY_L = '#5A7FCB'
const WHITE = '#F4F3EE'
const EDGE = '#BDBAB0'
const SPARK = '#FFE66A'
const PATINA = '#6FB8A0'
const PATINA_D = '#4E9A82'
const PATINA_L = '#A6DCC8'

const legs = (f: Fill, color: string): void => {
  for (const [x, c] of [[7, 'la'], [17, 'la'], [11, 'lb'], [21, 'lb']] as const) f(x, 22, 2, 4, color, c)
}

export const JULY_4: Holiday = {
  id: 'july4',
  name: '4th of July',
  when: 'Jul 1–5',
  window: fixed([7, 1], [7, 5]),
  outfits: [
    {
      id: 'unclesam',
      name: 'Uncle Sam',
      note: 'a tall striped top hat with a starry band and a white goatee; the stars twinkle',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 7, 0, [
          '...gggggggggg...',
          '...rrwwrrwwrr...',
          '...rrwwrrwwrr...',
          '...rrwwrrwwrr...',
          '...rrwwrrwwrr...',
          '...rrwwrrwwrr...',
          '...bbbbbbbbbb...',
          '...bbbbbbbbbb...',
          '.lllllllllllll l'.replace(' ', 'l').slice(0, 16),
          'bbbbbbbbbbbbbbbb',
        ].map(r => r.slice(0, 16)), { g: EDGE, r: RED, w: WHITE, b: BLUE, l: NAVY_L })
        f(11, 6, 1, 1, WHITE, 'bl'); f(15, 7, 1, 1, WHITE, 'bl'); f(18, 6, 1, 1, WHITE, 'bl')
        f(13, 7, 1, 1, WHITE, 'bl2'); f(17, 7, 1, 1, WHITE, 'bl2'); f(11, 7, 1, 1, WHITE, 'bl2')
        stamp(f, 13, 17, ['gwwg', 'gwwg', '.ww.', '.gg.'], { w: WHITE, g: EDGE })
        f(8, 11, 4, 1, WHITE); f(18, 11, 4, 1, WHITE)
      },
    },
    {
      id: 'flagwaver',
      name: 'Flag waver',
      note: 'waves the stars and stripes on a pole; the flag flutters',
      draw: (f, pose) => {
        f(23, 1, 1, 12, C.gray); f(23, 0, 1, 1, C.gold)
        crabBody(f, pose, -4)
        stamp(f, 24, 1, [
          'bwbrrr',
          'bbbwww',
          'bwbrrr',
          'wwwwww',
          'rrrrrr',
          'wwwwww',
          'rrrrrr',
        ], { b: BLUE, w: WHITE, r: RED }, 'wv')
      },
    },
    {
      id: 'sparkler',
      name: 'Sparkler',
      note: 'a starry blue cap and a lit sparkler held high; the sparks crackle',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 7, 6, [
          '...llllllllll.....',
          '..lbbbbbbbbbbb....',
          '.lbbbbbbwbbbbbb...',
          '.BBBBBBBBBBBBBBBBB',
        ], { l: NAVY_L, b: BLUE, B: NAVY, w: WHITE })
        f(25, 9, 1, 2, C.gray); f(26, 7, 1, 2, C.gray); f(27, 5, 1, 2, C.gray)
        f(27, 4, 1, 1, '#FFFFFF')
        for (const [x, y] of [[27, 1], [27, 2], [24, 4], [25, 4], [29, 4], [27, 6]]) f(x, y, 1, 1, C.orange, 'bl')
        for (const [x, y] of [[25, 2], [29, 2], [26, 3], [28, 3], [28, 5], [25, 6], [29, 6]]) f(x, y, 1, 1, SPARK, 'bl2')
        f(26, 4, 1, 1, SPARK); f(28, 4, 1, 1, SPARK); f(27, 3, 1, 1, SPARK)
      },
    },
    {
      id: 'fireworks',
      name: 'Fireworks',
      note: 'holds a rocket while two fireworks burst overhead; the bursts pulse',
      draw: (f, pose) => {
        stamp(f, 24, 4, [
          '..r..',
          '.rrr.',
          '.rwr.',
          '.bbb.',
          '.rwr.',
          '.rrr.',
          'rr.rr',
        ], { r: RED, w: WHITE, b: BLUE })
        f(26, 11, 1, 10, '#A0703F')
        crabBody(f, pose)
        const burst = ['r..r..r', '.r.r.r.', '..rrr..', 'rrryrrr', '..rrr..', '.r.r.r.', 'r..r..r']
        stamp(f, 8, 1, burst, { r: RED, y: SPARK }, 'pf a')
        stamp(f, 16, 0, burst, { r: '#4C7FE0', y: WHITE }, 'pf b')
        f(13, 0, 1, 1, SPARK, 'bl'); f(23, 6, 1, 1, SPARK, 'bl2')
      },
    },
    {
      id: 'liberty',
      name: 'Lady Liberty',
      note: 'green copper skin, a spiked crown, a torch and a tablet; the torch flame flickers',
      draw: (f, pose) => {
        stamp(f, 0, 11, ['.ddd.', 'dlLld', 'dllld', 'dlLld', 'dllld', 'dlLld', 'dllld', '.ddd.'], { d: PATINA_D, l: PATINA_L, L: '#7FC4AC' })
        crabBody(f, pose, -4, undefined, PATINA)
        stamp(f, 7, 3, [
          'p......pp......p',
          '.p..p..pp..p..p.',
          '.pp.p..pp..p.pp.',
          '..pppp.pp.pppp..',
          '..pppppppppppp..',
          '..dpdpdpdpdpdp..',
        ], { p: PATINA_L, d: PATINA_D })
        f(7, 10, 16, 1, PATINA_D)
        stamp(f, 8, 16, ['d.......', '.d......', '..d.....', '...d....', '....dddd'], { d: PATINA_D })
        f(24, 5, 2, 5, PATINA_D); f(23, 4, 4, 1, PATINA_L)
        stamp(f, 23, 0, ['..o.', '.oyo', 'oyyo', '.yy.'], { o: C.orange, y: SPARK }, 'fk')
      },
    },
    {
      id: 'bbqchef',
      name: 'BBQ chef',
      note: 'a gingham apron and a hot dog on the spatula; the hot dog steams',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        f(11, 10, 1, 5, RED); f(18, 10, 1, 5, RED)
        for (let y = 15; y < 22; y++) for (let x = 10; x < 20; x++) {
          const a = (x >> 1) % 2, b = ((y - 15) >> 1) % 2
          f(x, y, 1, 1, a && b ? RED : a || b ? '#E88A86' : WHITE)
        }
        f(10, 15, 10, 1, RED)
        f(26, 5, 1, 5, '#6B4A2E')
        f(24, 4, 5, 1, '#9AA0A8')
        stamp(f, 23, 1, ['.bbbbb.', 'rryryrr', '.bbbbb.'], { r: '#C8442C', y: C.gold, b: '#E9B062' })
        f(25, 0, 1, 1, '#E6E6E6', 'rs'); f(27, 0, 1, 1, '#E6E6E6', 'rs2')
      },
    },
    {
      id: 'starshades',
      name: 'Star shades',
      note: 'red and blue star-shaped sunglasses; the lenses glint',
      draw: (f, pose) => {
        crabBody(f, pose)
        const star = ['...s...', '..sss..', 'sssssss', '.sssss.', '.ss.ss.', '.s...s.']
        stamp(f, 6, 10, star, { s: RED })
        stamp(f, 16, 10, star, { s: '#3F7BD8' })
        f(13, 12, 3, 1, WHITE); f(5, 12, 1, 1, WHITE); f(23, 12, 1, 1, WHITE)
        eyes(f, pose)
        f(8, 12, 1, 1, '#FFFFFF', 'bl'); f(18, 12, 1, 1, '#FFFFFF', 'bl2')
        f(13, 17, 4, 1, INK); f(12, 16, 1, 1, INK); f(17, 16, 1, 1, INK)
      },
    },
    {
      id: 'baldeagle',
      name: 'Bald eagle',
      note: 'brown feathers, a white head, a hooked yellow beak; the wings flap',
      draw: (f, pose) => {
        crabBody(f, pose, 0, undefined, '#7A4A26')
        legs(f, C.gold)
        const wing = { k: '#7A4A26', t: '#A0703F', r: '#B98A55' }
        stamp(f, 0, 6, ['.....rr', '...rrkk', '.rrkkkk', 'rkkkkkk', 'tkktkkk', 'tkktkkt', 't.kt.kt', '...t..t'], wing, 'fp')
        stamp(f, 23, 6, ['rr.....', 'kkrr...', 'kkkkrr.', 'kkkkkkr', 'kkktkkt', 'tkktkkt', 'tk.tk.t', 't..t...'], wing, 'fp')
        stamp(f, 7, 10, [
          'gggggggggggggggg',
          'gwwwwwwwwwwwwwwg',
          'gwwwwwwwwwwwwwwg',
          'gwwwwwwwwwwwwwwg',
          'gwwwwwwwwwwwwwwg',
          'wwwwwwwwwwwwwwww',
          'w.ww.ww.ww.ww.w.',
        ], { w: WHITE, g: EDGE })
        eyes(f, pose)
        if (pose.eyes === 'open') { f(8, 11, 3, 1, INK); f(19, 11, 3, 1, INK) }
        stamp(f, 13, 13, ['yyyy', 'yyyy', '.yyY', '..Y.'], { y: C.gold, Y: C.goldD })
      },
    },
    {
      id: 'watermelon',
      name: 'Watermelon',
      note: 'a gingham bib and a big slice of watermelon; the slice bobs to its mouth',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'up')
        stamp(f, 22, 2, [
          '..rrrrrr',
          '.rrkrrkr',
          'wrrrrrrw',
          'gwrkrrwg',
          '.gwrrwg.',
          '..gwwg..',
          '...gg...',
        ], { g: '#2E8B4A', w: '#E8F2D8', r: '#F0505A', k: INK }, 'up')
        for (const [y, w] of [[16, 10], [17, 8], [18, 6], [19, 4]] as const) {
          const x0 = 15 - w / 2
          for (let x = x0; x < x0 + w; x++) f(x, y, 1, 1, (x + y) % 2 ? RED : WHITE)
        }
        f(13, 15, 4, 1, INK)
      },
    },
    {
      id: 'drummer',
      name: 'Drummer',
      note: 'a plumed band shako and a snare drum; the sticks drum',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 10, 0, [
          '....ww....',
          '....rr....',
          'llllllllll',
          'bbbbyybbbb',
          'bbbyyyybbb',
          'bbbbyybbbb',
          'bbbbbbbbbb',
          'yyyyyyyyyy',
          'bbbbbbbbbb',
          'kkkkkkkkkkkk',
        ], { w: WHITE, r: RED, l: NAVY_L, b: NAVY, y: C.gold, k: '#4A4656' })
        stamp(f, 9, 16, [
          'RRRRRRRRRRRR',
          'bwwwbwwwbwww',
          'wbwbwbwbwbwb',
          'wwbwwwbwwwbw',
          'RRRRRRRRRRRR',
        ], { R: RED, w: WHITE, b: BLUE })
        f(9, 17, 1, 3, EDGE); f(20, 17, 1, 3, EDGE)
        stamp(f, 5, 14, ['sss....', '...sssS'], { s: '#6B4423', S: WHITE }, 'up')
        stamp(f, 18, 14, ['....sss', 'Ssss...'], { s: '#6B4423', S: WHITE }, 'up2')
      },
    },
  ],
}
