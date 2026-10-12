// The holiday gallery's script: draws every outfit with the mod's own code
// (hooks/holidays.ts on top of hooks/crab.ts, the pills from hooks/band.ts).
// scripts/build-preview.ts bundles it into preview/holidays.html.

import { HOLIDAYS, HOLIDAY_CSS, activeHolidays, assignOutfits, holidayCrab } from '../hooks/holidays'
import type { Holiday } from '../hooks/holidays'
import { PILL_CSS, cardHeight, pillSvg } from '../hooks/band'
import type { CrabPose } from '../hooks/crab'
import type { StripPose } from '../hooks/parse'

const STRIP_SCALE = 1.5 // the strip's default `stripScale`
const ZOOM = STRIP_SCALE * 3

const POSES: { pose: CrabPose; strip: StripPose; label: string; pill: string }[] = [
  { pose: 'working', strip: 'working', label: 'working', pill: 'working 12m' },
  { pose: 'waiting', strip: 'needs', label: 'needs you', pill: 'needs you' },
  { pose: 'idle', strip: 'idle', label: 'idle', pill: 'idle 8m' },
  { pose: 'done', strip: 'done', label: 'done', pill: 'done · PR #12' },
]

// A colour per holiday for the calendar and the section marks.
const TINT: Record<string, string> = {
  newyear: '#C9A227', lunarnewyear: '#D0312D', valentine: '#E0558A', stpatrick: '#2E8B4A', easter: '#9C7FD1',
  july4: '#2F5DA8', muertos: '#E8761E', halloween: '#7F4FB8', diwali: '#E09A1A', thanksgiving: '#A0522D',
  hanukkah: '#3B7DD8', christmas: '#2E7D4F',
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  if (html) e.innerHTML = html
  return e
}

const esc = (s: string): string => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

/** As the strip draws a card's crab (band.ts cardCrabSvg): 49 wide, as tall as the card, clipped at its edges. */
const realCrab = (id: string, pose: CrabPose, title: string): string => {
  const H = cardHeight(STRIP_SCALE)
  const W = Math.ceil(30 * STRIP_SCALE + 4)
  return `<svg class="real" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${holidayCrab(0, (H - 28 * STRIP_SCALE) / 2, id, pose, STRIP_SCALE)}</svg>`
}

/** Three times the strip's size, with room round it for the z's and the marks that drift out of the grid. */
const zoomCrab = (id: string, pose: CrabPose, title: string): string =>
  `<svg class="zoom" xmlns="http://www.w3.org/2000/svg" width="${37 * ZOOM}" height="${34 * ZOOM}" viewBox="-5 -5 37 34" role="img" aria-label="${esc(title)}">${holidayCrab(0, 0, id, pose, 1)}</svg>`

const pill = (p: (typeof POSES)[number]): string => {
  const { svg, width } = pillSvg(0, 1, p.strip, p.pill)
  return `<svg class="pill" xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" viewBox="0 0 ${width} 20">${svg}</svg>`
}

// band.ts's pill colours follow the system theme; the gallery shows both at
// once, so each set is scoped to its own swatch instead.
function scopedPillCss(): string {
  const body = PILL_CSS.replace(/<\/?style>/g, '')
  const media = body.indexOf('@media (prefers-color-scheme: dark){')
  const light = body.slice(0, media)
  const darkStart = media + '@media (prefers-color-scheme: dark){'.length
  const darkEnd = body.indexOf('}}', darkStart) + 1
  const dark = body.slice(darkStart, darkEnd)
  const rest = body.slice(darkEnd + 1)
  const scope = (css: string, s: string) => css.replace(/(^|})\s*([^{}@]+)\{/g, (_m, b: string, sel: string) => `${b}${sel.split(',').map(x => `${s} ${x.trim()}`).join(',')}{`)
  return `<style>${scope(light, '.sw-l')}${scope(light, '.sw-d')}${scope(dark, '.sw-d')}${rest}</style>`
}

