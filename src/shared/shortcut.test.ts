import { describe, expect, it } from 'vitest'
import {
  captureToShortcut,
  chordHeld,
  formatShortcut,
  matchesShortcut,
  parseShortcut,
  resolvedModifiers,
  serializeShortcut,
  shortcutKeyParts
} from './shortcut'

const event = (overrides: Partial<KeyboardEvent> = {}): KeyboardEvent =>
  ({
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    key: 'd',
    ...overrides
  }) as KeyboardEvent

describe('Windows shortcut formatting', () => {
  it('formats explicit and legacy primary bindings with Windows labels', () => {
    expect(formatShortcut('Ctrl+Shift+D', false)).toBe('Ctrl+Shift+D')
    expect(formatShortcut('Cmd+Shift+D', true)).toBe('Ctrl+Shift+D')
    expect(formatShortcut('Ctrl+Alt', false)).toBe('Ctrl+Alt')
  })

  it('keeps named keys and punctuation as one readable part', () => {
    expect(shortcutKeyParts('Ctrl+Space', false)).toEqual(['Ctrl', 'Space'])
    expect(shortcutKeyParts('Ctrl+Slash', false)).toEqual(['Ctrl', '/'])
    expect(formatShortcut('Ctrl+F5', false)).toBe('Ctrl+F5')
  })

  it('round-trips parsed Windows bindings', () => {
    expect(serializeShortcut(parseShortcut('shift+t+ctrl'))).toBe('Ctrl+Shift+T')
    expect(serializeShortcut(parseShortcut('Ctrl+Comma'))).toBe('Ctrl+Comma')
  })
})

describe('Windows shortcut matching', () => {
  it('requires the exact Windows modifier set', () => {
    expect(matchesShortcut(event({ ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+D', false)).toBe(true)
    expect(matchesShortcut(event({ metaKey: true, shiftKey: true }), 'Ctrl+Shift+D', true)).toBe(false)
    expect(matchesShortcut(event({ ctrlKey: true, shiftKey: true, altKey: true }), 'Ctrl+Shift+D', false)).toBe(false)
  })

  it('handles named keys and shifted browser key values', () => {
    expect(matchesShortcut(event({ ctrlKey: true, key: 'F5' }), 'Ctrl+F5', false)).toBe(true)
    expect(matchesShortcut(event({ ctrlKey: true, shiftKey: true, key: 'D' }), 'Ctrl+Shift+D', false)).toBe(true)
    expect(matchesShortcut(event({ ctrlKey: true, key: ',' }), 'Ctrl+Comma', false)).toBe(true)
  })

  it('resolves Cmd as the Windows Control modifier for compatibility', () => {
    expect(resolvedModifiers(parseShortcut('Cmd+Shift+K'), true)).toEqual({
      meta: false,
      ctrl: true,
      alt: false,
      shift: true
    })
  })
})

describe('Windows shortcut capture and hold chords', () => {
  it('captures a Ctrl chord and rejects a Meta chord', () => {
    expect(captureToShortcut(event({ ctrlKey: true, shiftKey: true, key: 'd' }), false)).toBe(
      'Ctrl+Shift+D'
    )
    expect(captureToShortcut(event({ metaKey: true, key: 'd' }), true)).toBeNull()
  })

  it('requires exact Ctrl and Alt state for a hold chord', () => {
    expect(chordHeld(event({ ctrlKey: true, altKey: true }), 'Ctrl+Alt', false)).toBe(true)
    expect(chordHeld(event({ ctrlKey: true }), 'Ctrl+Alt', false)).toBe(false)
    expect(chordHeld(event({ ctrlKey: true, altKey: true, shiftKey: true }), 'Ctrl+Alt', false)).toBe(false)
  })
})
