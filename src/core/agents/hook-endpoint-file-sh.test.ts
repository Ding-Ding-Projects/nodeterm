import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { hookServer } from './hook-server'
import { nodeTokenDir } from './node-token-files'
import { initPlatform, resetPlatformForTests } from '../platform'
import { fakePlatform } from '../platform-fake'

// Endpoint paths can contain spaces. The managed hook script sources the endpoint file under
// /bin/sh, so an unquoted NODETERM_NODE_TOKEN_DIR makes sh try to run the path tail. This test
// proves the file sources cleanly under a real /bin/sh. The old structural assertion
// passed while real sh failed, which is exactly the class of bug this repo insists we prove against
// a real reader.
let spaced = ''
beforeAll(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nodeterm-ep-sh-'))
  // A subdirectory with a space in its name.
  spaced = path.join(root, 'App Support', 'node-terminal')
  fs.mkdirSync(spaced, { recursive: true })
  resetPlatformForTests()
  initPlatform(fakePlatform({ userDataDir: spaced }))
  await hookServer.start()
})
afterAll(() => {
  hookServer.stop()
})

describe('endpoint file sources cleanly under real /bin/sh with a spaced path', () => {
  it('preserves the exact NODETERM_NODE_TOKEN_DIR path, space intact', () => {
    const p = hookServer.endpointFilePath()
    // Sanity: the writer really is exercising a spaced path this run.
    expect(nodeTokenDir()).toContain(' ')
    expect(nodeTokenDir().startsWith(spaced)).toBe(true)

    const r = spawnSync(
      '/bin/sh',
      ['-c', `. "$1" && printf %s "$NODETERM_NODE_TOKEN_DIR"`, 'sh', p],
      { encoding: 'utf8' }
    )
    // (1) sh must source the file without error (unquoted → exit 127).
    expect(r.status).toBe(0)
    // (2) and the path must arrive with its space intact, byte for byte.
    expect(r.stdout).toBe(nodeTokenDir())
  })

  it('the shared TS parser reads the REAL writer output identically to sh', async () => {
    const { parseEndpointEnv } = await import('./hook-endpoint-parse')
    const env = parseEndpointEnv(fs.readFileSync(hookServer.endpointFilePath(), 'utf8'))
    expect(env.NODETERM_NODE_TOKEN_DIR).toBe(nodeTokenDir())
    expect(env.NODETERM_HOOK_TOKEN).toBe(hookServer.getToken())
    expect(Number(env.NODETERM_HOOK_PORT)).toBe(hookServer.getPort())
  })
})
