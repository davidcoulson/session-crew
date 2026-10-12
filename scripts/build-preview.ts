// Builds preview/holidays.html: bundles preview/gallery.ts (which draws with
// hooks/holidays.ts and hooks/crab.ts) and inlines it into the template, so
// the page is one self-contained file. Run with bun: bun scripts/build-preview.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const built = await Bun.build({ entrypoints: [join(root, 'preview/gallery.ts')], format: 'iife', minify: true, target: 'browser' })
if (!built.success) {
  for (const log of built.logs) console.error(log)
  process.exit(1)
}
const js = (await built.outputs[0]!.text()).replace(/<\/script/gi, '<\\/script')
const page = readFileSync(join(root, 'preview/holidays.template.html'), 'utf8').replace('/*BUNDLE*/', () => js)
writeFileSync(join(root, 'preview/holidays.html'), page)
console.log(`preview/holidays.html: ${(page.length / 1024).toFixed(0)} KB`)