function outfitCard(h: Holiday, o: Holiday['outfits'][number], drops: Set<string>): HTMLElement {
  const card = el('article', { class: `outfit${drops.has(o.id) ? ' dropped' : ''}`, id: `o-${o.id}` })
  const dropId = `drop-${o.id}`
  card.append(el('header', {}, `<h3>${esc(o.name)}</h3><code title="What a faces rule would name">${o.id}</code>
    <label class="drop" for="${dropId}"><input type="checkbox" id="${dropId}" data-id="${o.id}" data-holiday="${h.id}"${drops.has(o.id) ? ' checked' : ''}> Drop</label>`))
  card.append(el('p', { class: 'note' }, esc(o.note)))
  const zoom = el('div', { class: 'stage' })
  for (const p of POSES.slice(0, 3))
    zoom.append(el('figure', {}, `${zoomCrab(o.id, p.pose, `${o.name}, ${p.label}`)}<figcaption>${p.label}</figcaption>`))
  card.append(zoom)
  const real = el('div', { class: 'swatches' })
  for (const [cls, label] of [['sw-l', 'light app'], ['sw-d', 'dark app']] as const) {
    const sw = el('div', { class: `swatch ${cls}` })
    sw.append(el('span', { class: 'swlabel' }, label))
    const row = el('div', { class: 'swrow' })
    for (const p of POSES) row.append(el('div', { class: 'swcrab', title: p.label }, realCrab(o.id, p.pose, `${o.name}, ${p.label}`)))
    sw.append(row)
    real.append(sw)
  }
  card.append(real)
  return card
}

/** A mock of the strip above the prompt in this holiday: four cards, as the strip lays them out. */
function stripMock(h: Holiday, cls: string): string {
  const ids = h.outfits.slice(0, 4).map(o => o.id)
  const labels = ['NUT PR fixes', 'Prismarr setup', 'GPU devices', 'Anycast DNS']
  return `<div class="strip ${cls}">${ids
    .map((id, i) => {
      const p = POSES[i] ?? POSES[0]!
      return `<div class="scard">${realCrab(id, p.pose, `${labels[i]}, ${p.label}`)}<div class="sbody"><span class="slabel">${labels[i]}</span>${pill(p)}</div></div>`
    })
    .join('')}</div>`
}

const fmt = (d: Date): string => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function nextWindow(h: Holiday, from: Date): [Date, Date] | undefined {
  for (const y of [from.getFullYear() - 1, from.getFullYear(), from.getFullYear() + 1]) {
    const [a, b] = h.window(y)
    if (b >= new Date(from.getFullYear(), from.getMonth(), from.getDate()) && a <= b) return [a, b]
  }
  return undefined
}

/** The next twelve months, a bar per holiday, today marked. */
function calendar(today: Date): string {
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(start.getFullYear() + 1, start.getMonth(), 1)
  const span = +end - +start
  const L = 150, W = 1000, R = 8, rowH = 22, top = 28
  const xOf = (d: Date) => L + ((+d - +start) / span) * (W - L - R)
  const rows = [...HOLIDAYS].sort((a, b) => +(nextWindow(a, today)?.[0] ?? end) - +(nextWindow(b, today)?.[0] ?? end))
  const H = top + rows.length * rowH + 8
  const parts: string[] = []
  for (let m = 0; m <= 12; m++) {
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1)
    const x = xOf(d)
    parts.push(`<line x1="${x}" x2="${x}" y1="${top - 6}" y2="${H - 4}" class="cal-grid"/>`)
    if (m < 12) parts.push(`<text x="${x + 4}" y="${top - 10}" class="cal-month">${d.toLocaleDateString('en-GB', { month: 'short' })}</text>`)
  }
  rows.forEach((h, i) => {
    const y = top + i * rowH
    parts.push(`<text x="0" y="${y + 14}" class="cal-name">${esc(h.name)}</text>`)
    for (const yr of [start.getFullYear() - 1, start.getFullYear(), start.getFullYear() + 1]) {
      const [a, b] = h.window(yr)
      const b1 = new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1)
      if (b1 <= start || a >= end || a > b) continue
      const x1 = Math.max(L, xOf(a)), x2 = Math.min(W - R, xOf(b1))
      parts.push(`<rect x="${x1}" y="${y + 4}" width="${Math.max(3, x2 - x1)}" height="12" rx="2" fill="${TINT[h.id] ?? '#888'}"><title>${esc(h.name)}: ${fmt(a)} – ${fmt(b)}</title></rect>`)
    }
  })
  const tx = xOf(today)
  parts.push(`<line x1="${tx}" x2="${tx}" y1="${top - 6}" y2="${H - 4}" class="cal-today"/><text x="${tx + 3}" y="${H}" class="cal-month cal-todaylabel">today</text>`)
  return `<svg class="calendar" viewBox="0 0 ${W} ${H + 4}" role="img" aria-label="Holiday windows over the next twelve months">${parts.join('')}</svg>`
}

