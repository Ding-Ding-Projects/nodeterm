import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const lockPath = join(root, 'package-lock.json')
const markerPath = join(root, 'node_modules', '.nodeterm-dependencies-ready')
const lockHash = createHash('sha256').update(readFileSync(lockPath)).digest('hex')
const nativeOutputs = [
  join(root, 'node_modules', 'node-pty', 'build', 'Release'),
  join(root, 'node_modules', 'smart-whisper', 'build', 'Release')
]

if (process.argv[2] === 'write') {
  writeFileSync(markerPath, `${lockHash}\n`, 'utf8')
  process.exit(0)
}

if (process.argv[2] !== 'verify') {
  console.error('Usage: node scripts/check-dependencies-ready.mjs verify|write')
  process.exit(2)
}

const marker = existsSync(markerPath) ? readFileSync(markerPath, 'utf8').trim() : ''
const ready = marker === lockHash && nativeOutputs.every((path) => existsSync(path))
if (ready) console.log('[OK] Project packages and native outputs match package-lock.json.')
process.exit(ready ? 0 : 1)
