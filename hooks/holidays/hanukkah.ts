// Hanukkah, the eight nights: from the first evening to the day after the eighth.

import { C, crabBody, eyes, around, stamp } from './kit'
import type { MonthDay, Holiday, Pose } from './kit'

// The first evening of Hanukkah (25 Kislev) per year; extend the table past 2035.
const FIRST_NIGHT: Record<number, MonthDay> = {
  2026: [12, 4],
  2027: [12, 24],
  2028: [12, 12],
  2029: [12, 1],
  2030: [12, 20],
  2031: [12, 9],
  2032: [11, 27],
  2033: [12, 16],
  2034: [12, 6],
  2035: [12, 25],
}

const BLUE = '#2F5DA8'
const BLUE_L = '#5B8FD9'
const BLUE_D = '#1F3F78'
const SILVER = C.silver
const STAR = ['...x...', '..x.x..', 'xxxxxxx', '.x...x.', 'xxxxxxx', '..x.x..', '...x...']

// The claws, for outfits that dress them (mittens, sleeves).
const claws = (pose: Pose): [number, number, string | undefined][] => [
  [3, pose.isCheering ? 10 : 14, pose.isCheering ? 'ar' : undefined],
  [23, pose.isCheering ? 10 : 14, pose.isCheering ? 'ar' : undefined],
]

