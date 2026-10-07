import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Base: el commit 164 muestra 1.05; +1 por commit; al pasar 1.09 salta a 2.0.
const VERSION_BASE_COMMIT = 164
const VERSION_BASE = 105 // centésimas -> 1.05

let count = 0
try {
  count = parseInt(execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 10) || 0
} catch {
  count = 0
}

let n = VERSION_BASE + (count - VERSION_BASE_COMMIT)
if (n >= 110) n = n - 110 + 200 // rollover 1.09 -> 2.0
if (n < 105) n = 105

const major = Math.floor(n / 100)
const minor = n % 100
const version = `${major}.${minor === 0 ? '0' : String(minor).padStart(2, '0')}`

const dir = dirname(fileURLToPath(import.meta.url))
const out = join(dir, '..', 'src', 'version.generated.ts')
writeFileSync(out, `// Archivo generado por scripts/version.mjs (no editar a mano).\nexport const APP_VERSION = '${version}'\n`)
console.log(`[version] commit=${count} -> PROFALLO v${version}`)
