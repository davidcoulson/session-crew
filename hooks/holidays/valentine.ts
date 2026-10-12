// Valentine's Day, Feb 10–14.

import { C, crabBody, eyes, fixed, stamp } from './kit'
import type { Fill, Holiday, Pose } from './kit'

const RED = '#D8293F'
const RED_D = '#9A1530'
const PINK = '#F28CB0'
const PINK_D = '#E0457B'

// Hearts, 3, 5, 7 and 9 wide.
const HEART3 = ['h.h', 'hhh', '.h.']
const HEART5 = ['hh.hh', 'hhhhh', '.hhh.', '..h..']
const HEART7 = ['.hh.hh.', 'hhhhhhh', 'hhhhhhh', '.hhhhh.', '..hhh..', '...h...']
const HEART9 = ['.hhh.hhh.', 'hhhhhhhhh', 'hhhhhhhhh', 'hhhhhhhhh', '.hhhhhhh.', '..hhhhh..', '...hhh...', '....h....']

// A prop held in the back claw: at (3, 14) normally, raised with it in `ar` when cheering.
const backClaw = (pose: Pose, y: number): [number, string | undefined] => (pose.isCheering ? [y - 4, 'ar'] : [y, undefined])

// "XO" for the candy heart.
const XO = ['k.k.kkk', '.k..k.k', 'k.k.kkk']

