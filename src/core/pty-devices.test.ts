import { describe, expect, it } from 'vitest'
import { invalidatePtyCeiling, ptyDevicesExhausted, readPtyDevices, spawnFailureHint } from './pty-devices'

describe('Windows terminal capacity compatibility seam', () => {
  it('reports no invented numeric capacity', () => {
    expect(readPtyDevices()).toEqual({ ceiling: null, inUse: null })
    expect(ptyDevicesExhausted({ ceiling: null, inUse: null })).toBe(false)
  })

  it('keeps architecture diagnosis ahead of generic recovery text', () => {
    const arch = "node-pty's spawn-helper is x86_64 but this app is arm64"
    expect(spawnFailureHint(arch, { ceiling: null, inUse: null }, 'Restart the session host.')).toBe(arch)
    expect(spawnFailureHint(null, { ceiling: null, inUse: null }, 'Restart the session host.')).toBe(
      'Restart the session host.'
    )
  })

  it('keeps cache invalidation safe and side-effect free', () => {
    expect(() => invalidatePtyCeiling()).not.toThrow()
  })
})
