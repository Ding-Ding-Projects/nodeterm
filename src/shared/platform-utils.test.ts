import { describe, expect, it } from 'vitest'
import { hintLabel, isMacPlatform, isWindowsPlatform, keyLabel, modSymbol } from './platform-utils'

describe('Windows platform display helpers', () => {
  it('never identifies the local desktop as Apple', () => {
    expect(isMacPlatform()).toBe(false)
  })

  it('renders primary and shift modifiers with Windows labels', () => {
    expect(keyLabel('⌘', true)).toBe('Ctrl')
    expect(keyLabel('⇧', true)).toBe('Shift')
    expect(modSymbol(true)).toBe('Ctrl')
    expect(hintLabel('Save (⌘⇧S)', true)).toBe('Save (Ctrl+Shift+S)')
  })

  it('detects Windows only when a browser reports it', () => {
    expect(isWindowsPlatform()).toBe(true)
  })
})
