// Lunar New Year: from its eve through the first week. Red and gold.

import { C, crabBody, around, stamp } from './kit'
import type { Holiday, MonthDay } from './kit'

// The first day of the lunar year; extend past 2035 or the holiday stops switching on.
const NEW_YEAR_DAY: Record<number, MonthDay> = {
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
  2032: [2, 11],
  2033: [1, 31],
  2034: [2, 19],
  2035: [2, 8],
}

const RED = '#D42A2A'
const RED_D = '#8E1B20'
const GOLD = '#F5C542'
const GOLD_D = '#C99A1E'

// An open folding fan: a half disc around its pivot, panels in two reds split by
// gold ribs, a gold rim, and a gold pivot at the bottom.
const FAN: string[] = Array.from({ length: 10 }, (_, y) =>
  Array.from({ length: 13 }, (_, x) => {
    const dx = x - 6
    const dy = 8.5 - y
    const r = Math.hypot(dx, dy)
    if (y === 9) return x === 6 ? 'd' : '.'
    if (r > 7.6 || dy < 0) return '.'
    if (r < 1.6) return 'd'
    if (r > 6.6) return 'g'
    const a = Math.atan2(dy, dx) / Math.PI * 6
    return Math.abs(a - Math.round(a)) < 0.2 ? 'g' : Math.floor(a) % 2 ? 'r' : 'R'
  }).join(''))

