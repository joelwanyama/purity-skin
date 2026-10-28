/**
 * Turns docs/OWNER-GUIDE.md into a printable A4 PDF the owner can keep on a
 * phone, plus a self-contained HTML copy on the site.
 *
 * One source, two outputs — a guide that drifts from the code is worse than no
 * guide, so there is exactly one file to edit.
 *
 * Usage: npm run guide        → public/downloads/purity-skin-owner-guide.pdf/.html
 *
 * Screenshots are optional: put PNGs in docs/owner-guide/ and reference them in
 * the markdown as ![alt](images/name.png). They are embedded as data URIs so the
 * PDF and the HTML copy are both single files.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourcePath = path.join(root, 'docs/OWNER-GUIDE.md')
const imageDir = path.join(root, 'docs/owner-guide')
const outDir = path.join(root, 'public/downloads')
const htmlPath = path.join(outDir, 'purity-skin-owner-guide.html')
const pdfPath = path.join(outDir, 'purity-skin-owner-guide.pdf')

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Inline markdown: `code`, **bold**, [text](url). */
function inline(text) {
  let html = escapeHtml(text)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const safe = escapeHtml(href.replace(/&amp;/g, '&'))
    return `<a href="${safe}">${label}</a>`
  })
  return html
}

function dataUriFor(src) {
  const file = path.join(imageDir, path.basename(src))
  if (!existsSync(file)) return null
  const extension = path.extname(file).toLowerCase()
  const mime = extension === '.png' ? 'image/png' : 'image/jpeg'
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}

/**
 * A deliberately small markdown reader: headings, lists, tables, quotes, rules,
 * images and paragraphs. Anything it does not understand is shown as text
 * rather than dropped, so the guide can never silently lose a paragraph.
 */
export function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/)
  const out = []
  let paragraph = []
  let list = null // 'ul' | 'ol'
  let table = null // rows of cells
  let quote = []

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      out.push(`</${list}>`)
      list = null
    }
  }
  const flushTable = () => {
    if (table) {
      const [head, ...body] = table
      out.push('<table>')
      out.push(`<thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`)
      out.push(`<tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`)
      out.push('</table>')
      table = null
    }
  }
  const flushQuote = () => {
    if (quote.length) {
      out.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`)
      quote = []
    }
  }
  const flushAll = () => { flushParagraph(); flushList(); flushTable(); flushQuote() }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (!line.trim()) { flushAll(); continue }
    if (/^---+$/.test(line.trim())) { flushAll(); out.push('<hr />'); continue }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      flushAll()
      const level = heading[1].length
      const id = heading[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      out.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`)
      continue
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim())
    if (image) {
      flushAll()
      const uri = dataUriFor(image[2])
      if (uri) out.push(`<figure><img src="${uri}" alt="${escapeHtml(image[1])}" /><figcaption>${inline(image[1])}</figcaption></figure>`)
      else out.push(`<p class="missing-image">Screenshot missing: ${escapeHtml(image[2])}</p>`)
      continue
    }

    if (/^>\s?/.test(line)) {
      flushParagraph(); flushList(); flushTable()
      quote.push(line.replace(/^>\s?/, ''))
      continue
    }

    if (/^\|.*\|$/.test(line.trim())) {
      flushParagraph(); flushList(); flushQuote()
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
      if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue // separator row
      table = table ?? []
      table.push(cells)
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line.trim())
    if (bullet) {
      flushParagraph(); flushTable(); flushQuote()
      if (list !== 'ul') { flushList(); out.push('<ul>'); list = 'ul' }
      out.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }

    const numbered = /^\d+\.\s+(.*)$/.exec(line.trim())
    if (numbered) {
      flushParagraph(); flushTable(); flushQuote()
      if (list !== 'ol') { flushList(); out.push('<ol>'); list = 'ol' }
      out.push(`<li>${inline(numbered[1])}</li>`)
      continue
    }

    flushList(); flushTable(); flushQuote()
    paragraph.push(line.trim())
  }
  flushAll()
  return out.join('\n')
}

