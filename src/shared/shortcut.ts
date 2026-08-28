/**
 * Pure keyboard-shortcut parse/match/format helpers, shared by the Canvas listener, the
 * Settings → Speech capture field, the Dock mic tooltip, and ShortcutsPanel.
 *
 * Canonical string shape: modifier tokens joined by "+", optionally ending in one non-modifier
 * key token, e.g. `"Ctrl+Shift+D"`, `"Ctrl+F5"`, or a modifier-only chord with no trailing key,
 * e.g. `"Ctrl+Alt"`. Control is the only supported primary modifier.
 *
 * Modifier matching is EXACT on all four flags: a chord matches only when the event's meta/ctrl/
 * alt/shift state is precisely what the chord resolves to, so an extra modifier held on top never
 * fires a shorter binding.
 *
 * A modifier-only chord (`key === null`, see `isHoldChord`) means hold-to-talk: the chord is held
 * down to record and released to stop, instead of toggling on a keyed press. `chordHeld` (not
 * `matchesShortcut`, which requires a trailing key) is what the Canvas hold-mode listener uses to
 * test the held modifier state.
 */

export interface ParsedShortcut {
  ctrl: boolean
  shift: boolean
  alt: boolean
  /** Uppercased single char (e.g. "D") or named key (e.g. "F5", "SPACE", "ESCAPE"). `null` means
   *  a modifier-only (hold-to-talk) chord — see `isHoldChord`. */
  key: string | null
}

/** Friendly display labels for named (non single-char) keys. Falls back to title-case. */
const KEY_LABELS: Record<string, string> = {
  SPACE: 'Space',
  ENTER: 'Enter',
  RETURN: 'Enter',
  TAB: 'Tab',
  ESCAPE: 'Esc',
  ESC: 'Esc',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ARROWUP: '↑',
  ARROWDOWN: '↓',
  ARROWLEFT: '←',
  ARROWRIGHT: '→'
}

/** Named tokens for keys whose `e.key` is punctuation, so canonical strings stay readable. */
const KEY_ALIASES: Record<string, string> = { COMMA: ',', SLASH: '/', PERIOD: '.' }

/** Modifier-only `e.key` values — never a valid trailing key on their own. */
const MODIFIER_KEYS = new Set(['META', 'CONTROL', 'CTRL', 'SHIFT', 'ALT', 'ALTGRAPH', 'OS'])

/** `"d"` / `"D"` / `"Escape"` / `"F5"` -> the uppercased canonical key token; a punctuation alias
 *  (`"Comma"`) -> the character `e.key` actually reports (`","`). */
function normalizeKey(key: string): string {
  const upper = key.toUpperCase()
  return KEY_ALIASES[upper] ?? upper
}

/** True when `key` (a raw `e.key`, any case) names a modifier key itself rather than a
 *  printable/named key — e.g. `"Meta"`, `"Alt"`, `"Shift"`. Exported so the Settings capture
 *  field and the Canvas hold-mode listener can classify a keydown/keyup the same way
 *  `captureToShortcut` does internally. */
export function isModifierEventKey(key: string): boolean {
  return MODIFIER_KEYS.has(normalizeKey(key))
}

// Memo: dispatch re-parses every candidate binding on every keydown once the registry sits on
// a window listener; distinct binding strings are few, so a small frozen-value cache removes
// the hot-path cost for every consumer at once. The returned object's IDENTITY is stable only
// until the size-cap clear below — never key a Map/WeakMap or a React dep array off a
// `ParsedShortcut`; compare its fields, or the string it came from.
const parseCache = new Map<string, ParsedShortcut>()

/** Parse a canonical combo string, e.g. `"Ctrl+Shift+D"` becomes `{ctrl:true, shift:true,
 *  alt:false, key:'D'}`. A modifier-only chord such as `"Ctrl+Alt"` has a null key. */
