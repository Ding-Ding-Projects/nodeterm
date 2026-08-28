import path from 'path'
import { describe, expect, it } from 'vitest'
import { isReservedSpawnEnvKey, usageCredsPaths } from './claude-accounts-core'

describe('Windows Claude account credential paths', () => {
  it('reads the system account from the standard user files', () => {
    const home = path.join('C:', 'Users', 'example')
    expect(usageCredsPaths(home)).toEqual({
      credsFile: path.join(home, '.claude', '.credentials.json'),
      identityFile: path.join(home, '.claude.json')
    })
  })

  it('reads a managed account from its isolated config directory', () => {
    const configDir = path.join('C:', 'Users', 'example', 'AppData', 'Roaming', 'nodeterm', 'claude-accounts', 'a1')
    expect(usageCredsPaths('unused', configDir)).toEqual({
      credsFile: path.join(configDir, '.credentials.json'),
      identityFile: path.join(configDir, '.claude.json')
    })
  })

  it('keeps supported loader injection keys reserved without Apple-only variables', () => {
    expect(isReservedSpawnEnvKey('LD_PRELOAD')).toBe(true)
    expect(isReservedSpawnEnvKey('DYLD_INSERT_LIBRARIES')).toBe(false)
    expect(isReservedSpawnEnvKey('DYLD_LIBRARY_PATH')).toBe(false)
  })
})