const PRINT_CSS = `
  @page { size: A4; margin: 16mm 14mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #14100F; background: #FFFFFF; font: 15px/1.62 "DejaVu Sans", "Helvetica Neue", Arial, sans-serif; }
  .sheet { max-width: 180mm; margin: 0 auto; }
  .cover { border-bottom: 2px solid #C2B7BD; padding-bottom: 14px; margin-bottom: 22px; }
  .cover .brand { font: 600 11px/1.4 "DejaVu Sans Mono", monospace; letter-spacing: .22em; text-transform: uppercase; color: #6B5F63; }
  .cover h1 { margin: 8px 0 6px; font-family: Georgia, "Bitstream Charter", serif; font-size: 30px; line-height: 1.15; }
  .cover p { margin: 0; color: #5A5054; font-size: 13px; }
  h1 { font-family: Georgia, "Bitstream Charter", serif; font-size: 25px; line-height: 1.2; margin: 26px 0 10px; }
  h2 { font-family: Georgia, "Bitstream Charter", serif; font-size: 20px; line-height: 1.25; margin: 26px 0 9px; padding-top: 10px; border-top: 1px solid #E2DCDF; page-break-after: avoid; }
  h3 { font-size: 15px; margin: 18px 0 7px; page-break-after: avoid; }
  p, li { orphans: 2; widows: 2; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 12px; padding-left: 20px; }
  li { margin-bottom: 5px; }
  code { font: 12.5px/1.5 "DejaVu Sans Mono", monospace; background: #F2EFF0; border: 1px solid #E2DCDF; border-radius: 3px; padding: 1px 4px; }
  a { color: #14100F; text-decoration: underline; text-underline-offset: 2px; }
  hr { border: 0; border-top: 1px solid #E2DCDF; margin: 22px 0; }
  blockquote { margin: 0 0 12px; padding: 10px 14px; border-left: 3px solid #C2B7BD; background: #FAF8F9; color: #3E3639; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 13px; page-break-inside: avoid; }
  th, td { text-align: left; vertical-align: top; padding: 7px 9px; border-bottom: 1px solid #E2DCDF; }
  th { background: #F4F1F2; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #5A5054; }
  figure { margin: 12px 0 16px; page-break-inside: avoid; }
  figure img { width: 100%; max-width: 100mm; border: 1px solid #E2DCDF; border-radius: 6px; display: block; }
  figcaption { margin-top: 6px; font-size: 11.5px; color: #5A5054; }
  .missing-image { color: #A03A3A; font-size: 12px; }
  .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #E2DCDF; font-size: 11px; color: #6B5F63; }
`

export function guideHtml(markdown, { generatedOn = '' } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PURITY SKIN owner guide</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<div class="sheet">
<div class="cover">
  <p class="brand">PURITY SKIN · Kampala, Uganda</p>
  <h1>Owner guide</h1>
  <p>How to run the shop from your phone. Generated from docs/OWNER-GUIDE.md${generatedOn ? ` on ${generatedOn}` : ''}.</p>
</div>
${markdownToHtml(markdown)}
<p class="foot">This guide is generated from the same file the developers edit, so it cannot drift from the site. If a screen looks different, tell us and we will fix whichever is wrong.</p>
</div>
</body>
</html>
`
}

// --- run directly -----------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const markdown = readFileSync(sourcePath, 'utf8')
  mkdirSync(outDir, { recursive: true })
  // The cover already carries the title; drop the markdown's own H1 so it does
  // not appear twice in print.
  const html = guideHtml(markdown.replace(/^#\s+.*(?:\r?\n)+/, ''))
  writeFileSync(htmlPath, html, 'utf8')
  console.log(`guide: wrote ${path.relative(root, htmlPath)} (${(html.length / 1024).toFixed(1)} kB)`)

  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font:9px -apple-system,Arial,sans-serif;color:#8C8085;padding:0 14mm;display:flex;justify-content:space-between"><span>PURITY SKIN owner guide</span><span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
  })
  await browser.close()
  const bytes = readFileSync(pdfPath).length
  console.log(`guide: wrote ${path.relative(root, pdfPath)} (${(bytes / 1024).toFixed(1)} kB)`)
}

export { PRINT_CSS, imageDir, readdirSync }