export const VALENTINE: Holiday = {
  id: 'valentine',
  name: "Valentine's Day",
  when: 'Feb 10–14',
  window: fixed([2, 10], [2, 14]),
  outfits: [
    {
      id: 'vday-cupid',
      name: 'Cupid',
      note: 'little white wings and a bow with a heart-tipped arrow aimed high; floats, and the wings flap',
      float: true,
      draw: (f, pose) => {
        const wing = { w: C.white, g: '#B9B7AE' }
        stamp(f, 1, 6, ['...ggggg', '.ggwwwww', 'gwwwwwww', '.gwgwgww', '..g.g.gw'], wing, 'fp a')
        stamp(f, 21, 6, ['ggggg...', 'wwwwwgg.', 'wwwwwwwg', 'wwgwgwg.', 'wg.g.g..'], wing, 'fp b')
        crabBody(f, pose, -4, 'bow')
        stamp(f, 20, 2, [
          '....bbb....',
          '..bbBBBbb..',
          '.bB.....Bb.',
          'bB.......Bb',
        ].map(r => r.slice(0, 10)), { b: '#B07F2A', B: '#7A4A26' }, 'bow')
        f(21, 5, 8, 1, '#CFC9BA', 'bow')
        f(25, 2, 1, 9, '#7A4A26', 'bow')
        stamp(f, 24, 0, ['h.h', 'hhh', '.h.'], { h: RED }, 'bow')
        stamp(f, 24, 10, ['p.p'], { p: PINK }, 'bow')
      },
    },
    {
      id: 'vday-balloon',
      name: 'Heart balloon',
      note: 'a shiny red heart balloon tied to a raised claw; the balloon bobs',
      draw: (f, pose) => {
        crabBody(f, pose, -4)
        stamp(f, 20, 0, HEART9, { h: RED }, 'up')
        f(22, 1, 2, 1, '#F7A3B5', 'up'); f(21, 2, 1, 1, '#F7A3B5', 'up')
        f(24, 8, 1, 2, C.gray, 'up')
      },
    },
    {
      id: 'vday-roses',
      name: 'Bouquet',
      note: 'red roses wrapped in pink paper with a ribbon, held high; the bouquet sways',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sw')
        stamp(f, 21, 0, [
          '..rr.rr..',
          '.lrRlrRl.',
          'rrlrrlrr.',
          'rRlrRlrRl',
          '.lplpplpl',
          '.ppppppp.',
          '..pPPpp..',
          '..rrrrr..',
          '...ppp...',
          '...pp....',
        ], { r: RED, R: RED_D, l: C.green, p: PINK, P: PINK_D }, 'sw')
      },
    },
    {
      id: 'vday-chocolates',
      name: 'Chocolates',
      note: 'an open heart-shaped box of chocolates with a gold bow, held out; the box jiggles',
      draw: (f, pose) => {
        crabBody(f, pose, 0, 'sh')
        stamp(f, 21, 10, [
          '...ggg...',
          '.RRRgRRR.',
          'RccbRbccR',
          'RccbbbccR',
          'RbbbccbbR',
          '.RbbccbR.',
          '..RcbcR..',
          '...RRR...',
          '....R....',
        ], { R: RED, b: '#F3D9BF', c: '#5A3519', g: C.gold }, 'sh')
      },
    },
    {
      id: 'vday-letter',
      name: 'Love letter',
      note: 'a pink envelope sealed with a red heart, held high; little hearts float out',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'lt')
        stamp(f, 21, 3, [
          'ggggggggg',
          'gwppppwg.',
          'gpwpppwpg',
          'gppwhwppg',
          'gpphhhppg',
          'gppphpppg',
          'ggggggggg',
        ].map(r => r.padEnd(9, '.')), { g: PINK_D, p: '#FBD3E0', w: PINK_D, h: RED }, 'lt')
        stamp(f, 22, 0, HEART3, { h: RED }, 'rs')
        stamp(f, 26, 0, HEART3, { h: PINK_D }, 'rs2')
      },
    },
    {
      id: 'vday-boppers',
      name: 'Heart boppers',
      note: 'a headband with two hearts on springs; the hearts bob about',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 8, 0, HEART5, { h: RED }, 'sw a')
        f(10, 4, 1, 5, C.gray, 'sw a')
        stamp(f, 17, 0, HEART5, { h: RED }, 'sw b')
        f(19, 4, 1, 5, C.gray, 'sw b')
        f(8, 9, 14, 1, PINK_D); f(7, 10, 1, 2, PINK_D); f(22, 10, 1, 2, PINK_D)
        f(9, 0, 1, 1, '#F7A3B5', 'sw a'); f(18, 0, 1, 1, '#F7A3B5', 'sw b')
      },
    },
    {
      id: 'vday-lovebird',
      name: 'Lovebird',
      note: 'a peach-faced lovebird perched on the head; a heart floats up from it',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 11, 3, [
          '......oo..',
          '.....ookor',
          '....ooooo.',
          '..ggggGg..',
          '.gggGGgg..',
          'bgggggg...',
          'bb.y.y....',
        ], { o: '#F29C6B', k: C.black, r: '#D8293F', g: '#5DBB63', G: '#3E8E47', b: '#3B7DD8', y: '#E8A33A' })
        stamp(f, 22, 1, HEART5, { h: RED }, 'rs')
        f(21, 4, 1, 1, PINK_D, 'rs2')
      },
    },
    {
      id: 'vday-glasses',
      name: 'Heart glasses',
      note: 'big pink heart-shaped glasses; the hearts throb',
      draw: (f, pose) => {
        crabBody(f, pose)
        const g: Fill = (x, y, w, h, c) => f(x, y, w, h, c, 'pf')
        const lens = ['.rr..rr.', 'rpprrppr', 'rwpppppr', '.rpppppr.'.slice(0, 8), '..rppr..', '...rr...']
        stamp(g, 6, 10, lens, { r: RED, p: PINK, w: '#FFFFFF' })
        stamp(g, 16, 10, lens, { r: RED, p: PINK, w: '#FFFFFF' })
        g(14, 11, 2, 1, RED)
        eyes(g, pose)
      },
    },
    {
      id: 'vday-rose',
      name: 'Rose in teeth',
      note: 'a flat-brimmed tango hat and a red rose clenched in the teeth; the rose tilts',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 6, 4, [
          '...llllllllllll...',
          '...lkkkkkkkkkkl...',
          '...lkkkkkkkkkkl...',
          '...rrrrrrrrrrrr...',
          'llkkkkkkkkkkkkkkll',
          'kkkkkkkkkkkkkkkkkk',
        ], { k: '#2C2833', l: '#5E5870', r: RED })
        stamp(f, 12, 15, [
          '........rr..',
          '.......rRrr.',
          'sssssssrrRr.',
          '...l...lrr..',
          '..ll........',
        ], { s: C.green, l: C.greenD, r: RED, R: RED_D }, 'tl')
      },
    },
    {
      id: 'vday-candy',
      name: 'Candy hearts',
      note: 'a big pastel candy heart saying XO in the back claw; little candy hearts tumble down',
      draw: (f, pose) => {
        crabBody(f, pose)
        const [y, cls] = backClaw(pose, 11)
        stamp(f, 0, y, HEART9.map(r => r.replace(/h/g, 'p')), { p: '#F7C6D6' }, cls)
        stamp(f, 1, y + 2, XO, { k: PINK_D }, cls)
        f(0, y + 1, 1, 3, '#E7A5BC', cls)
        stamp(f, 24, 2, HEART3, { h: '#BDE6C8' }, 'fx')
        stamp(f, 21, 5, HEART3, { h: '#FBE29A' }, 'fx2')
        stamp(f, 26, 7, HEART3, { h: '#C9B8F0' }, 'fx2')
      },
    },
  ],
}
