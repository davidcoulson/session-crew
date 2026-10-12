// Christmas, Dec 1–26.

import { C, CLAY, INK, crabBody, eyes, fixed, stamp } from './kit'
import type { Holiday, Pose } from './kit'

const SNOW = '#EEEEEA'
const SNOW_D = '#B9B7AE'
const PINE = '#3A9A55'
const PINE_D = '#246B3A'
const PINE_L = '#5CC277'
const GINGER = '#B8733A'

// The crab's claws and legs, for outfits that paint over every part of it.
const parts = (pose: Pose, armCls?: string, armFront = 0): [number, number, number, number, string | undefined][] => [
  [3, pose.isCheering ? 10 : 14, 4, 4, pose.isCheering ? 'ar' : undefined],
  [23, 14 + (pose.isCheering && !armCls ? -4 : armFront), 4, 4, armCls ?? (pose.isCheering ? 'ar' : undefined)],
  [7, 22, 2, 4, 'la'],
  [17, 22, 2, 4, 'la'],
  [11, 22, 2, 4, 'lb'],
  [21, 22, 2, 4, 'lb'],
]

export const CHRISTMAS: Holiday = {
  id: 'christmas',
  name: 'Christmas',
  when: 'Dec 1–26',
  window: fixed([12, 1], [12, 26]),
  outfits: [
    {
      id: 'santa',
      name: 'Santa',
      note: 'red hat with white trim, a white beard and a toy sack over the shoulder; the pompom bounces',
      draw: (f, pose) => {
        // The sack goes on first, behind the body.
        stamp(f, 0, 8, [
          '..gr....',
          '..gr.b..',
          '..ttt...',
          '.sSSSs..',
          'ssssssS.',
          'ssssssS.',
          'ssssssS.',
          'ssssssS.',
          'ssssssS.',
          'ssssssS.',
          '.ssssS..',
        ], { s: '#A8743F', S: '#7A4A26', t: '#5A3519', g: C.green, r: C.red, b: C.blue })
        crabBody(f, pose)
        stamp(f, 6, 1, [
          '.......rrrr..........',
          '.....rrrrrrrrr.......',
          '....rrrrrrrrrrrr.....',
          '...rrrrrrrrrrrrrrr...',
          '...rrrrrrrrrrrrr.rR..',
          '..rrrrrrrrrrrrrr..R..',
          '..rrrrrrrrrrrrrr.....',
          'gwwwwwwwwwwwwwwwwg...',
          'wwwwwwwwwwwwwwwwww...',
        ], { r: C.red, R: C.redD, w: C.white, g: C.shade })
        stamp(f, 23, 7, ['gwg', 'www', 'gwg'], { w: C.white, g: C.shade }, 'up')
        stamp(f, 7, 11, [
          'g..............g',
          'w..............w',
          'ww............ww',
          'wwwwwwwppwwwwwww',
          'wwwwwwwwwwwwwwww',
          'wwwwwwgwwgwwwwww',
          'wwwwwwwwwwwwwwww',
          'gwwwwwwwwwwwwwwg',
          '.gwwwwwwwwwwwwg.',
          '..gwwwwwwwwwwg..',
          '....gwgwwgwg....',
        ], { w: C.white, g: C.shade, p: '#E8907A' })
        eyes(f, pose)
      },
    },
    {
      id: 'elf',
      name: 'Elf',
      note: 'green pointed hat with a bell, pointy ears and a zigzag collar; taps a toy hammer',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sw')
        stamp(f, 4, 9, ['c..', 'cc.', '.cc'], { c: CLAY })
        stamp(f, 23, 9, ['..c', '.cc', 'cc.'], { c: CLAY })
        stamp(f, 7, 1, [
          '...........lg...',
          '..........lgg...',
          '.........lgggg..',
          '.......llgggg...',
          '.....llggggggg..',
          '...llggggggggg..',
          '..lgggggggggggg.',
          'rwrwrwrwrwrwrwrw',
          'rwrwrwrwrwrwrwrw',
        ], { g: C.green, l: '#4FB06A', r: C.red, w: C.white })
        stamp(f, 20, 0, ['.y', 'yY', '.Y'], { y: C.gold, Y: C.goldD }, 'sh')
        stamp(f, 7, 14, ['gRgRgRgRgRgRgRgR', '.g.R.g.R.g.R.g.R'], { g: C.green, R: C.red })
        f(25, 5, 1, 6, '#A0703F', 'sw')
        stamp(f, 23, 2, ['.lllll', 'Sssssl', 'SSSSSs'], { s: C.silver, S: C.gray, l: '#E4E6EA' }, 'sw')
      },
    },
    {
      id: 'reindeer',
      name: 'Reindeer',
      note: 'brown coat, branching antlers and a red nose; the nose glows on and off',
      draw: (f, pose) => {
        const coat = '#9C6438'
        crabBody(f, pose, 0, undefined, coat)
        const a = { a: '#E2C493', A: '#B8945E' }
        stamp(f, 7, 1, ['a..a..', 'a..a.a', 'aa.aaa', '.aaA..', '..aA..', '...A..', '...A..', '...A..', '...A..'], a)
        stamp(f, 17, 1, ['..a..a', 'a.a..a', 'aaa.aa', '..Aaa.', '..Aa..', '..A...', '..A...', '..A...', '..A...'], a)
        stamp(f, 5, 9, ['bb.', 'pbb'], { b: coat, p: '#D99A7A' })
        stamp(f, 23, 9, ['.bb', 'bbp'], { b: coat, p: '#D99A7A' })
        stamp(f, 11, 14, ['.mmmmmm.', 'mmmmmmmm', 'mmmmmmmm', '.mmmmmm.'], { m: '#D8B48A' })
        f(13, 14, 4, 3, C.redD)
        stamp(f, 13, 14, ['rrrr', 'rrrr', '.rr.'], { r: '#FF3B30' }, 'bl')
        f(14, 14, 1, 1, '#FFB0A8', 'bl')
        f(13, 19, 4, 1, INK)
      },
    },
    {
      id: 'snowman',
      name: 'Snowman',
      note: 'snow-white, a top hat, carrot nose, coal smile and a red scarf; the scarf end flutters',
      draw: (f, pose) => {
        // Stick arms, behind the claws.
        stamp(f, 0, 11, ['k..', '.k.', '..k', 'k.k'], { k: '#6B4428' })
        crabBody(f, pose, 0, undefined, SNOW)
        for (const [x, y, w, h, cls] of parts(pose)) {
          f(x, y + h - 1, w, 1, SNOW_D, cls)
          f(x + w - 1, y, 1, h, SNOW_D, cls)
        }
        f(7, 10, 1, 12, SNOW_D); f(22, 10, 1, 12, SNOW_D); f(7, 21, 16, 1, SNOW_D)
        stamp(f, 9, 0, [
          '..llllllll..',
          '..kkkkkkkk..',
          '..kkkkkkkk..',
          '..kkkkkkkk..',
          '..kkkkkkkk..',
          '..rrrrrrrr..',
          '..kkkkkkkk..',
          'lkkkkkkkkkkl',
          'kkkkkkkkkkkk',
        ], { k: C.black, l: C.rim, r: C.red })
        eyes(f, pose)
        stamp(f, 14, 14, ['ooooO', 'oooO.'], { o: C.orange, O: C.orangeD })
        stamp(f, 11, 16, ['k......k', '.k....k.', '..kkkk..'], { k: INK })
        stamp(f, 7, 19, ['rrrrrrrrrrrrrrrr', 'RRRRRRRRRRRRRRRR'], { r: C.red, R: C.redD })
        stamp(f, 17, 21, ['rR', 'rR', 'rR', 'ww'], { r: C.red, R: C.redD, w: C.white }, 'wv')
      },
    },
    {
      id: 'gingerbread',
      name: 'Gingerbread',
      note: 'baked brown with white icing trim and gumdrop buttons; spins a peppermint',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sp', GINGER)
        const ice = C.white
        stamp(f, 7, 10, ['w.w.w.w.w.w.w.w.', '.w.w.w.w.w.w.w.w'], { w: ice })
        stamp(f, 11, 15, ['w......w', '.wwwwww.'], { w: ice })
        f(13, 18, 2, 2, '#E0413A'); f(16, 18, 2, 2, '#3FB45F'); f(13, 18, 1, 1, '#FF8A80'); f(16, 18, 1, 1, '#9BE7A8')
        for (const [x, y, w, h, cls] of parts(pose, 'sp', -4)) f(x, y + h - 2, w, 1, ice, cls)
        stamp(f, 23, 5, ['.rrr.', 'rwrwr', 'rrwrr', 'rwrwr', '.rrr.'], { w: C.white, r: C.red }, 'sp')
      },
    },
    {
      id: 'xmas-tree',
      name: 'Christmas tree',
      note: 'dressed as a fir tree with a gold star on top; the fairy lights twinkle',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 5, 0, [
          '.........ss.........',
          '........ssss........',
          '.........SS.........',
          '........lggg........',
          '.......lggggg.......',
          '......lgggggdg......',
          '.....lgggggggdg.....',
          '.......lgggggg......',
          '......lgggggggg.....',
          '.....lgggggggggg....',
          '....lggggggggggdg...',
          '..llgggggggggggggd..',
          '..lgggggggggggggggg.',
          '..lgggggggggggggggd.',
          '..gggggggggggggggggd',
          '..lggggggggggggggggd',
          '.lggggggggggggggggggd',
          '.lgggggggggggggggggd',
          'lgggggggggggggggggggd',
          'lggggggggggggggggggdd',
          '.ddddddddddddddddddd',
          '......bbbbbbbb......',
        ], { s: C.gold, S: C.goldD, g: PINE, d: PINE_D, l: PINE_L, b: '#7A4A26' })
        eyes(f, pose)
        const lights = { r: '#FF4A3D', y: '#FFE14A', b: '#5AB8FF' }
        stamp(f, 6, 4, [
          '..........', '..........', '......r...', '..........', '..........', '...y......', '..........', '..........',
          '..........', '..b.......', '..........', '..........', '.y........', '..........', '..........', '.r........',
        ], lights, 'bl')
        stamp(f, 12, 4, [
          '..........', '..........', '..........', '.b........', '..........', '..........', '.......r..', '..........',
          '..........', '..........', '..........', '..........', '.......y..', '...r......', '..........', '.....b.y..',
        ], lights, 'bl2')
      },
    },
    {
      id: 'xmas-present',
      name: 'Present',
      note: 'peeking out of a wrapped gift box; the lid and its bow pop up and down',
      draw: (f, pose) => {
        crabBody(f, pose)
        const wrap = { r: C.red, R: '#E8574F', D: C.redD, g: C.gold, G: C.goldD, y: '#FFE38A' }
        stamp(f, 6, 14, [
          'RRRRRRRRggRRRRRRRR',
          'rrrrrrrrggrrrrrrrr',
          'rrrrrrrrggrrrrrrrr',
          'ggggggggyygggggggg',
          'rrrrrrrrggrrrrrrrr',
          'rrrrrrrrggrrrrrrrr',
          'rrrrrrrrggrrrrrrrr',
          'rrrrrrrrggrrrrrrrr',
          'DDDDDDDDGGDDDDDDDD',
        ], wrap)
        stamp(f, 6, 2, [
          '...gggg..gggg.....',
          '..g...gggg...g....',
          '..g...gyyg...g....',
          '...gggg..gggg.....',
          '.....gg..gg.......',
          'RRRRRRRRggRRRRRRRR',
          'rrrrrrrrggrrrrrrrr',
          'DDDDDDDDGGDDDDDDDD',
        ], wrap, 'up')
      },
    },
    {
      id: 'nutcracker',
      name: 'Nutcracker',
      note: 'tall black shako with gold trim, red coat, white moustache and gold buttons; the sabre swings',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sw')
        stamp(f, 9, 0, [
          '.....ww.....',
          '....wwww....',
          '..llllllll..',
          '..kkkkkkkk..',
          '..kkkkyykk..',
          '..kkkyyyyk..',
          '..kkkkyykk..',
          '..kkkkkkkk..',
          '.yyyyyyyyyy.',
          'kkkkkkkkkkkk',
        ], { k: C.black, l: C.rim, y: C.gold, w: C.white })
        stamp(f, 7, 14, [
          '....wwwwwwww....',
          '..wwww....wwww..',
          'rrrrrrrrrrrrrrrr',
          'yyyrrrryyrrrryyy',
          'rrrrrrrrrrrrrrrr',
          'rrrrrrryyrrrrrrr',
          'rrrrrrrrrrrrrrrr',
          'kkkkkkkyykkkkkkk',
        ], { r: C.red, y: C.gold, w: C.white, k: C.black })
        for (const [x, y, w, h, cls] of parts(pose, 'sw', -4).slice(2)) { f(x, y, w, h - 1, C.blue, cls); f(x, y + h - 1, w, 1, C.black, cls) }
        f(25, 1, 1, 8, C.silver, 'sw'); f(26, 1, 1, 8, '#E9EBEF', 'sw')
        f(24, 9, 4, 1, C.gold, 'sw')
      },
    },
    {
      id: 'xmas-skater',
      name: 'Ice skater',
      note: 'a bobble hat and white ice skates; snowflakes drift down',
      draw: (f, pose) => {
        crabBody(f, pose)
        stamp(f, 8, 2, [
          '......ww......',
          '.....wwww.....',
          '......ww......',
          '...rrrrrrrr...',
          '..rrRrrRrrRr..',
          '.rrrrrrrrrrrr.',
          'wswswswswswsws',
          'swswswswswswsw',
        ], { r: C.red, R: C.redD, w: C.white, s: C.shade })
        stamp(f, 7, 16, ['wwrrwwrrwwrrwwrr', 'RRWWRRWWRRWWRRWW'], { w: C.white, W: C.shade, r: C.red, R: C.redD })
        stamp(f, 3, 17, ['rrwwr', '.RW..'], { w: C.white, W: C.shade, r: C.red, R: C.redD }, 'wv')
        for (const [x, , , , cls] of parts(pose).slice(2)) {
          f(x, 23, 2, 2, C.white, cls); f(x + 1, 23, 1, 2, C.shade, cls); f(x, 23, 1, 1, C.red, cls)
          f(x - 1, 26, 4, 1, '#5E626A', cls); f(x - 1, 25, 1, 1, '#5E626A', cls)
        }
        const flake = ['.w.', 'w.w', '.w.']
        stamp(f, 25, 1, flake, { w: '#A9D6F5' }, 'fx')
        stamp(f, 26, 9, flake, { w: '#A9D6F5' }, 'fx2')
        stamp(f, 1, 11, flake, { w: '#A9D6F5' }, 'fx2')
      },
    },
    {
      id: 'candy-cane',
      name: 'Candy cane',
      note: 'striped red and white like a candy cane, with a cane to match; the cane swings',
      draw: (f, pose) => {
        crabBody(f, pose, -4, 'sw', SNOW)
        const stripe = (x0: number, y0: number, w: number, h: number, cls?: string) => {
          for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if ((x + y) % 5 < 2) f(x, y, 1, 1, C.red, cls)
        }
        stripe(7, 10, 16, 12)
        for (const [x, y, w, h, cls] of parts(pose, 'sw', -4)) stripe(x, y, w, h, cls)
        f(7, 21, 16, 1, SNOW_D); f(7, 10, 1, 11, SNOW_D); f(22, 10, 1, 11, SNOW_D)
        eyes(f, pose)
        stamp(f, 24, 0, ['.rww.', 'rR.wW', 'wW.rR', 'wW...', 'rR...', 'rR...', 'wW...', 'wW...', 'rR...', 'rR...', 'wW...', 'wW...'], { r: C.red, R: C.redD, w: C.white, W: C.shade }, 'sw')
      },
    },
  ],
}
