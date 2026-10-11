// The strip above the prompt, drawn: a card per session, the crab beside its
// label and a status pill under it. Pure: no \$ here, so tests and previews can
// draw it too.

import { CRAB_CSS, crab } from './crab'
import type { CrabPose } from './crab'
import { pillText, stripShown } from './parse'
import type { StripItem, StripPose } from './parse'

export const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

export const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

/** Text colours for light and dark: `t` primary, `s` secondary, `ln` rules. */
export const CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.ln{stroke:#e4e4e1}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.ln{stroke:#333331}}
</style>`

// --- the strip above the prompt: a card per session, the crab beside its label
// and a status pill under it. The pill is the signal; colour is never the only
// cue (each pill has its icon and its words).

const STRIP_FONT_LABEL = 12.5
const STRIP_FONT_PILL = 10.5

const PILL_CLASS: Record<StripPose, string> = { needs: 'pn', working: 'pw', idle: 'pi', done: 'pd', finished: 'pd' }

// The pill's own colours, light and dark: needs-you is solid, the rest tinted.
export const PILL_CSS = `<style>
.pw rect{fill:#E3EEFB}.pw text{fill:#1F5FA8}.pw .ic{fill:#378ADD}
.pn rect{fill:#D85A30}.pn text{fill:#fff}.pn .ic{fill:#fff}
.pi rect{fill:#EEEDEA}.pi text{fill:#5f5f5b}.pi .ic{fill:#8a8a86}
.pd rect{fill:#E2F3E7}.pd text{fill:#2B7446}.pd .ick{stroke:#3B9C5F}
@media (prefers-color-scheme: dark){
.pw rect{fill:#1E3550}.pw text{fill:#A9CCF5}.pw .ic{fill:#6AAEF0}
.pn rect{fill:#E0683E}
.pi rect{fill:#2E2E2C}.pi text{fill:#B5B5B0}.pi .ic{fill:#8f8f8a}
.pd rect{fill:#1F3B29}.pd text{fill:#98D8AE}.pd .ick{stroke:#6CC28A}}
.pulse{animation:pulse 1.2s ease-in-out infinite}@keyframes pulse{50%{opacity:.35}}
.muted{opacity:.72}
@media (prefers-reduced-motion: reduce){.pulse{animation:none}}
</style>`

const CRAB_POSE: Record<StripPose, CrabPose> = { needs: 'waiting', working: 'working', idle: 'idle', done: 'done', finished: 'finished' }

// The pill's icon, drawn, in a 10×10 box at (x, y).
function pillIcon(pose: StripPose, x: number, y: number): string {
  if (pose === 'working') return `<circle class="ic pulse" cx="${x + 4}" cy="${y + 5}" r="3.2"/>`
  if (pose === 'needs') return `<text class="ic" x="${x + 2.5}" y="${y + 9}" font-family="${FONT}" font-size="11" font-weight="800">!</text>`
  if (pose === 'idle') return `<text class="ic" x="${x + 1}" y="${y + 8.5}" font-family="${FONT}" font-size="10" font-weight="700">z</text>`
  return `<path class="ick" d="M${x + 1} ${y + 5.2}l2.6 2.6 5.2-5.6" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** Rough width of system UI text in px; `bold` for the semibold labels and pills, which run wider. */
export const textW = (text: string, size: number, bold = false): number =>
  [...text].reduce((w, ch) => w + emOf(ch) * size, 0) * (bold ? 1.14 : 1)

// CJK, kana, Hangul, full-width forms and emoji take about a full em.
const isWide = (ch: string): boolean => {
  const c = ch.codePointAt(0) ?? 0
  return (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6) || c >= 0x1f000
}

const emOf = (ch: string): number => (isWide(ch) ? 1.05 : /[\sil.,:;'|!()]/.test(ch) ? 0.3 : /[A-Z@%#mw]/.test(ch) ? 0.72 : 0.56)

const pillWidth = (pill: string): number => Math.ceil(textW(pill, STRIP_FONT_PILL, true) + 24)

export type Card = { item: StripItem; label: string; costume: string; title: string; pill: string; width: number }

export function cardOf(item: StripItem, label: string, costume: string, at: number, scale: number): Card {
  // The pill's icon is its check mark: the words needn't repeat it.
  const pill = pillText(item, at).replace(/ ✓$/, '')
  const crabW = 30 * scale
  const width = Math.ceil(crabW + 8 + Math.max(textW(label, STRIP_FONT_LABEL, true), pillWidth(pill)) + 16)
  const s = item.session
  const title = `${s.title || s.name} (${s.name}): ${pillText(item, at)}`
  return { item, label, costume, title, pill, width }
}

function cardSvg(c: Card, x: number, H: number, scale: number): string {
  const { pose } = c.item
  const crabH = 28 * scale
  const tx = x + 30 * scale + 8
  const pillW = pillWidth(c.pill)
  const muted = pose === 'finished' ? ' class="muted"' : ''
  return `<g${muted}><title>${xml(c.title)}</title>
${crab(x, (H - crabH) / 2, c.costume, CRAB_POSE[pose], scale)}
<text class="t" x="${tx}" y="${H / 2 - 4}" font-family="${FONT}" font-size="${STRIP_FONT_LABEL}" font-weight="600">${xml(c.label)}</text>
<g class="${PILL_CLASS[pose]}"><rect x="${tx}" y="${H / 2 + 2}" width="${pillW}" height="16" rx="8"/>${pillIcon(pose, tx + 5, H / 2 + 5)}<text x="${tx + 17}" y="${H / 2 + 13.5}" font-family="${FONT}" font-size="${STRIP_FONT_PILL}" font-weight="600">${xml(c.pill)}</text></g></g>`
}

export function bandSvg(W: number, cards: Card[], more: number, scale: number): { source: string; width: number; height: number } {
  const H = Math.max(44, Math.round(28 * scale + 8))
  let x = 0
  const parts: string[] = []
  for (const c of cards) {
    parts.push(cardSvg(c, x, H, scale))
    x += c.width
  }
  if (more) {
    const t = `+${more} more`
    parts.push(`<text class="s" x="${x + 4}" y="${H / 2 + 4}" font-family="${FONT}" font-size="12" font-weight="500">${t}</text>`)
    x += textW(t, 12) + 10
  }
  const width = Math.min(W, Math.ceil(Math.max(x, 60)))
  return { source: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">${CSS}${CRAB_CSS}${PILL_CSS}${parts.join('')}</svg>`, width, height: H }
}

/**
 * The strip and its summary for a band `W` px wide: the full summary
 * ("4 sessions · 2 working · …") when the cards all fit beside it, else the
 * counts alone ("● 2  ! 1"), whichever shows more cards.
 */
export function layoutStrip(W: number, items: StripItem[], make: (i: StripItem) => Card, scale: number, summary: (isNarrow: boolean) => string): { band: ReturnType<typeof bandSvg>; summary: string; shown: number } {
  const tryWith = (isNarrow: boolean) => {
    const text = summary(isNarrow)
    const room = W - textW(text, 13) - 24
    // Narrow, no card is forced: the counts and "+N more" alone, rather than a row wider than the band.
    const { cards, more } = fitCards(room, items, make, isNarrow ? 0 : 1)
    const band = bandSvg(Math.max(60, room), cards, more, scale)
    return { band, summary: text, shown: cards.length, more, fits: band.width + textW(text, 13) + 24 <= W }
  }
  const full = tryWith(false)
  if (!full.more && full.fits) return full
  const narrow = tryWith(true)
  if (narrow.shown === 0) {
    // Too narrow for a card beside even the counts: one card, as wide as the band allows, and the
    // counts wrap onto their own line (the desktop wraps a band's siblings), rather than no crab at all.
    const { cards, more } = fitCards(W, items, make, 1)
    return { band: bandSvg(W, cards, more, scale), summary: narrow.summary, shown: cards.length }
  }
  if (!full.fits) return narrow
  return narrow.shown > full.shown ? narrow : full
}

/** As many cards as fit `W`, in the strip's order (stripShown picks which when there are many). */
export function fitCards(W: number, items: StripItem[], make: (i: StripItem) => Card, least = 1): { cards: Card[]; more: number } {
  const all = items.map(make)
  let fit = 0
  let used = 0
  for (const c of all) {
    // Room is kept for the "+N more" after them.
    if (used + c.width > W - 70) break
    used += c.width
    fit++
  }
  const { shown, more } = stripShown(items, Math.max(least, fit), 6, least)
  return { cards: shown.map(i => all[items.indexOf(i)] ?? make(i)), more }
}

export const PILL_COLOR: Record<StripPose, string> = { needs: '#D85A30', working: '#378ADD', idle: '#8a8a86', done: '#3B9C5F', finished: '#3B9C5F' }


// --- the terminal's strip: the same cards in text, sized in cells.

/** Terminal cells a text takes: wide characters (CJK, emoji) two. */
export const cells = (text: string): number => [...text].reduce((n, ch) => n + (isWide(ch) ? 2 : 1), 0)

/**
 * One terminal card's cells, as register.tsx draws it: `▣ Label `, the pill's
 * glyph (` !` for needs-you), a space and the pill's words, needs-you padded
 * by one more since it draws inverse.
 */
export const termCardCells = (pose: StripPose, label: string, pill: string): number =>
  2 + cells(label) + 1 + (pose === 'needs' ? 2 : 1) + 1 + cells(pill) + (pose === 'needs' ? 1 : 0)

/** Cells between the row's parts (the Box's gap). */
export const TERM_GAP = 2

/**
 * The terminal row that fits `cols`: the most cards that fit beside the
 * summary and the "+N more", the full summary on a tie, else the counts; with
 * no room for any card, the counts alone (with the "+N more").
 */
export function fitTerminalRow(
  items: StripItem[],
  cols: number,
  cardCells: (i: StripItem) => number,
  summary: (isNarrow: boolean) => string,
): { shown: StripItem[]; more: number; summary: string } {
  const width = (shown: StripItem[], more: number, text: string): number => {
    const parts = shown.length + (more ? 1 : 0) + 1
    return shown.reduce((w, i) => w + cardCells(i), 0) + (more ? cells(`+${more} more`) : 0) + cells(text) + TERM_GAP * (parts - 1)
  }
  for (let k = items.length; k >= 0; k--) {
    for (const isNarrow of [false, true]) {
      const text = summary(isNarrow)
      const { shown, more } = stripShown(items, k, 6, 0)
      if (shown.length < k) continue
      if (width(shown, more, text) <= cols) return { shown, more, summary: text }
    }
  }
  const { shown, more } = stripShown(items, 0, 6, 0)
  return { shown, more, summary: summary(true) }
}
