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
      id: 'potofgold',
      name: 'Pot of gold',
      note: 'a black pot heaped with gold, a coin held up high; the coin bobs',
      draw: (f, pose) => {
        stamp(f, 23, 18, [
          '.yYyYy.',
          'yyYyyYy',
          'lllllll',
          'kkkkkkl',
          'kkkkkkl',
          'kkkkkkl',
          '.kkkkl.',
          '.l...l.',
        ], { y: C.gold, Y: C.goldD, l: C.rim, k: C.black })
        f(24, 18, 1, 1, '#FFF3B8', 'bl'); f(27, 19, 1, 1, '#FFF3B8', 'bl2')
        crabBody(f, pose, -4, 'up')
        stamp(f, 24, 6, ['.yy.', 'yYYy', 'yYYy', '.yy.'], { y: C.gold, Y: C.goldD }, 'up')
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
      id: 'rainbow',
      name: 'Rainbow',
      note: 'a rainbow arching over its head from cloud to cloud; it twinkles',
      draw: (f, pose) => {
        crabBody(f, pose)
        const bands = [C.red, C.orange, C.gold, G, C.blue, C.purple]
        for (let y = 1; y < 10; y++) for (let x = 5; x < 25; x++) {
          const i = Math.floor(8.5 - Math.hypot(x + 0.5 - 15, y + 0.5 - 10))
          if (i >= 0 && i < 6) f(x, y, 1, 1, bands[i] ?? '')
        }
        for (const x of [4, 19]) stamp(f, x, 7, ['..www..', '.wwwwww', 'gwwwwwg', '.ggggg.'], { w: C.white, g: '#B9B7AE' })
        f(25, 2, 1, 1, '#FFF3B8', 'bl'); f(24, 3, 3, 1, '#FFF3B8', 'bl'); f(25, 4, 1, 1, '#FFF3B8', 'bl')
        f(21, 0, 1, 1, '#FFF3B8', 'bl2')
      },
    },
    {
      id: 'horseshoe',
      name: 'Lucky horseshoe',
      note: 'holds a lucky horseshoe up, points to the sky; it swings and glints',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sw')
        stamp(f, 23, 3, [
          'hs...hs',
          'hn...ns',
          'hs...hs',
          'hn...ns',
          'hss.hss',
          '.hssss.',
          '..sss..',
        ], { s: '#8E949C', h: '#C9CED6', n: INK }, 'sw')
        f(26, 9, 1, 1, '#8E949C', 'sw')
        f(22, 2, 1, 1, '#FFF3B8', 'bl'); f(29, 5, 1, 1, '#FFF3B8', 'bl2')
      },
    },
    {
      id: 'bowler',
      name: 'Green bowler',
      note: 'a green bowler hat and bow tie; tips the hat',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 12, 17, ['gg..gg', 'ggGGgg', 'gg..gg'], { g: G, G: GD })
        stamp(f, 7, 4, [
          '....llllllll....',
          '...lggggggggg...',
          '..lggggggggggg..',
          '..kkkkkkkkkkkk..',
          'l.gggggggggggg.l',
          'gggggggggggggggg',
        ], { g: G, l: GL, k: GD }, 'tl')
        stamp(f, 17, 5, ['.l.', 'lgl', '.d.'], { l: GL, g: G, d: GD }, 'tl')
      },
    },
    {
      id: 'fiddle',
      name: 'Fiddler',
      note: 'a tweed flat cap and a fiddle; the bow saws',
      css: '.c-h-fiddle.run .bw{animation:fiddle-saw .5s ease-in-out infinite}@keyframes fiddle-saw{50%{transform:translate(-3px,1px)}}',
      draw: (f, pose) => {
        stamp(f, 23, 3, [
          '...dd..',
          '...ddd.',
          ...Array(8).fill('...d...'),
          '.bbkbb.',
          'bbbkbbb',
          'bhbkbbb',
          '.bfkfb.',
          '..bkb..',
          '.bfkfb.',
          'bbHHHbb',
          'bhbkbbb',
          'bbbkbbb',
          '.bbbbb.',
          '...d...',
        ], { b: '#B8662C', h: '#D88A48', d: '#8A4E22', f: '#5A2E12', k: '#2A1A10', H: '#E9D6A8' })
        crabBody(f, pose, -4)
        stamp(f, 17, 14, [
          'k...........',
          'wkk.........',
          '.wwkk.......',
          '...wwkk.....',
          '.....wwkk...',
          '.......wwkk.',
          '.........wwk',
        ], { k: '#4A2E1A', w: '#EFE3C4' }, 'bw')
        stamp(f, 7, 6, [
          '...llllllllll.....',
          '..lggggggggggg....',
          '.lgggggggggggggg..',
          '.GGGGGGGGGGGGGGGGG',
        ], { l: '#8FB07A', g: '#557A43', G: '#3E5C30' })
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
      id: 'aran',
      name: 'Aran sweater',
      note: 'a cream cable-knit jumper and a green bobble hat; the bobble bounces',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 7, 15, [
          'wswswswswswswsws',
          'wssws' + 'wwssw' + 'wswssw',
          'swwswswwswwswwws',
          'wssws' + 'wswwsw' + 'wswsw',
          'swwsw' + 'wwssw' + 'wwswws',
          'wssws' + 'wwssw' + 'wswssw',
          'ssssssssssssssss',
        ], { w: '#ECE1C4', s: '#BFAE84' })
        stamp(f, 3, 17, ['wsws'], { w: '#ECE1C4', s: '#BFAE84' })
        stamp(f, 23, 17, ['wsws'], { w: '#ECE1C4', s: '#BFAE84' })
        stamp(f, 8, 4, [
          '.....llll.....',
          '...lggggggg...',
          '..lgggggggggg.',
          '.ggggggggggggg',
          'gGgGgGgGgGgGgG',
          'GgGgGgGgGgGgGg',
        ].map(r => r.padEnd(14, '.')), { l: GL, g: G, G: GD })
        stamp(f, 13, 1, ['.ww.', 'wwww', '.ws.'], { w: '#ECE1C4', s: '#BFAE84' }, 'up')
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