export function parseShortcut(s: string): ParsedShortcut {
  const hit = parseCache.get(s)
  if (hit) return hit
  const parts = s
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)

  let ctrl = false
  let shift = false
  let alt = false
  let key: string | null = null
  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'ctrl' || lower === 'control') {
      ctrl = true
    } else if (lower === 'shift') {
      shift = true
    } else if (lower === 'alt') {
      alt = true
    } else {
      key = normalizeKey(part)
    }
  }
  const parsed = Object.freeze({ ctrl, shift, alt, key })
  if (parseCache.size > 512) parseCache.clear() // hand-edited garbage churn guard
  parseCache.set(s, parsed)
  return parsed
}

/** Canonical spellings for the key tokens that are not a single character. Serializing through
 *  this (rather than emitting the uppercased token) is what makes `serializeShortcut` the exact
 *  inverse of `parseShortcut`: `"Ctrl+Insert"` round-trips instead of becoming `"Ctrl+INSERT"`.
 *  Single letters, digits and F-keys are already canonical and pass through.
 *  The ALIAS spellings `KEY_LABELS` also accepts (`ESC`, `RETURN`) map onto the canonical token,
 *  so `"Ctrl+Esc"` and `"Ctrl+Escape"` serialize identically. Without that, two spellings of one
 *  chord would carry two conflict identities. Serializer-only: neither alias is ever produced by
 *  `normalizeKey` from a real `e.key` (the DOM reports `"Escape"` / `"Enter"`). */
const CANONICAL_KEY_NAMES: Record<string, string> = {
  ENTER: 'Enter',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  INSERT: 'Insert',
  ESCAPE: 'Escape',
  ESC: 'Escape',
  RETURN: 'Enter',
  TAB: 'Tab',
  SPACE: 'Space',
  ARROWUP: 'ArrowUp',
  ARROWDOWN: 'ArrowDown',
  ARROWLEFT: 'ArrowLeft',
  ARROWRIGHT: 'ArrowRight',
  PAGEUP: 'PageUp',
  PAGEDOWN: 'PageDown',
  ',': 'Comma',
  '/': 'Slash',
  '.': 'Period'
}

function keyTokenForSerialize(key: string): string {
  return CANONICAL_KEY_NAMES[key] ?? key
}

/** Canonical string for a parsed chord: `Ctrl`,`Alt`,`Shift`, then the key token
 *  (punctuation keys serialize back to their named alias). Two spellings of the same chord
 *  always serialize identically — keybindings.ts keys its conflict identities off this. */
export function serializeShortcut(p: ParsedShortcut): string {
  const parts: string[] = []
  if (p.ctrl) parts.push('Ctrl')
  if (p.alt) parts.push('Alt')
  if (p.shift) parts.push('Shift')
  if (p.key !== null) parts.push(keyTokenForSerialize(p.key))
  return parts.join('+')
}

/** True when `s` is a modifier-only chord with no trailing key. A keyed combo
 *  such as `"Ctrl+Alt+D"` keeps the existing press-to-talk toggle behavior; the mode is
 *  derived from the stored string, not a separate setting. */
export function isHoldChord(s: string): boolean {
  return parseShortcut(s).key === null
}

/** `"D"` -> `"D"`, `"SPACE"` -> `"Space"`, `"F5"` -> `"F5"`, unknown multi-char -> title case. */
function keyLabel(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key]
  if (key.length <= 1) return key
  if (/^F\d{1,2}$/.test(key)) return key
  return key.charAt(0) + key.slice(1).toLowerCase()
}

/** Render one Control-based shortcut as one badge per modifier or key. */
export function shortcutKeyParts(s: string): string[] {
  const { ctrl, shift, alt, key } = parseShortcut(s)
  const parts: string[] = []
  if (ctrl) parts.push('Ctrl')
  if (alt) parts.push('Alt')
  if (shift) parts.push('Shift')
  if (key !== null) parts.push(keyLabel(key))
  return parts
}

/** Render a stored shortcut using the supported desktop's Control notation. */
export function formatShortcut(s: string): string {
  const parts = shortcutKeyParts(s)
  return parts.join('+')
}

/** Minimal shape of a KeyboardEvent this module needs — kept structural so callers don't have
 *  to import `KeyboardEvent` (and so it's trivially fakeable in tests). */
