#!/usr/bin/env node
/**
 * Reproducible release line counter for this repository.
 *
 * Usage:
 *   node scripts/count-lines.mjs
 *   node scripts/count-lines.mjs --ref HEAD --markdown
 *   node scripts/count-lines.mjs --ref v0.3.4 --json
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const MAX_GIT_OUTPUT = 256 * 1024 * 1024

const EXCLUSIONS = [
  { pattern: /^package-lock\.json$/, reason: 'npm-generated lockfile' },
  { pattern: /^(?:docs|site)\/assets\//, reason: 'image and binary presentation assets' },
  { pattern: /^THIRD-PARTY-NOTICES\.md$/, reason: 'third-party legal notices' }
]

const LANGUAGE_BY_EXTENSION = new Map([
  ['.ts', 'TypeScript'],
  ['.tsx', 'TypeScript TSX'],
  ['.js', 'JavaScript'],
  ['.mjs', 'JavaScript ESM'],
  ['.cjs', 'JavaScript CJS'],
  ['.css', 'CSS'],
  ['.html', 'HTML'],
  ['.md', 'Markdown'],
  ['.json', 'JSON'],
  ['.yml', 'YAML'],
  ['.yaml', 'YAML'],
  ['.sh', 'Shell'],
  ['.bat', 'Batch'],
  ['.ps1', 'PowerShell']
])

const STYLE_EXTENSIONS = new Set(['.css'])
const DOCUMENT_EXTENSIONS = new Set(['.md'])
const CONFIG_EXTENSIONS = new Set(['.json', '.yml', '.yaml'])
const AGENT_PATTERNS = [
  /noreply@anthropic\.com/i,
  /claude/i,
  /codex/i,
  /copilot/i,
  /openai/i,
  /github-actions/i,
  /\[bot\]/i,
  /\bbot\b/i
]

function git(args, cwd, encoding = 'utf8') {
  return execFileSync('git', args, {
    cwd,
    encoding,
    maxBuffer: MAX_GIT_OUTPUT,
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

function isTestPath(file) {
  return (
    /\.test\.[cm]?[jt]sx?$/.test(file) ||
    /\.spec\.[cm]?[jt]sx?$/.test(file) ||
    /(^|\/)(?:test|tests|__tests__)\//.test(file)
  )
}

function classify(file) {
  const extension = path.posix.extname(file).toLowerCase()
  const language = LANGUAGE_BY_EXTENSION.get(extension)
  if (!language) return null
  if (isTestPath(file)) return { bucket: 'tests', language }
  if (STYLE_EXTENSIONS.has(extension)) return { bucket: 'styles', language }
  if (DOCUMENT_EXTENSIONS.has(extension)) return { bucket: 'docs', language }
  if (CONFIG_EXTENSIONS.has(extension)) return { bucket: 'config', language }
  return { bucket: 'source', language }
}

function exclusionReason(file) {
  return EXCLUSIONS.find(({ pattern }) => pattern.test(file))?.reason ?? null
}

function countTextLines(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (normalized.length === 0) return { total: 0, nonBlank: 0 }
  const body = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized
  if (body.length === 0) return { total: 0, nonBlank: 0 }
  const lines = body.split('\n')
  return {
    total: lines.length,
    nonBlank: lines.filter((line) => line.trim().length > 0).length
  }
}

function reservedAddress(email) {
  return /@(?:[^@]+\.)?(?:invalid|test|example|localhost)$/i.test(email) ||
    /@example\.(?:com|net|org)$/i.test(email)
}

function agentCommit(authorName, authorEmail, body) {
  const identity = `${authorName} <${authorEmail}>`
  if (AGENT_PATTERNS.some((pattern) => pattern.test(identity))) return true
  const trailers = body.match(/^co-authored-by:.*$/gim) ?? []
  return trailers.some((trailer) => AGENT_PATTERNS.some((pattern) => pattern.test(trailer)))
}

function emptyCounts() {
  return { files: 0, total: 0, nonBlank: 0 }
}

function commitKind(sha, cwd, cache) {
  if (cache.has(sha)) return cache.get(sha)
  let kind = 'unknown'
  try {
    const raw = git(['show', '-s', '--format=%an%x1f%ae%x1f%B', sha], cwd)
    const [authorName, authorEmail, ...bodyParts] = raw.split('\x1f')
    const body = bodyParts.join('\x1f')
    if (!reservedAddress(authorEmail)) {
      kind = agentCommit(authorName, authorEmail, body) ? 'agent' : 'person'
    }
  } catch {
    kind = 'unknown'
  }
  cache.set(sha, kind)
  return kind
}

function attributeFiles(files, ref, cwd) {
  const counts = { agent: 0, person: 0, unknown: 0 }
  const commitCache = new Map()
  for (const file of files) {
    let blame
    try {
      blame = git(['blame', '--line-porcelain', ref, '--', file], cwd)
    } catch {
      continue
    }
    for (const line of blame.split('\n')) {
      const match = /^([0-9a-f]{40}) \d+ \d+/.exec(line)
      if (!match) continue
      counts[commitKind(match[1], cwd, commitCache)] += 1
    }
  }
  return counts
}

export function computeLineCounts({ cwd = process.cwd(), ref = 'HEAD' } = {}) {
  try {
    git(['rev-parse', '--verify', `${ref}^{commit}`], cwd)
  } catch {
    throw new Error(`ref ${JSON.stringify(ref)} does not resolve to a commit`)
  }

  const tracked = git(['ls-tree', '-r', '--name-only', '-z', ref], cwd)
    .split('\0')
    .filter(Boolean)
  const buckets = {
    source: emptyCounts(),
    tests: emptyCounts(),
    styles: emptyCounts(),
    docs: emptyCounts(),
    config: emptyCounts()
  }
  const languages = new Map()
  const excluded = []
  const uncounted = []
  const countedFiles = []

  for (const file of tracked) {
    const reason = exclusionReason(file)
    if (reason) {
      excluded.push({ file, reason })
      continue
    }
    const classification = classify(file)
    if (!classification) {
      uncounted.push(file)
      continue
    }
    const bytes = git(['show', `${ref}:${file}`], cwd, null)
    if (bytes.includes(0)) {
      uncounted.push(file)
      continue
    }
    const lines = countTextLines(bytes.toString('utf8'))
    const bucket = buckets[classification.bucket]
    bucket.files += 1
    bucket.total += lines.total
    bucket.nonBlank += lines.nonBlank
    const language = languages.get(classification.language) ?? emptyCounts()
    language.files += 1
    language.total += lines.total
    language.nonBlank += lines.nonBlank
    languages.set(classification.language, language)
    countedFiles.push(file)
  }

  const projectTotal = Object.values(buckets).reduce(
    (total, bucket) => ({
      files: total.files + bucket.files,
      total: total.total + bucket.total,
      nonBlank: total.nonBlank + bucket.nonBlank
    }),
    emptyCounts()
  )
  const attribution = attributeFiles(countedFiles, ref, cwd)
  const attributedLines = attribution.agent + attribution.person + attribution.unknown
  if (attributedLines !== projectTotal.total) {
    throw new Error(`attribution total ${attributedLines} does not equal line total ${projectTotal.total}`)
  }

  return {
    ref,
    buckets,
    languages: [...languages.entries()]
      .map(([language, counts]) => ({ language, ...counts }))
      .sort((left, right) => right.total - left.total),
    projectTotal,
    grandTotal: { ...projectTotal },
    attribution: {
      ...attribution,
      attributedLines,
      agentPercent: attributedLines === 0 ? 0 : (attribution.agent / attributedLines) * 100,
      rule: 'Surviving lines are attributed with git blame at the selected ref. A commit is agent-written when its author identity or Co-Authored-By trailer names Claude, Codex, Copilot, OpenAI, a bot, or GitHub Actions. Reserved placeholder domains are unknown. All other attributable lines are person-written.'
    },
    excluded,
    uncounted
  }
}

function number(value) {
  return value.toLocaleString('en-US')
}

export function renderMarkdown(data) {
  const lines = [
    `### Line count at \`${data.ref}\``,
    '',
    '| Category | Files | Total lines | Non-blank lines |',
    '| --- | ---: | ---: | ---: |'
  ]
  for (const [category, counts] of Object.entries(data.buckets)) {
    lines.push(`| ${category} | ${number(counts.files)} | ${number(counts.total)} | ${number(counts.nonBlank)} |`)
  }
  lines.push('')
  lines.push(`Project total: **${number(data.projectTotal.total)}** lines, **${number(data.projectTotal.nonBlank)}** non-blank, across **${number(data.projectTotal.files)}** files.`)
  lines.push(`Grand total of everything counted: **${number(data.grandTotal.total)}** lines, **${number(data.grandTotal.nonBlank)}** non-blank.`)
  lines.push('')
  lines.push('| Attribution of surviving lines | Lines |')
  lines.push('| --- | ---: |')
  lines.push(`| Agent-written | ${number(data.attribution.agent)} (${data.attribution.agentPercent.toFixed(1)}%) |`)
  lines.push(`| Person-written | ${number(data.attribution.person)} |`)
  lines.push(`| Unknown | ${number(data.attribution.unknown)} |`)
  lines.push('')
  lines.push(`Attribution rule: ${data.attribution.rule}`)
  lines.push('')
  lines.push('Excluded tracked content:')
  if (data.excluded.length === 0) lines.push('- None.')
  for (const entry of data.excluded) lines.push(`- \`${entry.file}\`: ${entry.reason}.`)
  lines.push(`- ${number(data.uncounted.length)} tracked binary or unrecognized-format files were not counted as text.`)
  lines.push('')
  lines.push('Reproduce with `node scripts/count-lines.mjs --ref ' + data.ref + ' --markdown`.')
  return lines.join('\n')
}

function parseArgs(argv) {
  let ref = 'HEAD'
  let format = 'markdown'
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--ref') ref = argv[++index]
    else if (argv[index] === '--json') format = 'json'
    else if (argv[index] === '--markdown') format = 'markdown'
    else throw new Error(`unknown argument ${argv[index]}`)
  }
  return { ref, format }
}

function main() {
  const { ref, format } = parseArgs(process.argv.slice(2))
  const data = computeLineCounts({ ref })
  process.stdout.write(format === 'json' ? JSON.stringify(data, null, 2) + '\n' : renderMarkdown(data) + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    console.error(`count-lines.mjs failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