export const HANUKKAH: Holiday = {
  id: 'hanukkah',
  name: 'Hanukkah',
  when: 'the eight nights',
  window: around(FIRST_NIGHT, 0, 8),
  outfits: [
    {
      id: 'menorah',
      name: 'Menorah',
      note: 'balances a gold menorah with all nine candles lit; the flames flicker',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 7, 0, [
          '.................',
          '.................',
          '.................',
          'b.l.b.l.w.l.b.l.b',
          'b.l.b.l.w.l.b.l.b',
          'g.g.g.g.w.g.g.g.g',
          'ggggggggGgggggggg',
          '.GgggggggggggggG.',
          '.......ggg.......',
          '....GGGGGGGGG....',
        ], { b: BLUE, l: BLUE_L, w: C.white, g: C.gold, G: C.goldD })
        const flames = ['........y........', 'y.y.y.y.y.y.y.y.y', 'o.o.o.o.o.o.o.o.o']
        stamp(f, 7, 0, flames, { y: C.flame, o: C.orange }, 'fk')
      },
    },
    {
      id: 'dreidel',
      name: 'Dreidel',
      note: 'a blue dreidel with a gold shin, spun by the claw; the dreidel spins',
      css: '.c-h-dreidel.run .dr{transform-origin:50% 100%;animation:hdrd .5s linear infinite}@keyframes hdrd{0%,100%{transform:scaleX(1)}25%,75%{transform:scaleX(.2)}50%{transform:scaleX(-1)}}',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 23, 17, [
          '...ss..',
          '...sS..',
          'lbbbbbb',
          'lgbgbgb',
          'lgbgbgb',
          'lgbgbgb',
          'lgggggb',
          '.lbbbD.',
          '..bbD..',
          '...D...',
        ], { b: BLUE, l: BLUE_L, D: BLUE_D, g: C.gold, s: SILVER, S: C.gray }, 'dr')
      },
    },
    {
      id: 'kippah',
      name: 'Kippah',
      note: 'a blue kippah with a silver band and a Star of David pendant; the pendant sways',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 10, 7, [
          '...lbbb...',
          '.llbbbbbb.',
          'lbbbbbbbbD',
          'swswswswsw',
        ], { b: BLUE, l: BLUE_L, D: BLUE_D, s: SILVER, w: C.white })
        stamp(f, 11, 11, [
          's......s',
          '.s....s.',
          '..s..s..',
        ], { s: SILVER }, 'swt')
        stamp(f, 11, 14, STAR.map(r => r + '.'), { x: '#F4F3EE' }, 'swt')
        // Pendant and chain in one group so they sway together.
        f(14, 13, 1, 1, SILVER, 'swt')
      },
    },
    {
      id: 'latkes',
      name: 'Latkes',
      note: 'a striped apron and a pan of golden latkes; steam rises off them',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'pan')
        stamp(f, 9, 15, [
          'wwwwwwwwwwww',
          'bbbbbbbbbbbb',
          'wwwwwwwwwwww',
          'bbbbbbbbbbbb',
          'wwwwwwwwwwww',
          'bbbbbbbbbbbb',
        ], { w: C.white, b: BLUE_L })
        f(8, 14, 1, 1, BLUE); f(21, 14, 1, 1, BLUE)
        stamp(f, 22, 6, [
          '.lLl.lLl',
          'lLdLlLdL',
          'ssssssss',
          '.kkkkkk.',
          '...k....',
        ], { l: '#E0A852', L: '#C27F2E', d: '#8E5A1E', s: SILVER, k: '#4A4A48' }, 'pan')
        stamp(f, 23, 1, ['.s', 's.', '.s'], { s: '#B9B7AE' }, 'rs')
        stamp(f, 27, 1, ['s.', '.s', 's.'], { s: '#B9B7AE' }, 'rs2')
      },
    },
    {
      id: 'sufganiyah',
      name: 'Sufganiyah',
      note: 'a powdered jelly doughnut held up high and a napkin tucked in; the jelly drips',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'dn')
        stamp(f, 22, 4, [
          '..wwww..',
          '.wwwwww.',
          'wwwrrwww',
          'dddrrddd',
          'dddddddd',
          '.DDDDDD.',
        ], { w: '#F7F3EA', d: '#D99A4E', D: '#A86A2A', r: '#C8243A' }, 'dn')
        f(23, 4, 1, 1, C.shade, 'dn'); f(28, 4, 1, 1, C.shade, 'dn')
        f(26, 10, 1, 2, '#C8243A', 'fx')
        stamp(f, 12, 15, ['wwwwww', 'wbbbbw', '.wwww.', '..ww..'], { w: C.white, b: BLUE_L })
        f(9, 15, 1, 1, '#F7F3EA'); f(20, 16, 1, 1, '#F7F3EA')
      },
    },
    {
      id: 'gelt',
      name: 'Gelt',
      note: 'a mesh bag of gold chocolate coins, with a few spilled at its feet; the bag swings',
      draw: (f, pose) => {
        stamp(f, 0, 23, ['.GG.GG', 'GggGgg', '.GG.GG'], { g: C.gold, G: C.goldD })
        crabBody(f, pose)
        const by = pose.isCheering ? 14 : 18
        stamp(f, 23, by, [
          '..ss..',
          '.nyyn.',
          'nGnGnG',
          'GnGnGn',
          'nGnGnG',
          'GnGnGn',
          '.nnnn.',
        ], { s: BLUE, n: '#E4E6EA', y: BLUE_L, G: C.gold }, 'swt')
      },
    },
    {
      id: 'hanukkah-scarf',
      name: 'Scarf and mittens',
      note: 'a blue-and-white knit hat, scarf and mittens; the scarf end swings',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 8, 3, [
          '......ss......',
          '.....ssss.....',
          '...bbbbbbbb...',
          '..bbwbbbbwbb..',
          '.bbbbbbbbbbbb.',
          'wbwbwbwbwbwbwb',
          'bwbwbwbwbwbwbw',
        ], { b: BLUE, w: C.white, s: SILVER })
        stamp(f, 7, 15, ['bbwwbbwwbbwwbbww', 'BBWWBBWWBBWWBBWW'], { b: BLUE, B: BLUE_D, w: C.white, W: C.shade })
        stamp(f, 9, 17, ['bB', 'wW', 'bB', 'wW', 'bB', 'ss'], { b: BLUE, B: BLUE_D, w: C.white, W: C.shade, s: SILVER }, 'swt')
        for (const [x, y, cls] of claws(pose)) {
          f(x, y, 4, 3, BLUE, cls); f(x, y, 4, 1, BLUE_L, cls); f(x, y + 3, 4, 1, C.white, cls)
        }
      },
    },
    {
      id: 'hanukkah-sweater',
      name: 'Hanukkah sweater',
      note: 'a blue knit sweater with a white Star of David; the star twinkles',
      draw: (f, pose) => {
        crabBody(f, pose)
        f(7, 14, 16, 8, BLUE)
        f(7, 14, 16, 1, BLUE_L)
        stamp(f, 7, 21, ['wbwbwbwbwbwbwbwb'], { w: C.white, b: BLUE })
        stamp(f, 11, 14, STAR, { x: C.white })
        stamp(f, 8, 16, ['s.......s'.padEnd(14, '.') + 's'], { s: C.white })
        for (const [x, y, cls] of claws(pose)) {
          f(x, y, 4, 4, BLUE, cls); f(x, y + 3, 4, 1, C.white, cls)
        }
        f(9, 15, 1, 1, C.gold, 'bl'); f(20, 18, 1, 1, C.gold, 'bl'); f(9, 19, 1, 1, C.gold, 'bl2'); f(20, 15, 1, 1, C.gold, 'bl2')
      },
    },
    {
      id: 'oil-jug',
      name: 'Oil jug',
      note: 'a little jug of olive oil and an olive sprig; a golden drop drips from the spout',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'jug')
        stamp(f, 9, 7, ['.gg.g...', 'gkggk.gg', '...g.gk.'], { g: '#6B8E3A', k: '#3A3F2A' })
        stamp(f, 22, 2, [
          '..rrr..',
          '...j...',
          'jjjjjj.',
          '.jjjjjh',
          '.bbbbbh',
          '.jjjjjh',
          '.jjjjjh',
          '..jjjh.',
        ], { j: '#E2CB98', h: '#A88F62', b: BLUE, r: '#8A6A3A' }, 'jug')
        f(22, 6, 1, 2, C.gold, 'fx')
      },
    },
  ],
}
