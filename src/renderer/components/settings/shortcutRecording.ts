/**
 * Pure state machine for the Windows shortcut recorder. A Control-based keyed chord commits on
 * keydown. A modifier-only chord commits after every modifier is released, but only when the
 * command explicitly allows hold chords. Escape cancels and the caller cancels on blur.
 *
 * Matching is exact across Meta, Control, Alt, and Shift. Meta or Super is refused, an omitted
 * Control modifier never becomes a weaker stored chord, and losing Control disarms a pending hold
 * gesture. The caller owns state and validates the resulting canonical string for the command.
 */
import {
  buildModifierChord,
  captureToShortcut,
  formatShortcut,
  isModifierEventKey,
  type ChordModifiers,
  type ShortcutKeyEvent
} from '@shared/shortcut'

/** What the recorder remembers between events: the strongest modifier-only state seen so far,
 *  or `null` while no hold chord is armed. */
export interface RecordingState {
  mods: ChordModifiers | null
}

export type RecordingAction =
  /** A complete gesture. The combo is canonical but NOT yet validated for the command. */
  | { kind: 'commit'; combo: string }
  /** Escape — stop recording, change nothing. */
  | { kind: 'cancel' }
  /** Still recording: adopt `state` and show `hint`. */
  | { kind: 'pending'; state: RecordingState; hint: string }
  /** Nothing to do (and nothing to show) — leave the recorder exactly as it was. */
  | { kind: 'ignored' }

export interface RecordingOptions {
  /** The command's `allowHoldChord`. When false, a modifier-only gesture can never commit — it
   *  only previews the requirement, and the user must go on to press a real key. */
  allowHold: boolean
}

/** Meta or Super is unsupported in the Windows Control-first grammar. */
const SUPER_UNSUPPORTED = 'The Super key is not supported.'

const holdPrimaryHint = (): string => 'Hold Ctrl…'
const keyedPrimaryHint = (): string => 'Hold Ctrl and press a key'

/** Decide what a keydown during recording means. `state` is the recorder's current state; the
 *  returned `pending` state replaces it (a `commit`/`cancel`/`ignored` leaves it to the caller,
 *  which stops recording on the first two). */
export function recordingKeydown(
  state: RecordingState,
  e: ShortcutKeyEvent & { key: string },
  opts: RecordingOptions
): RecordingAction {
  const { allowHold } = opts
  if (e.key === 'Escape') return { kind: 'cancel' }

  if (isModifierEventKey(e.key)) {
    // Only modifier keys are down so far. When the command permits a hold chord this is a
    // candidate commit-on-release; otherwise it is purely a preview of what is still missing.
    if (!allowHold) return { kind: 'pending', state: { mods: null }, hint: keyedPrimaryHint() }
    if (e.metaKey) return { kind: 'pending', state: { mods: null }, hint: SUPER_UNSUPPORTED }
    const primaryPressed = e.ctrlKey
    if (!primaryPressed) {
      return { kind: 'pending', state: { mods: null }, hint: holdPrimaryHint() }
    }
    // Control is the canonical primary modifier for every recorded Windows chord.
    const mods: ChordModifiers = {
      ctrl: true,
      alt: e.altKey,
      shift: e.shiftKey
    }
    const preview = buildModifierChord(mods)
    return {
      kind: 'pending',
      state: { mods },
      hint: preview ? `Release for ${formatShortcut(preview)}, or press a key` : ''
    }
  }

  const combo = captureToShortcut(e)
  if (combo) return { kind: 'commit', combo }
  // Refused: either the primary modifier is missing, or Super is held. Keep whatever
  // hold chord was armed — the user may still complete it by releasing everything.
  return {
    kind: 'pending',
    state,
    hint: e.metaKey ? SUPER_UNSUPPORTED : keyedPrimaryHint()
  }
}

/** Decide what a keyup during recording means: a hold chord commits once EVERY modifier is up. */
export function recordingKeyup(
  state: RecordingState,
  e: ShortcutKeyEvent,
  opts: RecordingOptions
): RecordingAction {
  if (!opts.allowHold || !state.mods) return { kind: 'ignored' }
  // All four flags. `ctrlKey` is the one the legacy field forgot — see the module doc. The keyup
  // event's own flags already exclude the key just released, so "no flag set" means fully up.
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return { kind: 'ignored' }
  const combo = buildModifierChord(state.mods)
  if (!combo) return { kind: 'ignored' }
  return { kind: 'commit', combo }
}
