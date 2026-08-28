import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(repositoryRoot, 'docs', 'assets', 'capture-manifest.json')

const expectedCapturePaths = [
  'docs/assets/hero.png',
  'site/assets/hero.png',
  'docs/assets/kanban-board.png',
  'docs/assets/card-modal.png',
  'docs/assets/card-assign.png',
  'stale-frame.png',
  'wt-dialog.png',
  'docs/assets/hero-tour.webp',
  'docs/assets/hero-tour.mp4',
  'docs/assets/canvas-tour.webp',
  'docs/assets/agents-tour.webp',
  'docs/assets/dictation-tour.webp',
  'docs/assets/kanban-launch.webp',
  'docs/assets/kanban-launch.mp4',
  'docs/assets/remote-tour.webp',
  'docs/assets/server/server-main.png',
  'docs/assets/server/server-settings-agents.png',
  'docs/assets/server/server-notifications.png',
  'docs/assets/server/server-remote-access.png',
  'docs/assets/server/server-browser-control.png',
  'docs/assets/server/server-canvas-control.png',
]

const nonCaptureAssets = new Set([
  'docs/assets/nodeterm.png',
  'docs/assets/social/avatar.png',
  'docs/assets/social/banner.png',
  'docs/assets/social/og.png',
  'site/assets/nodeterm.png',
])

const mediaExtensions = new Set(['.gif', '.jpeg', '.jpg', '.mp4', '.png', '.webp'])

function fail(message) {
  throw new Error(`Capture media verification failed: ${message}`)
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function walkMedia(relativeDirectory) {
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory)
  const results = []

  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkMedia(relativePath))
    } else if (mediaExtensions.has(path.extname(entry.name).toLowerCase())) {
      results.push(normalize(relativePath))
    }
  }

  return results
}

function assertExactInventory(actualPaths) {
  const expected = [...expectedCapturePaths].sort()
  const actual = [...actualPaths].sort()

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const actualSet = new Set(actual)
    const expectedSet = new Set(expected)
    const missing = expected.filter((entry) => !actualSet.has(entry))
    const unexpected = actual.filter((entry) => !expectedSet.has(entry))
    fail(`inventory mismatch; missing=${JSON.stringify(missing)} unexpected=${JSON.stringify(unexpected)}`)
  }
}

function verifyMp4(entry, bytes) {
  if (bytes.length < 12 || bytes.subarray(4, 8).toString('ascii') !== 'ftyp') {
    fail(`${entry.path} is not an ISO base media file`)
  }
  if (!Number.isInteger(entry.frames) || entry.frames < 1) {
    fail(`${entry.path} has an invalid frame count`)
  }
  if (typeof entry.fps !== 'number' || entry.fps <= 0) {
    fail(`${entry.path} has an invalid frame rate`)
  }
  if (!Number.isInteger(entry.durationMs) || entry.durationMs < 1000) {
    fail(`${entry.path} has an invalid duration`)
  }
}

async function verifyRaster(entry, bytes) {
  const animated = entry.path.endsWith('.webp')
  const metadata = await sharp(bytes, { animated, limitInputPixels: 80_000_000 }).metadata()
  const frameHeight = metadata.pageHeight ?? metadata.height
  const frameCount = metadata.pages ?? 1

  if (metadata.width !== entry.width || frameHeight !== entry.height) {
    fail(
      `${entry.path} dimensions are ${metadata.width}x${frameHeight}, expected ${entry.width}x${entry.height}`,
    )
  }
  if (frameCount !== entry.frames) {
    fail(`${entry.path} has ${frameCount} frames, expected ${entry.frames}`)
  }

  if (!animated) return

  const delays = metadata.delay ?? []
  if (delays.length !== frameCount) {
    fail(`${entry.path} exposes ${delays.length} frame delays for ${frameCount} frames`)
  }
  if (delays.some((delay) => !Number.isInteger(delay) || delay < 3000 || delay > 4500)) {
    fail(`${entry.path} has a frame outside the readable 3000 to 4500 millisecond range`)
  }

  const durationMs = delays.reduce((total, delay) => total + delay, 0)
  if (durationMs !== entry.durationMs) {
    fail(`${entry.path} lasts ${durationMs} milliseconds, manifest records ${entry.durationMs}`)
  }
}

async function main() {
  if (!existsSync(manifestPath)) fail('docs/assets/capture-manifest.json is missing')

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.schemaVersion !== 2) fail(`unsupported schema version ${manifest.schemaVersion}`)
  if (!/^[0-9a-f]{40}$/.test(manifest.desktopSourceCommit)) {
    fail('desktopSourceCommit is not a full commit SHA')
  }
  if (!/^[0-9a-f]{40}$/.test(manifest.serverSourceCommit)) {
    fail('serverSourceCommit is not a full commit SHA')
  }
  if (!/^[0-9a-f]{64}$/.test(manifest.desktopExecutableSha256)) {
    fail('desktopExecutableSha256 is not a SHA-256 digest')
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(manifest.serverImageManifest)) {
    fail('serverImageManifest is not a container manifest digest')
  }

  for (const sourceCommit of [manifest.desktopSourceCommit, manifest.serverSourceCommit]) {
    try {
      execFileSync('git', ['cat-file', '-e', `${sourceCommit}^{commit}`], {
        cwd: repositoryRoot,
        stdio: 'ignore',
      })
    } catch {
      fail(`source commit ${sourceCommit} does not exist in this repository`)
    }
  }

  if (!Array.isArray(manifest.files)) fail('files must be an array')
  assertExactInventory(manifest.files.map((entry) => entry.path))

  const discoveredCaptures = [
    ...walkMedia('docs/assets'),
    ...walkMedia('site/assets'),
    'stale-frame.png',
    'wt-dialog.png',
  ].filter((entry) => !nonCaptureAssets.has(entry))
  assertExactInventory(discoveredCaptures)

  for (const entry of manifest.files) {
    const absolutePath = path.join(repositoryRoot, ...entry.path.split('/'))
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      fail(`${entry.path} is missing`)
    }

    const bytes = readFileSync(absolutePath)
    if (bytes.length !== entry.bytes) {
      fail(`${entry.path} has ${bytes.length} bytes, manifest records ${entry.bytes}`)
    }
    const digest = sha256(bytes)
    if (digest !== entry.sha256) {
      fail(`${entry.path} hash ${digest} does not match ${entry.sha256}`)
    }

    if (entry.path.endsWith('.mp4')) verifyMp4(entry, bytes)
    else await verifyRaster(entry, bytes)
  }

  const desktopHero = readFileSync(path.join(repositoryRoot, 'docs', 'assets', 'hero.png'))
  const siteHero = readFileSync(path.join(repositoryRoot, 'site', 'assets', 'hero.png'))
  if (!desktopHero.equals(siteHero)) fail('the documentation and site hero images have drifted')

  console.log(`PASS: verified ${manifest.files.length} current capture media files`)
}

await main()
