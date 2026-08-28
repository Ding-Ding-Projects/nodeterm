import { describe, it, expect } from 'vitest'
import { recordingKeydown, recordingKeyup } from './shortcutRecording'

const e = (
  over: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; key: string }>
) => ({
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  key: '',
  ...over
})
const HOLD = { allowHold: true }
const KEYED = { allowHold: false }

describe('recordingKeydown', () => {
  it('a keyed chord commits immediately', () => {
    expect(recordingKeydown({ mods: null }, e({ ctrlKey: true, key: 'd' }), KEYED)).toEqual({
      kind: 'commit',
      combo: 'Ctrl+D'
    })
  })
  it('captures the Windows Ctrl chord without a second primary modifier', () => {
    expect(
      recordingKeydown({ mods: null }, e({ ctrlKey: true, key: 'd' }), KEYED)
    ).toEqual({ kind: 'commit', combo: 'Ctrl+D' })
  })
  it('Escape cancels', () => {
    expect(recordingKeydown({ mods: null }, e({ key: 'Escape' }), KEYED)).toEqual({ kind: 'cancel' })
  })
  it('modifier-only keydown is pending: remembered for a hold commit when allowed', () => {
    const r = recordingKeydown({ mods: null }, e({ ctrlKey: true, altKey: true, key: 'Alt' }), HOLD)
    expect(r.kind).toBe('pending')
    if (r.kind === 'pending') expect(r.state.mods).toEqual({ ctrl: true, alt: true, shift: false })
  })
  it('does not invent a second literal Control modifier', () => {
    const r = recordingKeydown({ mods: null }, e({ ctrlKey: true, key: 'Control' }), HOLD)
    if (r.kind === 'pending') expect(r.state.mods?.ctrl).toBe(true)
    expect(r.kind).toBe('pending')
  })
  it('held Super is refused with a hint', () => {
    const r = recordingKeydown({ mods: null }, e({ metaKey: true, ctrlKey: true, key: 'Control' }), {
      allowHold: true
    })
    expect(r.kind).toBe('pending')
    if (r.kind === 'pending') {
      expect(r.state.mods).toBeNull()
      expect(r.hint).toContain('Super')
    }
  })
  // The legacy SpeechSection field left modsRef untouched here. Arm Control+Alt, release Control
  // while keeping Alt, then add Shift: the old path still committed Control+Alt on full release,
  // even though the completed Alt+Shift gesture could never fire it. Losing Control must disarm.
  it('a modifier-only keydown without the primary disarms an armed hold chord', () => {
    const armed = { mods: { ctrl: true, alt: true, shift: false } }
    const r = recordingKeydown(armed, e({ altKey: true, shiftKey: true, key: 'Shift' }), HOLD)
    expect(r.kind).toBe('pending')
    if (r.kind === 'pending') expect(r.state.mods).toBeNull()
  })
  it('modifier-only keydown without allowHold just previews the requirement', () => {
    const r = recordingKeydown({ mods: null }, e({ metaKey: true, key: 'Meta' }), KEYED)
    expect(r.kind).toBe('pending')
    if (r.kind === 'pending') expect(r.state.mods).toBeNull()
  })
})

describe('recordingKeyup', () => {
  it('full release commits the remembered hold chord', () => {
    const armed = { mods: { ctrl: true, alt: true, shift: false } }
    expect(recordingKeyup(armed, e({}), HOLD)).toEqual({ kind: 'commit', combo: 'Ctrl+Alt' })
  })
  it('partial release keeps waiting; no remembered mods ignores', () => {
    const armed = { mods: { ctrl: true, alt: true, shift: false } }
    expect(recordingKeyup(armed, e({ metaKey: true }), HOLD)).toEqual({ kind: 'ignored' })
    expect(recordingKeyup({ mods: null }, e({}), HOLD)).toEqual({ kind: 'ignored' })
  })
  // The legacy SpeechSection `anyModDown` omitted ctrlKey, so a hold chord could commit while
  // Control was still down. The full release condition must read all four modifier flags.
  it('a keyup with only Ctrl still held is ignored (the anyModDown gap, closed)', () => {
    const armed = { mods: { ctrl: true, alt: false, shift: false } }
    expect(recordingKeyup(armed, e({ ctrlKey: true }), HOLD)).toEqual({ kind: 'ignored' })
    expect(recordingKeyup(armed, e({}), HOLD)).toEqual({ kind: 'commit', combo: 'Ctrl' })
  })
})