export const LUNAR_NEW_YEAR: Holiday = {
  id: 'lunarnewyear',
  name: 'Lunar New Year',
  when: 'the eve and first week',
  window: around(NEW_YEAR_DAY, 1, 7),
  outfits: [
    {
      id: 'lny-lion',
      name: 'Lion dance',
      note: 'a lion-dance head with a horn, mirror and white fur, its cloth trailing behind; the lion blinks',
      draw: (f, pose) => {
        stamp(f, 1, 9, [
          '.gggg.',
          'grrrrr',
          'rrrrrr',
          'ryyrrr',
          'rrrrrr',
          '.rrryy',
          '.rrrrr',
          '..rrrr',
          '..gggg',
        ], { r: RED, g: GOLD, y: GOLD_D })
        crabBody(f, pose)
        stamp(f, 6, 0, [
          '........gg........',
          '.......gRRg.......',
          '...wwwrrrrrrwww...',
          '..wrrrrrmmrrrrrw..',
          '.wrrggrrmmrrggrrw.',
          '.wrgwwgrrrrgwwgrw.',
          'wrrgwwgrrrrgwwgrrw',
          'wrrrggrrrrrrggrrrw',
          'wrrrrrrggggrrrrrrw',
          'wwrrggggggggggrrww',
          '.wwwwwwwwwwwwwwww.',
        ], { r: RED, R: RED_D, g: GOLD, w: C.white, m: '#DDE6EE' })
        f(10, 6, 2, 2, C.black, 'bl'); f(19, 6, 2, 2, C.black, 'bl')
        f(10, 6, 1, 1, '#FFFFFF', 'bl'); f(19, 6, 1, 1, '#FFFFFF', 'bl')
      },
    },
    {
      id: 'lny-dragon',
      name: 'Dragon',
      note: 'a dragon head with golden antlers, teeth and whiskers, scaly coils behind; the whiskers wave',
      draw: (f, pose) => {
        stamp(f, 0, 10, [
          '.g.g...',
          'rrrrg..',
          'ryryrr.',
          '.rrrrrr',
          '...ryrr',
          '....rrr',
          '...g.g.',
          '..rrrrr',
          '.ryryrr',
          '.rrrr..',
        ], { r: RED, y: GOLD, g: GOLD })
        crabBody(f, pose)
        stamp(f, 8, 0, [
          '...g.g..............',
          '...gg.g.............',
          '....ggg.............',
          '..yy.rrrrr..........',
          '.yyyrrrwkrrrrrrrrr..',
          'yyyrrrrwwrrrrrrrrRR.',
          'yyyrrrrrrrrrrrrrrrr.',
          '.yyyrrrwwwwwwwwwww..',
          '..yyrrrDDDDDDDDDD...',
          '...yyrrrrrrrrrrr....',
        ], { r: RED, R: RED_D, D: RED_D, y: GOLD, g: GOLD_D, w: C.white, k: C.black })
        stamp(f, 26, 5, ['..g', '...g', '...g', '..g.'].map(r => r.slice(0, 4)), { g: GOLD }, 'wv')
      },
    },
    {
      id: 'lny-lantern',
      name: 'Red lantern',
      note: 'a round red lantern with gold caps and a tassel, hung from a raised claw; the lantern swings',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'hold')
        stamp(f, 23, 14, [
          '...k...',
          '.ggggg.',
          'rrRrRrr',
          'rRrRrRr',
          'rRrRrRr',
          'rRrRrRr',
          'rrRrRrr',
          '.ggggg.',
          '...y...',
          '..yyy..',
        ], { r: RED, R: RED_D, g: GOLD, y: GOLD_D, k: C.black }, 'swt')
      },
    },
    {
      id: 'lny-hongbao',
      name: 'Red envelope',
      note: 'a red envelope with a gold coin seal held up high; it tilts',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'tl')
        stamp(f, 22, 1, [
          'RRRRRRR',
          'RgrrrgR',
          'RrgrgrR',
          'RrrgrrR',
          'RrrrrrR',
          'RrgggrR',
          'RgyRygR',
          'RgRRRgR',
          'RgyRygR',
          'RrgggrR',
          'RRRRRRR',
        ], { r: RED, R: RED_D, g: GOLD, y: GOLD_D }, 'tl')
      },
    },
    {
      id: 'lny-crackers',
      name: 'Firecrackers',
      note: 'a string of red firecrackers dangling from the back claw; the fuse sparks',
      draw: (f, pose) => {
        crabBody(f, pose)
        const up = pose.isCheering
        const y0 = up ? 14 : 18
        const cls = up ? 'ar' : 'sh'
        stamp(f, 3, y0, [
          '.kk.',
          'rRrR',
          'rRrR',
          'gggg',
          'RrRr',
          'RrRr',
          'gggg',
          'rRrR',
          '.k..',
        ].slice(0, up ? 7 : 9), { r: RED, R: RED_D, g: GOLD, k: GOLD_D }, cls)
        if (!up) {
          f(4, 26, 1, 1, C.flame, 'bl'); f(3, 27, 1, 1, C.orange, 'bl2'); f(5, 27, 1, 1, C.flame, 'bl2'); f(2, 26, 1, 1, C.flame, 'bl2'); f(5, 25, 1, 1, C.orange, 'bl')
        }
      },
    },
    {
      id: 'lny-fan',
      name: 'Paper fan',
      note: 'an open red folding fan with gold ribs held high; the fan waves',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sw')
        stamp(f, 17, 1, FAN, { r: RED, R: '#E85A4A', g: GOLD, d: GOLD_D }, 'sw')
      },
    },
    {
      id: 'lny-tangerine',
      name: 'Tangerines',
      note: 'a gold plate piled with leafy tangerines held high; the top one wobbles',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'pl')
        const tang = ['.oo.', 'oooo', 'oOoo', '.oo.']
        stamp(f, 21, 5, tang, { o: C.orange, O: '#F7A64E' }, 'pl')
        stamp(f, 25, 5, tang, { o: C.orange, O: '#F7A64E' }, 'pl')
        stamp(f, 23, 1, ['..ll', '.oo.', 'oooo', 'oOoo', '.oo.'], { o: C.orange, O: '#F7A64E', l: C.green }, 'sh')
        stamp(f, 21, 9, ['ggggggggg'], { g: GOLD }, 'pl')
        f(20, 9, 1, 1, RED, 'pl'); f(29, 9, 1, 1, RED, 'pl')
      },
    },
    {
      id: 'lny-ingot',
      name: 'Gold ingot',
      note: 'a boat-shaped gold ingot held overhead; it gleams',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'ig')
        stamp(f, 19, 3, [
          '....yyy....',
          '...yywyy...',
          'yy.yyyyy.yy',
          'yyyyyyyyyyy',
          'dyyyyyyyyyd',
          '.ddddddddd.',
          '...ddddd...',
        ], { y: GOLD, d: GOLD_D, w: '#FFF6C8' }, 'ig')
        f(19, 1, 1, 1, '#FFFFFF', 'bl'); f(29, 0, 1, 1, '#FFFFFF', 'bl2'); f(28, 1, 1, 1, GOLD, 'bl2')
      },
    },
    {
      id: 'lny-dumpling',
      name: 'Dumplings',
      note: 'a bamboo steamer for a hat and a dumpling in chopsticks; the steam rises',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'ch')
        stamp(f, 8, 3, [
          '....tttttt....',
          '..tttttttttt..',
          '.dddddddddddd.',
          '.tttttttttttt.',
          '.tdtdtdtdtdtd.',
          '.tttttttttttt.',
          'dddddddddddddd',
        ], { t: '#D8B477', d: '#8E6B3A' })
        stamp(f, 11, 0, ['.s....s.', 's....s..', '.s....s.'], { s: '#C9C7C0' }, 'rs')
        stamp(f, 15, 0, ['s.', '.s', 's.'], { s: '#C9C7C0' }, 'rs2')
        f(24, 4, 1, 8, '#6B3F1F', 'ch'); f(27, 4, 1, 8, '#6B3F1F', 'ch')
        stamp(f, 23, 1, ['..p...', '.wpwp.', 'wwwwww', '.gggg.'], { w: C.white, p: C.shade, g: C.shade }, 'ch')
      },
    },
    {
      id: 'lny-horse',
      name: 'Horse',
      note: 'horse ears, forelock, blaze and muzzle with a red bridle, for the Year of the Horse; the tail swishes',
      draw: (f, pose) => {
        const MANE = { m: '#3E2A1A', n: '#6E5440' }
        stamp(f, 1, 12, ['..mm', '.mmn', 'mmn.', 'mn..', 'mn..', 'mmn.', '.mn.'], MANE, 'sh')
        stamp(f, 5, 9, ['.nm', 'nmm', 'nmm', '.mm', '.nm', '..m'], MANE)
        crabBody(f, pose, 0, undefined, '#A8693A')
        stamp(f, 7, 3, [
          '..b..........b..',
          '.bb..........bb.',
          '.bpb........bpb.',
          '.bpb...mm...bpb.',
          '.bpb..mmmm..bpb.',
          '.bbb.mmmmmm.bbb.',
          '.....mmnmmm.....',
          '......mnmm......',
          '......m.mm......',
        ], { b: '#A8693A', p: '#E8B48A', m: '#3E2A1A', n: '#6E5440' })
        stamp(f, 7, 9, ['nm', 'mm', 'mm', 'm.', 'mm', 'm.', 'm.'], { m: '#3E2A1A', n: '#6E5440' })
        f(14, 12, 2, 4, C.white)
        f(7, 15, 16, 1, RED); f(10, 15, 1, 1, GOLD); f(19, 15, 1, 1, GOLD)
        stamp(f, 11, 16, ['.tttttt.', 'tttttttt', 'ttkttktt', '.tttttt.'], { t: '#6B4226', k: '#24170E' })
      },
    },
  ],
}
