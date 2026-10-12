// The strip above the prompt, drawn: a card per session, the crab beside its
// label and a status pill under it. Pure: no \$ here, so tests and previews can
// draw it too.

import { CRAB_CSS, crab } from './holidays'
import type { CrabPose } from './crab'
import { fmtAgo, paneRowText, paneSubText, pillText, stripShown } from './parse'
import type { PaneRow, StripItem, StripPose } from './parse'
import type { CrewSession } from '../types'

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

const PILL_CLASS: Record<StripPose, string> = { needs: 'pn', stalled: 'ps', working: 'pw', idle: 'pi', done: 'pd', finished: 'pd' }

// The pill's own colours, light and dark: needs-you is solid, the rest tinted.
export const PILL_CSS = `<style>
.pw rect{fill:#E3EEFB}.pw text{fill:#1F5FA8}.pw .ic{fill:#378ADD}
.pn rect{fill:#D85A30}.pn text{fill:#fff}.pn .ic{fill:#fff}
.ps rect{fill:#F6EBD8}.ps text{fill:#8A5510}.ps .icl{stroke:#BA7517}
.pi rect{fill:#EEEDEA}.pi text{fill:#5f5f5b}.pi .ic{fill:#8a8a86}
.pd rect{fill:#E2F3E7}.pd text{fill:#2B7446}.pd .ick{stroke:#3B9C5F}
@media (prefers-color-scheme: dark){
.pw rect{fill:#1E3550}.pw text{fill:#A9CCF5}.pw .ic{fill:#6AAEF0}
.pn rect{fill:#E0683E}
.ps rect{fill:#3D2E17}.ps text{fill:#F0C98A}.ps .icl{stroke:#E0A54A}
.pi rect{fill:#2E2E2C}.pi text{fill:#B5B5B0}.pi .ic{fill:#8f8f8a}
.pd rect{fill:#1F3B29}.pd text{fill:#98D8AE}.pd .ick{stroke:#6CC28A}}
.pulse{animation:pulse 1.2s ease-in-out infinite}@keyframes pulse{50%{opacity:.35}}
.muted{opacity:.72}
@media (prefers-reduced-motion: reduce){.pulse{animation:none}}
</style>`

const CRAB_POSE: Record<StripPose, CrabPose> = { needs: 'waiting', stalled: 'idle', working: 'working', idle: 'idle', done: 'done', finished: 'finished' }

