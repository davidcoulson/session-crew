// Thanksgiving (US), the week around the fourth Thursday in November.

import { C, addDays, crabBody, day, eyes, stamp } from './kit'
import type { Fill, Holiday } from './kit'

/** The fourth Thursday of November in `year`. */
export const thanksgivingDay = (year: number): Date => {
  const dow = day(year, 11, 1).getDay()
  return day(year, 11, 1 + ((4 - dow + 7) % 7) + 21)
}

const STEAM = '#BDBBB2'

/** A small maple leaf, 5×5, in `c` with a darker vein `v`. */
const maple = (f: Fill, x: number, y: number, c: string, v: string, cls?: string): void =>
  stamp(f, x, y, ['..x..', 'x.x.x', 'xxvxx', '.xvx.', '..s..'], { x: c, v, s: C.brownD }, cls)

export const THANKSGIVING: Holiday = {
  id: 'thanksgiving',
  name: 'Thanksgiving',
  when: 'the week of the fourth Thursday in November (US)',
  window: (year) => {
    const d = thanksgivingDay(year)
    return [addDays(d, -3), addDays(d, 3)]
  },
  outfits: [
    {
      id: 'tg-turkey',
      name: 'Turkey',
      note: 'a fan of tail feathers behind, a beak and a red wattle; the wattle wobbles',
      draw: (f, pose) => {
        // The fan goes on first, behind the body: bands of brown, orange, red and gold.
        for (let y = 1; y < 14; y++) {
          for (let x = 2; x < 28; x++) {
            const dx = x + 0.5 - 15
            const dy = y + 0.5 - 14
            const r = Math.hypot(dx, dy)
            if (r > 12.2) continue
            const feather = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 10)) % 2
            const c = r > 10.4 ? (feather ? '#6B3F1E' : '#8E5A2C')
              : r > 8.4 ? (feather ? C.orangeD : C.orange)
              : r > 6.4 ? (feather ? C.redD : C.red)
              : C.gold
            f(x, y, 1, 1, c)
            if (r > 11.4 && !feather) f(x, y, 1, 1, '#E9D3A6')
          }
        }
        crabBody(f, pose)
        f(14, 14, 2, 1, C.gold); f(14, 15, 2, 1, C.goldD)
        stamp(f, 15, 15, ['.r', '.r', 'rr', 'R.'], { r: C.red, R: C.redD }, 'swt')
      },
    },
    {
      id: 'tg-buckle',
      name: 'Buckle hat',
      note: 'a tall black hat with a gold buckle and buckled shoes; the hat lifts',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 5, 1, [
          '.....lllllllll......',
          '.....lkkkkkkkkk.....',
          '.....lkkkkkkkkk.....',
          '....lkkkkkkkkkkk....',
          '....lbbbbgggbbbb....',
          '....lbbbbgkgbbbb....',
          '....lbbbbgggbbbb....',
          'llllllllllllllllllll',
          'kkkkkkkkkkkkkkkkkkkk',
        ], { k: C.black, l: C.rim, b: '#4A3426', g: C.gold }, 'up')
        // Buckled shoes on the feet, walking with the legs.
        for (const [x, c] of [[7, 'la'], [17, 'la'], [11, 'lb'], [21, 'lb']] as const) {
          f(x, 24, 2, 2, '#3A2A1E', c); f(x, 24, 1, 1, C.gold, c)
        }
      },
    },
    {
      id: 'tg-pie',
      name: 'Pumpkin pie',
      note: 'a whole pumpkin pie with whipped cream, held high; steam rises off it',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 21, 2, [
          '...ww....',
          '..wwwws..',
          '.cCcCcCc.',
          'coooooooc',
          'coooooooc',
          'CcccccccC',
          '.ppppppp.',
        ], { w: C.white, s: C.shade, o: '#D9822B', c: '#D19A50', C: '#9C6428', p: C.silver })
        f(22, 0, 1, 2, STEAM, 'rs'); f(27, 0, 1, 2, STEAM, 'rs2')
      },
    },
    {
      id: 'tg-cornucopia',
      name: 'Cornucopia',
      note: 'a wicker horn of plenty spilling fruit over its head; the apple bobs',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        // The horn, widening from the curled tip (right) to the mouth (left), woven in stripes.
        const cols: [number, number, number][] = [[28, 3, 4], [27, 3, 5], [26, 3, 6], [25, 3, 7], [24, 2, 8], [23, 2, 9], [22, 2, 10], [21, 2, 10]]
        for (const [x, top, bottom] of cols) {
          for (let y = top; y <= bottom; y++) f(x, y, 1, 1, (x + y) % 3 === 0 ? '#8E5A2C' : '#C9965A')
        }
        f(29, 4, 1, 2, '#8E5A2C'); f(28, 5, 1, 1, '#8E5A2C')
        f(20, 2, 1, 9, '#E0B878'); f(21, 3, 1, 7, '#5A3519')
        // Produce spilling out of the mouth.
        stamp(f, 13, 3, ['..yyyyyyg', '.yYyYyYgg'], { y: '#F2C94C', Y: '#D9A92E', g: '#6E9E3A' })
        stamp(f, 15, 6, ['..g..', '.oOo.', 'oOoOo', '.oOo.'], { o: C.orange, O: C.orangeD, g: C.greenD })
        stamp(f, 18, 8, ['ppp', 'pPp', '.p.'], { p: '#7A3E9A', P: '#5A2A78' })
        stamp(f, 12, 5, ['.sl', 'rrr', 'rRr', '.r.'], { r: C.red, R: C.redD, s: C.brownD, l: C.green }, 'up')
      },
    },
    {
      id: 'tg-leaves',
      name: 'Autumn leaves',
      note: 'a crown of maple leaves in red, orange and gold; leaves drift down',
      draw: (f, pose) => {
        crabBody(f, pose)
        maple(f, 7, 6, C.red, C.redD)
        maple(f, 12, 5, C.orange, C.orangeD)
        maple(f, 17, 6, C.gold, C.goldD)
        stamp(f, 0, 11, ['xx.', 'xxx', '.xs'], { x: C.orange, s: C.brownD }, 'fx')
        stamp(f, 26, 4, ['.xx', 'xxx', 'sx.'], { x: C.red, s: C.brownD }, 'fx2')
        stamp(f, 27, 19, ['xx.', 'xxx', '.xs'], { x: C.gold, s: C.brownD }, 'fx')
      },
    },
    {
      id: 'tg-roast',
      name: 'Roast turkey',
      note: 'carries the roast turkey on a silver platter; steam rises',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 19, 2, [
          '.w.......w.',
          '.dd.....dd.',
          '..dbbbbbd..',
          '.bbbhhbbbb.',
          'bbbbbbhbbbb',
          'bbbbbbbbbbB',
          '.BBBBBBBBB.',
          'sssssssssss',
          '.SSSSSSSSS.',
        ], { w: C.white, d: '#A9662A', b: '#C07C34', h: '#E8B068', B: '#8A5420', s: C.silver, S: C.gray })
        f(22, 0, 1, 2, STEAM, 'rs'); f(26, 0, 1, 2, STEAM, 'rs2')
      },
    },
    {
      id: 'tg-corn',
      name: 'Corn cob',
      note: 'yellow kernels, husks peeling back and a silk tassel; the silk flutters',
      draw: (f, pose) => {
        crabBody(f, pose, 0, undefined, '#F2C94C')
        for (let y = 11; y < 22; y += 2) for (let x = 8 + ((y >> 1) % 2); x < 22; x += 2) f(x, y, 1, 1, '#D9A92E')
        eyes(f, pose)
        const husk = ['..gG', '..gG', '..gG', '..gG', '..gG', '..gG', '..gG', '..gG', '..gG', '..gG', '..gG', '..gG']
        stamp(f, 4, 5, ['g...', 'gg..', '.gg.', '.gG.', ...husk], { g: '#6FB04A', G: '#3F7E2E' })
        stamp(f, 22, 5, ['...g', '..gg', '.gg.', '.Gg.', ...husk.map((r) => [...r].reverse().join(''))], { g: '#6FB04A', G: '#3F7E2E' })
        stamp(f, 12, 5, ['s.s..s', '.s.ss.', 'ssssss', '.ssss.', '..ss..'], { s: '#D8B46A' }, 'sh')
      },
    },
    {
      id: 'tg-football',
      name: 'Football',
      note: 'a striped helmet with a face mask and a football held up; the ball spirals',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 6, 4, [
          '.....hhhhhwwhh....',
          '...hhbbbbbwwbbhh..',
          '..hbbbbbbbwwbbbbh.',
          '.hbbbbbbbbwwbbbbbh',
          '.bbbbbbbbbwwbbbbbb',
          '.bbbbbbbbbwwbbbbbb',
          '.bb............bb.',
          '.bb............bb.',
          '.bb............bb.',
        ], { b: '#2B4C8C', h: '#5378C2', w: C.white })
        stamp(f, 8, 15, ['g..............g', 'gggggggggggggggg', 'g.....g..g.....g', 'gggggggggggggggg'], { g: C.silver })
        eyes(f, pose)
        stamp(f, 21, 4, ['...BBB...', '.bwbwbwb.', 'bbwwwwwbb', '.bbbbbbb.', '...bbb...'], { b: '#8B4A22', B: '#B56E38', w: C.white }, 'sp')
      },
    },
    {
      id: 'tg-scarecrow',
      name: 'Scarecrow',
      note: 'a ragged straw hat, a plaid patch and straw at the claws; the crow on the brim flaps',
      draw: (f, pose) => {
        crabBody(f, pose)
        const straw = '#E8C860'
        stamp(f, 5, 3, [
          '......tttttttt......',
          '.....tTttTttTtt.....',
          '.....tttTttTttt.....',
          '.....rrrrrrrrrr.....',
          '..tttttttttttttttt..',
          't.tTttttTttttTtttt.t',
          '.y.y............y.y.',
        ], { t: '#D4A85A', T: '#B88A3E', r: C.red, y: straw })
        stamp(f, 16, 15, ['k.k.k.', '.bRbR.', 'kRRRRk', '.bRbR.', 'kRRRRk', '.k.k.k'], { b: C.blue, R: C.redD, k: '#4A3426' })
        const y = pose.isCheering ? 11 : 15
        const cls = pose.isCheering ? 'ar' : undefined
        stamp(f, 27, y, ['yy', '.y', 'yy'], { y: straw }, cls)
        stamp(f, 1, y, ['yy', 'y.', 'yy'], { y: straw }, cls)
        stamp(f, 21, 1, ['..kl.', '.kkko', 'lkkk.', 'kkkk.', '.k.k.'], { k: '#2E2A35', l: '#6E6684', o: C.orange }, 'fp')
      },
    },
    {
      id: 'tg-cider',
      name: 'Apple cider',
      note: 'a knit scarf and a mug of cider with a cinnamon stick; steam curls up',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        const knit = { g: '#2E6B4A', m: '#E2B33A' }
        stamp(f, 7, 16, ['gggmgggmgggmgggm', 'gggmgggmgggmgggm'], knit)
        stamp(f, 9, 18, ['gm', 'gm', 'gm', 'm.'], knit, 'sw')
        stamp(f, 22, 2, [
          '...n....',
          '...n....',
          'gaaanag.',
          'wwwwwwgg',
          'wrrrrw.g',
          'wwwwwwgg',
          'gwwwwg..',
        ], { w: C.white, g: C.shade, a: '#C77B30', n: '#7A4A26', r: C.red })
        f(23, 0, 1, 2, STEAM, 'rs'); f(26, 0, 1, 2, STEAM, 'rs2')
      },
    },
  ],
}
