import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { computeLineCounts, renderMarkdown } from './count-lines.mjs'

const person = { name: 'Person Fixture', email: 'person@fixture.dev' }
const agent = { name: 'Claude Fable 5', email: 'noreply@anthropic.com' }
let root = ''
let firstCommit = ''

function git(args, identity = person) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: path.join(root, 'missing-global-config'),
      GIT_CONFIG_SYSTEM: path.join(root, 'missing-system-config'),
      GIT_AUTHOR_NAME: identity.name,
      GIT_AUTHOR_EMAIL: identity.email,
      GIT_COMMITTER_NAME: identity.name,
      GIT_COMMITTER_EMAIL: identity.email
    }
  })
}

function commit(message, identity) {
  git(['add', '-A'], identity)
  git(['commit', '-q', '--no-verify', '-m', message], identity)
}

beforeAll(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'nodeterm-line-count-'))
  git(['init', '-q'])
  git(['config', 'core.autocrlf', 'false'])
  mkdirSync(path.join(root, 'src'), { recursive: true })
  writeFileSync(path.join(root, 'src', 'app.ts'), 'export const one = 1\n\nexport const two = 2\n')
  writeFileSync(path.join(root, 'src', 'theme.css'), 'body {\n  color: blue;\n}')
  writeFileSync(path.join(root, 'package-lock.json'), '{"lockfileVersion":3}\n')
  commit('add person source', person)
  firstCommit = git(['rev-parse', 'HEAD']).trim()
  writeFileSync(path.join(root, 'src', 'app.test.ts'), 'import { one } from "./app"\nexpect(one).toBe(1)\n')
  commit('add agent test', agent)
})

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

describe('release line counter', () => {
  it('separates source, tests, styles, totals, and non-blank lines', () => {
    const data = computeLineCounts({ cwd: root })
    expect(data.buckets.source).toEqual({ files: 1, total: 3, nonBlank: 2 })
    expect(data.buckets.tests).toEqual({ files: 1, total: 2, nonBlank: 2 })
    expect(data.buckets.styles).toEqual({ files: 1, total: 3, nonBlank: 3 })
    expect(data.projectTotal).toEqual({ files: 3, total: 8, nonBlank: 7 })
  })

  it('states generated-file exclusions', () => {
    const data = computeLineCounts({ cwd: root })
    expect(data.excluded).toContainEqual({ file: 'package-lock.json', reason: 'npm-generated lockfile' })
  })

  it('attributes surviving lines and agrees with its own total', () => {
    const data = computeLineCounts({ cwd: root })
    expect(data.attribution.person).toBe(6)
    expect(data.attribution.agent).toBe(2)
    expect(data.attribution.unknown).toBe(0)
    expect(data.attribution.attributedLines).toBe(data.projectTotal.total)
  })

  it('supports an older commit without counting later files', () => {
    const data = computeLineCounts({ cwd: root, ref: firstCommit })
    expect(data.buckets.tests.total).toBe(0)
    expect(data.projectTotal.total).toBe(6)
  })

  it('renders the release Markdown table and reproduction command', () => {
    const markdown = renderMarkdown(computeLineCounts({ cwd: root }))
    expect(markdown).toContain('| Category | Files | Total lines | Non-blank lines |')
    expect(markdown).toContain('Agent-written')
    expect(markdown).toContain('node scripts/count-lines.mjs')
  })

  it('fails loudly for an invalid ref', () => {
    expect(() => computeLineCounts({ cwd: root, ref: 'missing-ref' })).toThrow(/does not resolve/)
  })
})