// The pill's icon, drawn, in a 10×10 box at (x, y).
export function pillIcon(pose: StripPose, x: number, y: number): string {
  if (pose === 'working') return `<circle class="ic pulse" cx="${x + 4}" cy="${y + 5}" r="3.2"/>`
  if (pose === 'needs') return `<text class="ic" x="${x + 2.5}" y="${y + 9}" font-family="${FONT}" font-size="11" font-weight="800">!</text>`
  // Stalled: a small clock, it said it would come back later.
  if (pose === 'stalled')
    return `<g class="icl" fill="none" stroke-width="1.4" stroke-linecap="round"><circle cx="${x + 4.5}" cy="${y + 5}" r="3.6"/><path d="M${x + 4.5} ${y + 3}v2.2l1.6 1"/></g>`
  if (pose === 'idle') `<text class="ic" x="${x + 1}" y="${y + 8.5}" font-family="${FONT}" font-size="10" font-weight="700">z</text>`
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

/** What a desktop button adds around its label, roughly. */
const BUTTON_PAD = 20

export type Card = { item: StripItem; label: string; costume: string; title: string; pill: string; width: number }

export function cardOf(item: StripItem, label: string, costume: string, at: number, scale: number): Card {
  // The pill's icon is its check mark: the words needn't repeat it.
  const pill = pillText(item, at).replace(/ ✓$/, '')
  const crabW = 30 * scale
  // The label is drawn as a button (its padding), the pill under it.
  const width = Math.ceil(crabW + 8 + Math.max(textW(label, STRIP_FONT_LABEL, true) + BUTTON_PAD, pillWidth(pill)) + 16)
  const s = item.session
  const hint = (item.pose === 'needs' || item.pose === 'stalled') && s.turnHint ? ` · "${s.turnHint}"` : ''
  const title = `${s.title || s.name} (${s.name}): ${pillText(item, at)}${hint} · click to open`
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
export function layoutStrip(
  W: number,
  items: StripItem[],
  make: (i: StripItem) => Card,
  scale: number,
  summary: (isNarrow: boolean) => string,
): { band: ReturnType<typeof bandSvg>; summary: string; shown: number; cards: Card[]; more: number } {
  const tryWith = (isNarrow: boolean) => {
    const text = summary(isNarrow)
    const room = W - textW(text, 13) - 24
    // Narrow, no card is forced: the counts and "+N more" alone, rather than a row wider than the band.
    const { cards, more } = fitCards(room, items, make, isNarrow ? 0 : 1)
    const band = bandSvg(Math.max(60, room), cards, more, scale)
    return { band, summary: text, shown: cards.length, cards, more, fits: band.width + textW(text, 13) + 24 <= W }
  }
  const full = tryWith(false)
  if (!full.more && full.fits) return full
  const narrow = tryWith(true)
  if (narrow.shown === 0) {
    // Too narrow for a card beside even the counts: one card, as wide as the band allows, and the
    // counts wrap onto their own line (the desktop wraps a band's siblings), rather than no crab at all.
    const { cards, more } = fitCards(W, items, make, 1)
    return { band: bandSvg(W, cards, more, scale), summary: narrow.summary, shown: cards.length, cards, more }
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

export const PILL_COLOR: Record<StripPose, string> = { needs: '#D85A30', stalled: '#BA7517', working: '#378ADD', idle: '#8a8a86', done: '#3B9C5F', finished: '#3B9C5F' }

// --- the desktop strip as pressable cards: each card's crab and pill drawn apart, its label a Button between.

/** One card's crab, alone, as tall as the card. */
export function cardCrabSvg(c: Card, scale: number): { source: string; width: number; height: number } {
  const H = cardHeight(scale)
  const width = Math.ceil(30 * scale + 4)
  const crabH = 28 * scale
  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">${CRAB_CSS}<title>${xml(c.title)}</title>${crab(0, (H - crabH) / 2, c.costume, CRAB_POSE[c.item.pose], scale)}</svg>`,
    width,
    height: H,
  }
}

/** One card's status pill, alone. */
export function cardPillSvg(c: Card): { source: string; width: number; height: number } {
  const p = pillSvg(0, 1, c.item.pose === 'finished' ? 'finished' : c.item.pose, c.pill)
  const muted = c.item.pose === 'finished' ? ' class="muted"' : ''
  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}" height="18" viewBox="0 0 ${p.width} 18">${PILL_CSS}<title>${xml(c.title)}</title><g${muted}>${p.svg}</g></svg>`,
    width: p.width,
    height: 18,
  }
}

/** The strip's height at a crab scale. */
export const cardHeight = (scale: number): number => Math.max(44, Math.round(28 * scale + 8))


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
 * no room for any card, "+N more" and the counts, else the counts alone, cut
 * to the columns at the last. The row never runs past `cols`.
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
  // Not even the counts beside "+N more": the counts alone, cut to the columns if need be
  // (the "+N more" is left out, `more` 0, since there's no room to say it).
  return { shown: [], more: 0, summary: clipCells(summary(true), cols) }
}

/** `text` cut to `max` cells, an ellipsis last when it was cut. */
export function clipCells(text: string, max: number): string {
  if (cells(text) <= max) return text
  let out = ''
  for (const ch of text) {
    if (cells(out + ch) + 1 > max) break
    out += ch
  }
  return max > 0 ? out.trimEnd() + '…' : ''
}

// --- the pane's rows ----------------------------------------------------------------

/** A status pill, its icon and words, at (x, y), in the strip's colours; returns its markup and width. */
export function pillSvg(x: number, y: number, pose: StripPose, text: string): { svg: string; width: number } {
  const width = pillWidth(text)
  return {
    svg: `<g class="${PILL_CLASS[pose]}"><rect x="${x}" y="${y}" width="${width}" height="16" rx="8"/>${pillIcon(pose, x + 5, y + 3)}<text x="${x + 17}" y="${y + 11.5}" font-family="${FONT}" font-size="${STRIP_FONT_PILL}" font-weight="600">${xml(text)}</text></g>`,
    width,
  }
}

