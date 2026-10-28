/**
 * Removes Workers-only artefacts from the Pages build output.
 *
 * The Cloudflare Vite plugin writes dist/wrangler.json and dist/.assetsignore for
 * `wrangler deploy` (Workers static assets). This project publishes dist/ to
 * Cloudflare Pages, which would serve both files as public assets. wrangler.json
 * also embeds absolute build-machine paths, so committing it makes the build
 * non-deterministic and breaks the "committed dist is current" CI check.
 *
 * Both files are regenerated automatically if a Workers deploy is ever needed.
 */
import { rm } from 'node:fs/promises'
import path from 'node:path'

const outDir = path.resolve(process.argv[2] ?? 'dist')
const artefacts = ['wrangler.json', '.assetsignore']
const removed = []

for (const artefact of artefacts) {
  try {
    await rm(path.join(outDir, artefact), { force: false })
    removed.push(artefact)
  } catch {
    // Already absent: nothing to do.
  }
}

console.log(removed.length
  ? `postbuild: removed Workers-only artefacts from the Pages output (${removed.join(', ')})`
  : 'postbuild: no Workers-only artefacts to remove')
