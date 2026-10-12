// Halloween, Oct 15–31.

import { C, INK, crabBody, eyes, fixed, stamp } from './kit'
import type { Holiday } from './kit'

const HAT = '#2E2440'
const HAT_RIM = '#54457A'

export const HALLOWEEN: Holiday = {
  id: 'halloween',
  name: 'Halloween',
  when: 'Oct 15–31',
  window: fixed([10, 15], [10, 31]),
  outfits: [
    {
      id: 'witch',
      name: 'Witch',
      note: 'pointed hat with a buckle; sweeps the broom',
      css: '.c-h-witch.run .br{transform-origin:50% 65%;animation:hsw .5s ease-in-out infinite}',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 6, 0, [
          '...........kk.....',
          '..........kkk.....',
          '.........lkkk.....',
          '........lkkkkk....',
          '........lkkkkk....',
          '.......lkkkkkkk...',
          '.......ppgggppp...',
          '.......ppgpgppp...',
          '......lkkkkkkkkk..',
          'llkkkkkkkkkkkkkkkk',
        ], { k: HAT, l: HAT_RIM, p: C.purple, g: C.gold })
        f(27, 3, 1, 14, '#8B5A2B', 'br')
        stamp(f, 25, 17, ['.ppp.', '.sSs.', 'sSsSs', 'sSsSs', 's.s.s'], { p: C.purple, s: '#D9A441', S: '#B07F2A' }, 'br')
      },
    },
    {
      id: 'vampire',
      name: 'Vampire',
      note: 'high collar lined in red, slick hair, fangs; a bat flaps overhead',
      draw: (f, pose) => {
        // The cape goes on first, behind the body.
        stamp(f, 4, 5, ['k..', 'kk.', 'kkk', 'kkr', 'kkr', 'kkr', 'kkr', 'kkr', 'kkr', 'kkr', 'kkr', 'kk.', 'k..'], { k: C.black, r: C.red })
        stamp(f, 23, 5, ['..k', '.kk', 'kkk', 'rkk', 'rkk', 'rkk', 'rkk', 'rkk', 'rkk', 'rkk', 'rkk', '.kk', '..k'], { k: C.black, r: C.red })
        f(4, 5, 1, 3, C.rim); f(25, 5, 1, 3, C.rim)
        crabBody(f, pose)
        f(7, 10, 16, 2, INK); f(14, 12, 2, 1, INK); f(10, 10, 3, 1, '#3E3A46')
        f(12, 16, 6, 1, INK); f(12, 17, 1, 2, '#fff'); f(17, 17, 1, 2, '#fff')
        f(14, 19, 2, 2, C.gold); f(14, 19, 1, 1, C.red)
        stamp(f, 23, 1, ['..k.k..', 'k.kkk.k', 'kkkkkkk', '.k.k.k.'], { k: '#3B3050' }, 'up')
      },
    },
    {
      id: 'mummy',
      name: 'Mummy',
      note: 'wrapped head to legs; a loose end flutters',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 7, 10, [
          'wwwwwwwwwwwwwwww',
          'gwwwwww..wwwwwww',
          '....wwwwww......',
          '.....wwwwww.....',
          'wwwwwwwwwwwwwwgg',
          'gggwwwwwwwwwwwww',
          '..........wwwwww',
          'wwwwwwwwwwww....',
          'wwwwwwwwwwwwwwww',
          '....wwwwwwwwwwww',
          'wwwwwwwwwwww....',
          'gwwwwwwwwwwwwwwg',
        ], { w: '#ECE6D6', g: '#C9C1AC' })
        eyes(f, pose)
        f(pose.isCheering ? 3 : 3, pose.isCheering ? 11 : 15, 4, 1, '#ECE6D6', pose.isCheering ? 'ar' : undefined)
        f(23, 16, 4, 1, '#ECE6D6')
        for (const [x, c] of [[7, 'la'], [17, 'la'], [11, 'lb'], [21, 'lb']] as const) f(x, 23, 2, 1, '#ECE6D6', c)
        stamp(f, 0, 19, ['www', '..w', '..w'], { w: '#ECE6D6' }, 'wv')
      },
    },
    {
      id: 'pumpkin',
      name: "Jack-o'-lantern",
      note: 'a carved pumpkin for a hat; the candle inside flickers',
      draw: (f, pose) => {
        crabBody(f, pose)
        const rows = [
          '......gg......',
          '......g.......',
          '...ooOooOoo...',
          '.ooooOooOoooo.',
          'ooyyoOooOoyyoo',
          'oooyoOooOoyooo',
          'oyooooooooooyo',
          'oyyyyoyyoyyyyo',
          '.ooyyyyyyyyoo.',
          '..ooOooooOoo..',
        ]
        stamp(f, 8, 0, rows, { o: C.orange, O: C.orangeD, g: '#4E7A2A', y: '#5A2A08' })
        stamp(f, 8, 0, rows, { y: C.flame }, 'fk')
      },
    },
    {
      id: 'ghost',
      name: 'Ghost',
      note: 'a bedsheet with eye holes; floats instead of walking',
      float: true,
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 4, 6, [
          '.......gwwwwwwg.......',
          '.....gwwwwwwwwwwg.....',
          '...gwwwwwwwwwwwwwwg...',
          '..gwwwwwwwwwwwwwwwwg..',
          '.gwwwwwwwwwwwwwwwwwwg.',
          '.gwwwwwwwwwwwwwwwwwwg.',
          '.gwwwwwwwwwwwwwwwwwwg.',
          '.gwwwwwwwwwwwwwwwwwwg.',
          'gwwwwwwwwwwwwwwwwwwwwg',
          'gwwwwwwwwwwwwwwwwwwwwg',
          'gwwwwwwwwwwwwwwwwwwwwg',
          'gwwwwwwwwwwwwwwwwwwwwg',
          '.gwwwwwwwwwwwwwwwwwwg.',
          '.gwwwwwwwwwwwwwwwwwwg.',
          '.gwwwwwwwwwwwwwwwwwwg.',
          '.gwwwwwwwwwwwwwwwwwwg.',
          '.gww.gww.gww.gww.gwwg.',
          '.gg...g...g...g...gg..',
        ], { w: C.white, g: '#B9B7AE' })
        eyes(f, pose)
        if (pose.eyes === 'open') { f(9, 14, 2, 1, INK); f(19, 14, 2, 1, INK) }
        f(14, 17, 2, 2, INK)
      },
    },
    {
      id: 'frankenstein',
      name: 'Frankenstein',
      note: 'green skin, flat-top hair, neck bolts and a stitched scar; the bolts spark',
      draw: (f, pose) => {
        crabBody(f, pose, -4, undefined, '#86A960')
        stamp(f, 7, 6, [
          'llllllllllllllll',
          'kkkkkkkkkkkkkkkk',
          'kkkkkkkkkkkkkkkk',
          'kkkkkkkkkkkkkkkk',
          'k.kk.kkk.kk.kk.k',
        ], { k: '#24302A', l: '#3E4A40' })
        stamp(f, 12, 15, ['k.k.k.', 'kkkkkk', '.k.k.k'], { k: '#3A4A2A' })
        f(4, 17, 1, 2, '#5E626A'); f(5, 17, 2, 2, C.gray)
        f(23, 17, 2, 2, C.gray); f(25, 17, 1, 2, '#5E626A')
        for (const [x, c] of [[7, 'la'], [17, 'la'], [11, 'lb'], [21, 'lb']] as const) f(x, 25, 2, 1, '#2A2A2C', c)
        f(3, 16, 1, 1, '#FFE66A', 'bl'); f(2, 18, 1, 1, '#FFE66A', 'bl2')
        f(26, 16, 1, 1, '#FFE66A', 'bl2'); f(27, 18, 1, 1, '#FFE66A', 'bl')
      },
    },
    {
      id: 'skeleton',
      name: 'Skeleton',
      note: 'a skull for a body, bone legs and claws; the teeth chatter',
      draw: (f, pose) => {
        const bone = '#EDEBE4'
        // Darker bone for the legs and claws, which stand on the light background alone.
        crabBody(f, pose, 0, undefined, '#D3CCBA')
        f(7, 10, 16, 12, C.black)
        f(7, 10, 16, 1, C.rim)
        f(8, 11, 4, 4, bone); f(18, 11, 4, 4, bone)
        eyes(f, pose)
        f(14, 15, 2, 2, bone); f(14, 16, 1, 1, C.black)
        stamp(f, 10, 18, ['wwwwwwwwww', 'w.w.w.w.w.'], { w: bone }, 'sh')
      },
    },
    {
      id: 'cat',
      name: 'Black cat',
      note: 'cat ears, pink nose and whiskers; the tail swishes',
      draw: (f, pose) => {
        stamp(f, 23, 3, ['...kkl', '..kkll', '..kl..', '...kl.', '....kl', '....kl', '...kl.', '..kl..', 'kkl...'], { k: '#2E2A35', l: '#6E6684' }, 'sh')
        crabBody(f, pose)
        stamp(f, 7, 4, [
          'l..............l',
          'kl............lk',
          'kkk..........kkk',
          'kpkk........kkpk',
          'kppk........kppk',
          'kkkkkkkkkkkkkkkk',
        ], { k: '#2E2A35', l: '#6E6684', p: C.pink })
        f(14, 15, 2, 1, '#E07A95'); f(13, 16, 1, 1, INK); f(16, 16, 1, 1, INK); f(14, 17, 2, 1, INK)
        for (const y of [15, 17]) { f(8, y, 3, 1, '#F6DCCB'); f(19, y, 3, 1, '#F6DCCB') }
      },
    },
    {
      id: 'trickortreat',
      name: 'Trick-or-treater',
      note: 'a domino mask and a pumpkin pail; candy bounces in the pail',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 8, 11, ['.mmmm....mmmm.', 'mmmmmmmmmmmmmm', 'mmmmmm..mmmmmm', '.mmm......mmm.'], { m: C.purple })
        f(7, 12, 1, 1, '#5A3590'); f(22, 12, 1, 1, '#5A3590')
        eyes(f, pose)
        stamp(f, 23, 15, ['..hhh..', '.h...h.', 'ooooooo', 'oyoooyo', 'oooOooo', 'oyyyyyo', '.ooooo.'], { h: C.gray, o: C.orange, O: C.orangeD, y: '#5A2A08' }, 'swt')
        f(25, 16, 1, 1, '#E04848', 'up'); f(27, 15, 1, 1, '#3BA0E0', 'up2'); f(26, 16, 1, 1, C.gold, 'up2')
      },
    },
    {
      id: 'bat',
      name: 'Bat',
      note: 'leathery wings and little ears; the wings flap',
      draw: (f, pose) => {
        crabBody(f, pose)
        const wing = { k: '#3A2E52', r: '#5C4A80' }
        stamp(f, 0, 6, ['.....kk', '...kkkk', '.kkkkkk', 'kkkkkkk', 'krkkrkk', 'krkkrkk', 'k.kk.kk', '...k..k'], wing, 'fp')
        stamp(f, 23, 6, ['kk.....', 'kkkk...', 'kkkkkk.', 'kkkkkkk', 'kkrkkrk', 'kkrkkrk', 'kk.kk.k', 'k..k...'], wing, 'fp')
        stamp(f, 9, 6, ['.r........r.', 'kk........kk', 'kkk......kkk', 'kkk......kkk'], { k: '#3A2E52', r: '#5C4A80' })
        f(13, 16, 1, 2, '#fff'); f(16, 16, 1, 2, '#fff')
      },
    },
    {
      id: 'werewolf',
      name: 'Werewolf',
      note: 'wolf ears, shaggy fur and fangs under a full moon; the fur bristles',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 24, 0, ['.mmm.', 'mmmmm', 'mmMmm', 'mmmMm', '.mmm.'], { m: '#F3E9B5', M: '#D8CB8A' })
        stamp(f, 7, 5, [
          'b..............b',
          'bb............bb',
          'bnb..........bnb',
          'bnbb........bbnb',
          'bbbbfffffffbbbbb',
        ], { b: '#6B4A2E', n: '#C99A7A', f: '#8A6240' })
        stamp(f, 7, 10, ['f.ff.ff..ff.ff.f'], { f: '#8A6240' }, 'sh')
        stamp(f, 6, 14, ['f', 'ff', 'f', 'ff'], { f: '#8A6240' })
        stamp(f, 22, 14, ['.f', 'ff', '.f', 'ff'], { f: '#8A6240' })
        f(13, 17, 1, 2, '#fff'); f(16, 17, 1, 2, '#fff'); f(14, 15, 2, 1, INK)
      },
    },
    {
      id: 'devil',
      name: 'Little devil',
      note: 'red horns, a pointed tail and a pitchfork that pokes',
      draw: (f, pose) => {
        stamp(f, 0, 16, ['.R.....', 'RRR....', '.r.....', '.r.....', '..rrrrr'], { r: C.red, R: C.redD })
        crabBody(f, pose, -4, 'up')
        stamp(f, 8, 6, ['r...........r.', 'rr..........rr', '.rr........rr.', '.rr........rr.'], { r: C.red })
        f(8, 6, 1, 1, C.redD); f(21, 6, 1, 1, C.redD)
        stamp(f, 25, 0, ['r.r.r', 'r.r.r', 'rrrrr', '..r..'], { r: C.red }, 'up')
        f(27, 4, 1, 16, '#5A3519', 'up')
      },
    },
  ],
}