const KIND_POSE: Record<PaneRow['kind'], StripPose> = { needs: 'needs', stalled: 'stalled', working: 'working', idle: 'idle', proposed: 'idle', done: 'done' }
const KIND_CRAB: Record<PaneRow['kind'], CrabPose> = { needs: 'waiting', stalled: 'idle', working: 'working', idle: 'idle', proposed: 'proposed', done: 'finished' }

const clipToWidth = (text: string, size: number, maxW: number, bold = false): string => {
  if (textW(text, size, bold) <= maxW) return text
  let out = ''
  for (const ch of text) {
    if (textW(out + ch + '…', size, bold) > maxW) break
    out += ch
  }
  return out.trimEnd() + '…'
}

const paneSvg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS}${CRAB_CSS}${PILL_CSS}${body}</svg>`

export const MAIN_ROW_H = 52
export const SLEEP_ROW_H = 28

/** Who a session is, for its hover: the whole title, the handle, and the app's note ("started by …"). */
export const hoverOf = (s: CrewSession, status: string): string =>
  `${s.title || s.name} (${s.name})${s.note ? ` · ${s.note}` : ''}: ${status}${s.turnHint && /^(?:needs you|stalled)/.test(status) ? ` · "${s.turnHint}"` : ''}`

/** The tint behind a row the pane points out (a press that could not switch to it). */
const MARK = `<style>.mk{fill:#FBE3D8}@media (prefers-color-scheme: dark){.mk{fill:#4A2A1D}}</style>`

/**
 * A main row, two lines: the crab, the label, and under it what it asked (needs
 * you), what it promised (stalled), else the title (when it says more than
 * the label) and the PR; the status pill on the right. `isMarked` tints it.
 */
export function mainRowSvg(W: number, r: PaneRow, label: string, costume: string, at: number, isMarked = false): string {
  const s = r.session
  const status = paneRowText(r, at)
  const pose = KIND_POSE[r.kind]
  const pillW = pillWidth(status)
  const textMax = W - 46 - pillW - 14
  const sub = paneSubText(r, label)
  const pill = pillSvg(W - pillW, 9, r.kind === 'done' && at - (s.endedAt ?? at) >= 5_000 ? 'finished' : pose, status)
  const crabPose: CrabPose = r.kind === 'done' && at - (s.endedAt ?? at) < 5_000 ? 'done' : KIND_CRAB[r.kind]
  return paneSvg(
    W,
    MAIN_ROW_H,
    `${isMarked ? `${MARK}<rect class="mk" x="0" y="0" width="${W}" height="${MAIN_ROW_H}" rx="6"/>` : ''}<g><title>${xml(hoverOf(s, status))}</title>
${crab(2, 12, costume, crabPose)}
<text class="t" x="46" y="22" font-family="${FONT}" font-size="13" font-weight="600">${xml(clipToWidth(label, 13, textMax, true))}</text>
<text class="s" x="46" y="39" font-family="${FONT}" font-size="11">${xml(clipToWidth(sub, 11, W - 46 - 4))}</text>
${pill.svg}
<line class="ln" x1="0" y1="${MAIN_ROW_H - 0.5}" x2="${W}" y2="${MAIN_ROW_H - 0.5}"/></g>`,
  )
}

/** A one-line row: a small resting crab, the label, and on the right "idle 8m" (or `right`: "done · PR #226"). */
export function sleepRowSvg(W: number, s: CrewSession, label: string, costume: string, at: number, right = `idle ${fmtAgo(at - s.changedAt)}`, isMarked = false): string {
  const rightW = textW(right, 11) + 4
  return paneSvg(
    W,
    SLEEP_ROW_H,
    `${isMarked ? `${MARK}<rect class="mk" x="0" y="0" width="${W}" height="${SLEEP_ROW_H}" rx="6"/>` : ''}<g><title>${xml(hoverOf(s, right))}</title>
${crab(4, 3, costume, 'idle', 0.75)}
<text class="t" x="34" y="18" font-family="${FONT}" font-size="12.5" font-weight="500">${xml(clipToWidth(label, 12.5, W - 34 - rightW - 10))}</text>
<text class="s" x="${W}" y="18" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(right)}</text></g>`,
  )
}