function windowsTable(today: Date): string {
  const soon = (h: Holiday) => +(nextWindow(h, today)?.[0] ?? Infinity)
  const rows = [...HOLIDAYS].sort((a, b) => soon(a) - soon(b)).map(h => {
    const w = nextWindow(h, today)
    const on = activeHolidays(today).includes(h)
    return `<tr><th scope="row"><span class="dot" style="background:${TINT[h.id] ?? '#888'}"></span>${esc(h.name)}</th><td>${esc(h.when)}</td><td class="num">${w ? `${fmt(w[0])} – ${fmt(w[1])} ${w[1].getFullYear()}` : 'past the table'}${on ? ' <b class="on">on now</b>' : ''}</td><td class="num">${h.outfits.length}</td></tr>`
  })
  return `<table><thead><tr><th scope="col">Holiday</th><th scope="col">Window</th><th scope="col">Next</th><th scope="col">Outfits</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
}

// Example session ids, the way the app names them, for the who-wears-what demo.
const EXAMPLE_IDS = [
  'local_1fc7cd3c-3b35-456d-af06-23bec066b037', 'local_b2441128-a7ac-4e22-81e8-52518a2540d0', 'local_ea1e7d9c-2af1-4559-9391-7fa28463fe1f',
  'local_9893fb58-1861-4909-ae03-fe6e881d767f', 'local_aff69fb1-d43e-49a2-b39d-8274effa1d4f', 'local_db35aa1f-8923-439f-b8b5-25513cede38f',
]

function crewDemo(host: HTMLElement, holidayId: string, year: number): void {
  const h = HOLIDAYS.find(x => x.id === holidayId)
  if (!h) return
  const got = assignOutfits(EXAMPLE_IDS, [h], year)
  host.innerHTML = EXAMPLE_IDS.map((id, i) => {
    const o = got.get(id) ?? ''
    const name = h.outfits.find(x => x.id === o)?.name ?? o
    return `<figure>${realCrab(o, 'working', name)}<figcaption><code>${id.slice(6, 14)}…</code><span>${esc(name)}</span></figcaption></figure>`
  }).join('')
}

function boot(): void {
  document.getElementById('crab-css')!.innerHTML = `<svg width="0" height="0" aria-hidden="true">${HOLIDAY_CSS}${scopedPillCss()}</svg>`
  const today = new Date()
  const total = HOLIDAYS.reduce((n, h) => n + h.outfits.length, 0)
  document.getElementById('count')!.textContent = `${total} outfits across ${HOLIDAYS.length} holidays`

  let drops = new Set<string>()
  try { drops = new Set(JSON.parse(localStorage.getItem('crew-holiday-drops') ?? '[]') as string[]) } catch { /* private window */ }

  const nav = document.getElementById('jump')!
  const gallery = document.getElementById('gallery')!
  const ordered = [...HOLIDAYS].sort((a, b) => +(nextWindow(a, today)?.[0] ?? 0) - +(nextWindow(b, today)?.[0] ?? 0))
  for (const h of ordered) {
    nav.append(el('a', { href: `#${h.id}`, style: `--tint:${TINT[h.id] ?? '#888'}` }, esc(h.name)))
    const w = nextWindow(h, today)
    const sec = el('section', { class: 'holiday', id: h.id, style: `--tint:${TINT[h.id] ?? '#888'}` })
    sec.append(el('div', { class: 'hhead' }, `<h2>${esc(h.name)}</h2><p class="when">${esc(h.when)}${w ? ` · next ${fmt(w[0])} – ${fmt(w[1])} ${w[1].getFullYear()}` : ''} · ${h.outfits.length} outfits</p>`))
    sec.append(el('div', { class: 'strips' }, `<p class="caption">On the strip, at its real size</p>${stripMock(h, 'sw-l')}${stripMock(h, 'sw-d')}`))
    const grid = el('div', { class: 'grid' })
    for (const o of h.outfits) grid.append(outfitCard(h, o, drops))
    sec.append(grid)
    gallery.append(sec)
  }

  document.getElementById('calendar')!.innerHTML = calendar(today)
  document.getElementById('windows')!.innerHTML = windowsTable(today)

  const sel = document.getElementById('demo-holiday') as HTMLSelectElement
  for (const h of ordered) sel.append(el('option', { value: h.id }, esc(h.name)))
  const demo = document.getElementById('demo')!
  const draw = () => crewDemo(demo, sel.value, today.getFullYear())
  sel.addEventListener('change', draw)
  draw()

  const dateIn = document.getElementById('try-date') as HTMLInputElement
  const dateOut = document.getElementById('try-out')!
  const showDate = () => {
    const [y, m, d] = dateIn.value.split('-').map(Number)
    if (!y || !m || !d) return
    const on = activeHolidays(new Date(y, m - 1, d))
    dateOut.textContent = on.length ? on.map(h => h.name).join(' + ') : 'no holiday: the usual costumes'
  }
  dateIn.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  dateIn.addEventListener('input', showDate)
  showDate()

  // Drops: the outfits to leave out, kept in this browser only and copied out as a list to paste back to Claude.
  const bar = document.getElementById('picks')!
  const out = document.getElementById('picks-count')!
  const summary = (): string =>
    HOLIDAYS.map(h => {
      const out = h.outfits.filter(o => drops.has(o.id)).map(o => o.id)
      return out.length ? `${h.id}: ${out.join(', ')}` : ''
    }).filter(Boolean).join('\n')
  const refresh = () => {
    const total = HOLIDAYS.reduce((n, h) => n + h.outfits.length, 0)
    out.textContent = drops.size ? `${drops.size} to drop, ${total - drops.size} kept` : `All ${total} kept: tick Drop on any you don't want`
    bar.classList.toggle('has', drops.size > 0)
    try { localStorage.setItem('crew-holiday-drops', JSON.stringify([...drops])) } catch { /* not kept */ }
  }
  gallery.addEventListener('change', e => {
    const t = e.target as HTMLInputElement
    if (!t.dataset.id) return
    if (t.checked) drops.add(t.dataset.id)
    else drops.delete(t.dataset.id)
    t.closest('.outfit')?.classList.toggle('dropped', t.checked)
    refresh()
  })
  const copy = document.getElementById('copy-picks') as HTMLButtonElement
  const text = document.getElementById('picks-text') as HTMLTextAreaElement
  copy.addEventListener('click', () => {
    const s = drops.size ? `Keep every holiday outfit except these:\n${summary()}` : 'Keep every holiday outfit.'
    text.value = s
    text.hidden = false
    navigator.clipboard?.writeText(s).then(
      () => { copy.textContent = 'Copied'; setTimeout(() => (copy.textContent = 'Copy list'), 1600) },
      () => { text.select() },
    ) ?? text.select()
  })
  document.getElementById('clear-picks')!.addEventListener('click', () => {
    drops.clear()
    for (const c of gallery.querySelectorAll<HTMLInputElement>('input[data-id]')) c.checked = false
    for (const c of gallery.querySelectorAll('.dropped')) c.classList.remove('dropped')
    text.hidden = true
    refresh()
  })
  refresh()

  // Stage and motion controls.
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-stage]'))
    b.addEventListener('click', () => {
      document.body.dataset.stage = b.dataset.stage
      for (const x of document.querySelectorAll('[data-stage]')) x.setAttribute('aria-pressed', String(x === b))
    })
  const motion = document.getElementById('motion') as HTMLButtonElement
  motion.addEventListener('click', () => {
    const paused = document.body.classList.toggle('paused')
    motion.setAttribute('aria-pressed', String(paused))
    motion.textContent = paused ? 'Play motion' : 'Pause motion'
  })
}

boot()
