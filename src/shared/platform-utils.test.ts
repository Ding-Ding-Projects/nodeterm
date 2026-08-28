import { describe, expect, it } from 'vitest'
import { hintLabel, isWindowsPlatform, keyLabel, modSymbol, usesMetaPrimary } from './platform-utils'

describe('Windows platform display helpers', () => {
  it('uses Control as the primary desktop modifier', () => {
    expect(usesMetaPrimary()).toBe(false)
  })

  it('renders primary and shift modifiers with Windows labels', () => {
    expect(keyLabel('⌘')).toBe('Ctrl')
    expect(keyLabel('⇧')).toBe('Shift')
    expect(modSymbol()).toBe('Ctrl')
    expect(hintLabel('Save (⌘⇧S)')).toBe('Save (Ctrl+Shift+S)')
  })

  it('detects Windows only when a browser reports it', () => {
    expect(isWindowsPlatform()).toBe(true)
  })
})
