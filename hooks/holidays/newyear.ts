// New Year's Eve, Dec 29 – Jan 2.

import { C, crabBody, fixed, stamp } from './kit'
import type { Fill, Holiday } from './kit'

// 3×5 digits for the year headband.
const DIGITS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '..#', '..#'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
}

// The year the coming midnight brings: next year from July on, this year until then.
const comingYear = (): string => {
  const now = new Date()
  return String(now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear())
}

const CONFETTI = ['#E0457B', '#3BA0E0', C.gold, '#4CC38A', '#9A6BE0']

const balloon = (f: Fill, x: number, y: number, c: string, hi: string, edge: string, cls: string) =>
  stamp(f, x, y, ['.eee.', 'eccce', 'ehcce', 'eccce', 'eccce', '.ece.', '..e..'], { c, h: hi, e: edge }, cls)

export const NEW_YEAR: Holiday = {
  id: 'newyear',
  name: "New Year's Eve",
  when: 'Dec 29 – Jan 2',
  window: fixed([12, 29], [1, 2]),
  outfits: [
    {
      id: 'nye-hat',
      name: 'Party hat',
      note: 'a spotted cone hat with a pompom and a party horn; the horn unrolls',
      css: '.c-h-nye-hat.run .hn{transform-origin:0 50%;animation:nyehn .5s steps(1) infinite}@keyframes nyehn{50%{transform:scaleX(.3)}}',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 10, 0, [
          '....pp....',
          '...pPPp...',
          '....pp....',
          '....bb....',
          '...bybb...',
          '...bbbb...',
          '..bbbbyb..',
          '..bybbbb..',
          '.yyyyyyyy.',
        ], { p: '#E0457B', P: '#F28CB0', b: '#3B7DD8', y: C.gold })
        f(15, 17, 2, 2, C.white)
        stamp(f, 17, 16, [
          'ppyyppyyppyyw',
          'ppyyppyyppyyw',
        ], { p: '#E0457B', y: C.gold, w: '#F28CB0' }, 'hn')
        f(29, 15, 1, 1, '#F28CB0', 'hn'); f(29, 18, 1, 1, '#F28CB0', 'hn')
      },
    },
    {
      id: 'nye-tophat',
      name: 'Top hat',
      note: 'a top hat with a gold band, a bow tie and a raised champagne flute; the bubbles rise',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'gl')
        stamp(f, 8, 0, [
          '..llllllllll..',
          '..lkkkkkkkhl..',
          '..lkkkkkkkhl..',
          '..lkkkkkkkhl..',
          '..lkkkkkkkhl..',
          '..gggggggggg..',
          '..lkkkkkkkhl..',
          'llkkkkkkkkkkll',
          'lkkkkkkkkkkkkl',
        ], { k: '#2C2833', l: '#5E5870', h: '#45404F', g: C.gold })
        stamp(f, 12, 18, ['kk..kk', 'kkkkkk', 'kk..kk'], { k: C.black })
        f(14, 19, 2, 1, C.rim)
        stamp(f, 23, 1, [
          '.g...g',
          '.gyyyg',
          '.gyyyg',
          '.gyyyg',
          '..gyg.',
          '...g..',
          '...g..',
          '...g..',
          '..ggg.',
        ], { g: '#9FB4C2', y: '#F2CF5B' }, 'gl')
        f(25, 3, 1, 1, '#FFF8DC', 'rs'); f(26, 2, 1, 1, '#FFF8DC', 'rs2'); f(26, 4, 1, 1, '#FFF8DC', 'rs2')
      },
    },
    {
      id: 'nye-sparkler',
      name: 'Sparkler',
      note: 'a blue bobble hat and a lit sparkler held high; the sparks crackle',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'spk')
        stamp(f, 9, 2, [
          '.....ww.....',
          '.....ww.....',
          '...bbbbbb...',
          '..bbbbbbbb..',
          '.bbbbbbbbbb.',
          'wwwwwwwwwwww',
          'wbwbwbwbwbwb',
        ], { b: '#3B6FC8', w: C.white })
        f(25, 6, 1, 6, C.gray, 'spk')
        f(25, 9, 1, 3, '#5A5A5E', 'spk')
        stamp(f, 22, 0, [
          'o..y..o',
          '.o.y.o.',
          '..yWy..',
          'yyWWWyy',
          '..yWy..',
          '.o.y.o.',
          'o..y..o',
        ], { o: C.orange, y: C.flame, W: '#FFFFFF' }, 'bl')
        stamp(f, 22, 0, [
          '...o...',
          '.y...y.',
          '..yWy..',
          'o.WWW.o',
          '..yWy..',
          '.y...y.',
          '...o...',
        ], { o: C.orange, y: C.flame, W: '#FFFFFF' }, 'bl2')
      },
    },
    {
      id: 'nye-clock',
      name: 'Midnight clock',
      note: 'an alarm clock held up with both hands at twelve; it rings and shakes',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sh')
        stamp(f, 21, 0, [
          '.bb...bb.',
          'bbbb.bbbb',
          '..rrrrr..',
          '.rwwkwwr.',
          'rwwwkwwwr',
          'rwwwkwwwr',
          'rkwwkwwkr',
          'rwwwwwwwr',
          '.rwwkwwr.',
          '..rrrrr..',
          '.r.....r.',
        ], { b: C.gold, r: C.red, w: C.white, k: C.black }, 'sh')
        f(25, 1, 1, 1, C.goldD, 'sh')
      },
    },
    {
      id: 'nye-disco',
      name: 'Disco ball',
      note: 'a mirror ball hangs overhead, throwing coloured spots on the crab; the ball turns',
      draw: (f, pose) => {
        crabBody(f, pose)
        f(15, 0, 1, 1, C.gray)
        const ball = (rows: string[], cls?: string) =>
          stamp(f, 11, 1, rows, { m: '#DDE0E6', M: '#8E929A', w: '#FFFFFF' }, cls)
        ball([
          '...MmM...',
          '.MmMmMmM.',
          '.mMmMmwm.',
          'MmMmMmMmM',
          'mMmMmMmMm',
          'MmMmMmMmM',
          '.mMmMmMm.',
          '.MmMmMmM.',
          '...mMm...',
        ])
        ball([
          '...mMm...',
          '.mMmMmMm.',
          '.MmMmMwM.',
          'mMmMmMmMm',
          'MmMmMmMmM',
          'mMmMmMmMm',
          '.MmMmMmM.',
          '.mMmMmMm.',
          '...MmM...',
        ], 'bl')
        f(8, 17, 2, 2, '#F28CB0', 'bl'); f(19, 16, 2, 2, '#8EE0F0', 'bl'); f(24, 6, 1, 1, C.flame, 'bl')
        f(13, 19, 2, 2, C.flame, 'bl2'); f(20, 19, 2, 2, '#F28CB0', 'bl2'); f(23, 2, 1, 1, '#F28CB0', 'bl2')
      },
    },
    {
      id: 'nye-popper',
      name: 'Confetti popper',
      note: 'a striped party popper held high; the confetti bursts up',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'pop')
        stamp(f, 22, 4, [
          'yyyyyyy',
          'yrryrry',
          '.yrryr.',
          '.ryrry.',
          '..rry..',
          '..yrr..',
          '...k...',
        ], { y: C.gold, r: C.red, k: C.black }, 'pop')
        // Streamers fan out of the mouth; confetti flies.
        stamp(f, 19, 0, [
          'b.......g..',
          '.b..p..g...',
          '.b..p.g....',
          '..b.p.g..pp',
          '...bpg..p..',
        ], { b: '#3BA0E0', p: '#E0457B', g: '#4CC38A' }, 'pop')
        const bits = (pts: [number, number, number][], cls: string) =>
          pts.forEach(([x, y, c]) => f(x, y, 2, 1, CONFETTI[c] ?? C.gold, cls))
        bits([[21, 2, 2], [25, 0, 4], [28, 1, 2]], 'rs')
        bits([[18, 3, 4], [24, 2, 2], [27, 4, 4]], 'rs2')
      },
    },
    {
      id: 'nye-tiara',
      name: 'Glitter tiara',
      note: 'a jewelled gold tiara and a pink feather boa; the tiara glitters',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 9, 3, [
          '.....gg.....',
          '.g...gg...g.',
          '.g..gppg..g.',
          'gggggppggggg',
          'gbggggggggbg',
          'DDDDDDDDDDDD',
        ], { g: C.gold, D: C.goldD, p: '#E0457B', b: '#3BA0E0' })
        f(14, 1, 2, 1, '#FFFFFF', 'bl'); f(10, 2, 1, 1, '#FFFFFF', 'bl2'); f(19, 2, 1, 1, '#FFFFFF', 'bl')
        stamp(f, 5, 9, [
          '.pPpPpPpPpPpPpPpPpP.',
          'pPpPpPpPpPpPpPpPpPpP',
          'Pp................pP',
          'pP................Pp',
          '.p................p.',
        ], { p: '#F28CB0', P: '#E0457B' })
      },
    },
    {
      id: 'nye-year',
      name: 'Year headband',
      note: 'a headband with the coming year on springs; the digits bob',
      draw: (f, pose) => {
        crabBody(f, pose)
        ;[...comingYear()].forEach((d, i) => {
          const x = 8 + i * 4
          const cls = i % 2 ? 'up2' : 'up'
          stamp(f, x, 1, DIGITS[d] ?? [], { '#': C.gold }, cls)
          f(x + 1, 6, 1, 3, C.gray, cls)
        })
        f(8, 8, 14, 1, C.rim); f(8, 9, 14, 1, C.black)
      },
    },
    {
      id: 'nye-fireworks',
      name: 'Fireworks',
      note: 'fireworks burst overhead in gold and pink; the bursts pop',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 20, 0, [
          '....y....',
          '.y..y..y.',
          '..y.y.y..',
          '...yWy...',
          'yyyyWyyyy',
          '...yWy...',
          '..y.y.y..',
          '.y..y..y.',
          '....y....',
        ], { y: C.gold, W: '#FFFFFF' }, 'pf')
        stamp(f, 10, 0, [
          '..p..',
          'p.p.p',
          '.pWp.',
          'ppWpp',
          '.pWp.',
          'p.p.p',
          '..p..',
        ], { p: '#E0457B', W: '#FFFFFF' }, 'pf b')
      },
    },
    {
      id: 'nye-balloons',
      name: 'Balloon bunch',
      note: 'gold, silver and black balloons tied to a raised claw; the balloons bob',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        balloon(f, 22, 0, '#2C2833', '#6E6684', '#5E5870', 'up2')
        f(24, 7, 1, 3, C.gray, 'up2')
        balloon(f, 18, 2, C.gold, '#FFF2B8', C.goldD, 'up')
        f(21, 9, 3, 1, C.gray, 'up')
        balloon(f, 25, 2, C.silver, '#FFFFFF', C.gray, 'up')
        f(26, 9, 1, 1, C.gray, 'up')
      },
    },
  ],
}
