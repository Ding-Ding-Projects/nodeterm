/**
 * Platform detection + display helpers for keyboard-shortcut labels.
 *
 * Display only: key handlers across the renderer already accept both modifier forms for
 * Server Edition compatibility. These helpers define the modifier presentation used by the
 * Deen No desktop and its browser surface.
 */

/** The primary shortcut modifier is Control on the supported desktop surface. */
export function usesMetaPrimary(): boolean {
  return false
}

/** True when the browser reports a Windows platform. */
export function isWindowsPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Win/i.test(navigator.platform || navigator.userAgent)
}

/** Rewrite primary-modifier notation into Control labels. */
export function hintLabel(text: string, _usesMetaPrimary: boolean = usesMetaPrimary()): string {
  return text
    .replace(/⌘⇧/g, 'Ctrl+Shift+')
    .replace(/⌘(?=[A-Za-z0-9,/↵])/g, 'Ctrl+')
    .replace(/⌘/g, 'Ctrl')
    .replace(/⇧/g, 'Shift+')
}

/** Map a single key token (as used by ShortcutsPanel's keys arrays). */
export function keyLabel(key: string, _usesMetaPrimary: boolean = usesMetaPrimary()): string {
  if (key === '⌘') return 'Ctrl'
  if (key === '⇧') return 'Shift'
  return key
}

/** The supported desktop surface's primary modifier symbol. */
export function modSymbol(_usesMetaPrimary: boolean = usesMetaPrimary()): string {
  return 'Ctrl'
}