export interface ShortcutKeyEvent {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  key: string
}

/** Resolve the concrete modifier flags used by the supported desktop runtime. */
export function resolvedModifiers(
  p: ParsedShortcut
): { meta: boolean; ctrl: boolean; alt: boolean; shift: boolean } {
  return {
    meta: false,
    ctrl: p.ctrl,
    alt: p.alt,
    shift: p.shift
  }
}

/** Does `e` match the canonical combo `s`? Both primary and literal Control tokens resolve to
 *  ctrlKey here. All four modifier flags must match exactly, so a chord never fires with an extra
 *  modifier held on top of it. For a keyed combo only, a modifier-only chord
 *  (`isHoldChord(s)`) never matches here (its `key` is `null`, which no `e.key` ever equals); the
 *  Canvas hold-mode listener uses `chordHeld` instead. */
export function matchesShortcut(e: ShortcutKeyEvent, s: string): boolean {
  const parsed = parseShortcut(s)
  const need = resolvedModifiers(parsed)
  if (e.metaKey !== need.meta || e.ctrlKey !== need.ctrl) return false
  if (e.shiftKey !== need.shift || e.altKey !== need.alt) return false
  return parsed.key !== null && normalizeKey(e.key) === parsed.key
}

/** True when `e`'s currently-held modifiers EXACTLY cover `s`'s modifiers (no key check, and no
 *  extra modifier beyond what `s` requires). Used by the Canvas hold-mode listener for a
 *  modifier-only chord: "is the chord fully down" (arm, on keydown) and "did one of the chord's
 *  own modifiers just come up" (release, on keyup — the keyup event's own modifier flags already
 *  reflect the key that was just released). An extra modifier held on top of the chord (e.g.
 *  Shift added to a `Ctrl+Alt` chord) makes this false, which is also the "third key" misfire
 *  guard for modifier keys specifically (a non-modifier third key is guarded separately, since
 *  this function ignores `e.key` entirely). */
export function chordHeld(e: ShortcutKeyEvent, s: string): boolean {
  const need = resolvedModifiers(parseShortcut(s))
  return (
    e.metaKey === need.meta &&
    e.ctrlKey === need.ctrl &&
    e.shiftKey === need.shift &&
    e.altKey === need.alt
  )
}

/**
 * Build a canonical combo string from a captured keydown, for the Settings capture field.
 * Requires the supported desktop's Control modifier plus a non-modifier
 * key; returns null while only modifier keys have been pressed so far, or when the primary
 * modifier is missing. (A modifier-only chord is captured separately — see `buildModifierChord`
 * below — because it commits on keyUP once every key is released, by which point the keyup
 * event's own modifier flags are already false and can't be read off it directly.)
 *
 * **A capture must describe the whole gesture**, because matching is exact: a held Meta or other
 * unsupported primary modifier is refused, and a Control chord is recorded explicitly.
 */
export function captureToShortcut(e: ShortcutKeyEvent): string | null {
  const primaryPressed = e.ctrlKey
  if (!primaryPressed) return null
  if (e.metaKey) return null
  const key = normalizeKey(e.key)
  if (MODIFIER_KEYS.has(key)) return null
  const parts = ['Ctrl']
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  parts.push(key)
  return parts.join('+')
}

/** The modifier state observed while capturing a would-be hold-to-talk chord (see
 *  `buildModifierChord`). */
export interface ChordModifiers {
  ctrl: boolean
  alt: boolean
  shift: boolean
}

/** `{ctrl:true, alt:true, shift:false}` becomes `"Ctrl+Alt"`; a false `ctrl` returns null because
 *  the primary modifier is mandatory. The Settings capture field calls this at keyup after every
 *  key has been released, using the modifier state remembered from the last modifier keydown. */
export function buildModifierChord(mods: ChordModifiers): string | null {
  if (!mods.ctrl) return null
  const parts = ['Ctrl']
  if (mods.alt) parts.push('Alt')
  if (mods.shift) parts.push('Shift')
  return parts.join('+')
}
