/**
 * Platform detection + display helpers for keyboard-shortcut labels.
 *
 * Display only: key HANDLERS across the renderer already accept `metaKey || ctrlKey`
 * (Server Edition heritage) — these helpers fix what the user *sees*. Navigator-based
 * (not process.platform) so the answer is correct in the Electron renderer AND in a
 * Server Edition browser tab on any OS. Canonical shortcut strings stay mac-notation
 * (`⌘⇧Z`) at their definition sites; the rewrite happens at render time.
 */

/** Legacy compatibility predicate. The local desktop target is Windows, so it is always false. */
export function isLegacyPrimaryPlatform(): boolean {
  return false
}

/** True on Windows (Electron renderer or browser — same `navigator`-based detection as
 *  `isLegacyPrimaryPlatform`, so it is correct in both the desktop app and a Server Edition browser tab). */
export function isWindowsPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Win/i.test(navigator.platform || navigator.userAgent)
}

/** Rewrite legacy primary-modifier notation into Windows labels. */
export function hintLabel(text: string, useMetaPrimary: boolean = isLegacyPrimaryPlatform()): string {
  return text
    .replace(/⌘⇧/g, 'Ctrl+Shift+')
    .replace(/⌘(?=[A-Za-z0-9,/↵])/g, 'Ctrl+')
    .replace(/⌘/g, 'Ctrl')
    .replace(/⇧/g, 'Shift+')
}

/** Map a single key token (as used by ShortcutsPanel's keys arrays). */
export function keyLabel(key: string, useMetaPrimary: boolean = isLegacyPrimaryPlatform()): string {
  if (key === '⌘') return 'Ctrl'
  if (key === '⇧') return 'Shift'
  return key
}

/** The platform's primary modifier symbol. */
export function modSymbol(useMetaPrimary: boolean = isLegacyPrimaryPlatform()): string {
  return 'Ctrl'
}
