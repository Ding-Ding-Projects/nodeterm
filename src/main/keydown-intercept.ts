import { IPC } from '../shared/ipc'
import {
  getEffectiveBindings,
  sanitizeKeybindingOverrides,
  type TerminalShortcutPolicy
} from '../shared/keybindings'
import { matchesShortcut } from '../shared/shortcut'

/** Windows main-process keyboard interception for commands owned above the renderer page. */

/** What a claimed chord asks the renderer to do. */
export type KeydownInterceptAction = 'toggle-markdown' | 'close-node' | 'zoom-actual-size'

/** The subset of Electron's `Input` the decision is made from (so tests need no Electron). */
export interface KeydownInterceptInput {
  type: string
  key: string
  code: string
  meta: boolean
  control: boolean
  shift: boolean
  alt: boolean
  /** OS auto-repeat: true on every keyDown after the first while the chord is HELD. */
  isAutoRepeat: boolean
}

/**
 * A claimed chord. `preventDefault` is implied by getting one of these at all — the key is ours,
 * so neither the menu nor the page may have it. `action` is separately nullable because held Ctrl+0
 * must keep being swallowed (the menu is still listening) while forwarding nothing.
 */
export interface KeydownInterceptDecision {
  action: KeydownInterceptAction | null
}

/** The effective chords for the two REMAPPABLE commands this module intercepts. `readonly
 *  string[]` in shortcut.ts's canonical spelling; `[]` means the user unbound the command, which
 *  must read as "do not claim the key" — Electron's own menu item comes back. */
export interface KeydownInterceptBindings {
  closeNode: readonly string[]
  toggleMarkdown: readonly string[]
}

/**
 * Effective M/W chords from raw settings overrides (sanitized here so a hand-edited settings.json
 * cannot crash or hijack the intercept — this runs on the way to `before-input-event`, the one
 * code path where a throw eats every keystroke in the window).
 */
export function resolveInterceptBindings(
  rawOverrides: unknown
): KeydownInterceptBindings {
  const { overrides } = sanitizeKeybindingOverrides(rawOverrides, false)
  return {
    closeNode: getEffectiveBindings('node.close', overrides, false),
    toggleMarkdown: getEffectiveBindings('node.toggleMarkdown', overrides, false)
  }
}

/** Electron's `Input` flags in the shape `matchesShortcut` reads. */
function toShortcutEvent(input: KeydownInterceptInput): {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  key: string
} {
  return {
    metaKey: input.meta,
    ctrlKey: input.control,
    shiftKey: input.shift,
    altKey: input.alt,
    key: input.key
  }
}

/** Resolve one Windows before-input event to an application action. */
export function keydownIntercept(
  input: KeydownInterceptInput,
  bindings: KeydownInterceptBindings
): KeydownInterceptDecision | null {
  if (input.type !== 'keyDown') return null
  // Match the user's effective Control-first bindings exactly, including every modifier flag.
  const ev = toShortcutEvent(input)
  if (bindings.toggleMarkdown.some((s) => matchesShortcut(ev, s, false))) {
    return { action: 'toggle-markdown' }
  }
  // Ctrl+W closes selected nodes; with none selected, the renderer asks main to close the window.
  if (bindings.closeNode.some((s) => matchesShortcut(ev, s, false))) {
    return { action: 'close-node' }
  }
  // NOT remappable: this is the renderer's `zoomShortcutChord` half of a canvas gesture, not a
  // registry command. Matched on the physical `code`, like that half: on a non-US layout the zero
  // key's `key` is not necessarily "0". Alt is excluded because AltGr reports as ctrl+alt and must
  // keep typing a real character; `meta || control` is the primary-modifier test it used to
  // inherit from the shared guard, and without it every bare `0` in the app is swallowed (#193).
  if (input.code === 'Digit0' && (input.meta || input.control) && !input.shift && !input.alt) {
    // Auto-repeat is dropped here rather than in the renderer, so a held chord cannot restart the
    // 200ms zoom tween — the same rule `zoomShortcutChord` applies to the keydown path. Still
    // claimed, so held Ctrl+0 does not fall through to page zoom on repeats.
    return { action: input.isAutoRepeat ? null : 'zoom-actual-size' }
  }
  return null
}

/**
 * PURE. Does this `did-start-navigation` mean the page that armed a shortcut recorder is going
 * away, so the recording bit must be cleared?
 *
 * **Why the bit needs a navigation leg at all.** The recording bit is GLOBAL and lives in the main
 * process, so every way the renderer can stop existing owes it a release. Window `closed` and
 * `render-process-gone` cover two of them. The third is a **reload** — and the app's own View menu
 * restores reload accelerators, which are handled above the page. They are
 * handled above the page, so the recorder's `preventDefault` cannot stop a user from pressing one
 * while armed. That reload fires no React unmount, no `closed` and no `render-process-gone`; the
 * new page mounts no recorder, and the bit would stay true forever, leaving Ctrl shortcuts dead with
 * nothing left alive to clear them.
 *
 * The two filters are both refusals, and both matter:
 * - `isSameDocument` (Electron's newer name for the old `isInPlace`) is a `pushState`, a
 *   `replaceState` or a fragment jump — the SAME page, with the recorder still mounted and still
 *   armed. Clearing there would re-arm the intercepts under a live recorder, i.e. re-open the very
 *   bug this feature closes.
 * - A subframe navigating is not this page going away either.
 */
export function navigationClearsRecording(details: {
  isMainFrame: boolean
  isSameDocument: boolean
}): boolean {
  return details.isMainFrame && !details.isSameDocument
}

/**
 * PURE. Does the user's `terminalShortcutPolicy` mean this window must stop claiming chords right
 * now? The composition `index.ts` hands to `installKeydownIntercepts`' 5th parameter, exported so
 * it can be pressed instead of living untested inside a closure in a 5000-line file.
 *
 * **Both halves are refusals and both matter.** `app-first` is the shipped default, so it must be
 * false whatever the mirror reports — that is the byte-identical guarantee of this feature: a user
 * who never touched the setting sees exactly the pre-feature intercepts, even though their
 * renderer is reporting terminal focus all day. And `terminalFocused` is a MIRROR of the
 * renderer's `document.activeElement`, which is why `false` is its reset value everywhere: a page
 * that died mid-report, a window that never had one, a reload — all resolve to "intercepts on",
 * never to "intercepts off with nothing alive to turn them back on".
 *
 * Why the policy is read here rather than the intercepts simply being uninstalled under
 * `terminal-first`: the policy is a live setting and the focus changes per keystroke, so there is
 * nothing static to install against — and an app-first user's window must not be a different
 * window from a terminal-first user's.
 */
export function policyStandsDown(
  policy: TerminalShortcutPolicy,
  terminalFocused: boolean
): boolean {
  return policy === 'terminal-first' && terminalFocused
}

/** Keep Ctrl+W in a focused terminal instead of closing the window. */
export function closeStandsDownInTerminal(terminalFocused: boolean): boolean {
  return terminalFocused
}

/**
 * PURE. The MENU leg's composed stand-down state: `index.ts`'s `syncMenuForStandDown` disables
 * `menuItemIdsToSuspend` for exactly as long as this is true.
 *
 * **The menu ORs the two suspensions; the INTERCEPTS do not.** `installKeydownIntercepts` keeps
 * `isRecording` and `isStoodDown` as separate parameters on purpose (unrelated reasons, unrelated
 * schedules — see its doc), and that stays. But a menu item is enabled or it is not: both reasons
 * want the same items suspended, and one boolean is the honest shape for a single `enabled` write.
 *
 * `menuStandsDown(false, …)` is `policyStandsDown(…)` by construction, which is the byte-identical
 * guarantee for every user who never arms the Settings recorder.
 */
export function menuStandsDown(
  recording: boolean,
  policy: TerminalShortcutPolicy,
  terminalFocused: boolean
): boolean {
  return recording || policyStandsDown(policy, terminalFocused)
}

/**
 * Menu item ids `buildAppMenu` stamps on the items whose ACCELERATORS survive an intercept
 * stand-down. Exported constants used by both sides — the template that sets them and the sync that
 * looks them up — because `getMenuItemById` answers `null` for a typo and the fail-safe there is to
 * do nothing, which is indistinguishable from the feature working.
 */
export const MENU_ITEM_ID_MINIMIZE = 'window-minimize'
export const MENU_ITEM_ID_CLOSE = 'window-close'
/** View: Toggle Kanban Board. */
export const MENU_ITEM_ID_KANBAN = 'view-kanban-toggle'
/** The Settings menu item. */
export const MENU_ITEM_ID_SETTINGS = 'app-settings'

/** Menu items whose accelerators must stand down for terminal input or shortcut recording. */
export function menuItemIdsToSuspend(): string[] {
  return [MENU_ITEM_ID_MINIMIZE, MENU_ITEM_ID_KANBAN, MENU_ITEM_ID_SETTINGS, MENU_ITEM_ID_CLOSE]
}

/** The renderer channel a claimed action is forwarded on. */
export function keydownInterceptChannel(action: KeydownInterceptAction): string {
  if (action === 'toggle-markdown') return IPC.appToggleMarkdown
  if (action === 'close-node') return IPC.appCloseNode
  return IPC.appZoomActualSize
}

/** Structural view of the window this installs on (keeps the module Electron-free, like
 *  `main-window.ts`). */
export interface KeydownInterceptTarget {
  webContents: {
    on(
      event: 'before-input-event',
      listener: (event: { preventDefault(): void }, input: KeydownInterceptInput) => void
    ): void
    send(channel: string, ...args: unknown[]): void
  }
}

/** Install the Windows before-input interceptor on one window. */
export function installKeydownIntercepts(
  win: KeydownInterceptTarget,
  getBindings: () => KeydownInterceptBindings,
  isRecording: () => boolean,
  isStoodDown: () => boolean,
  // The Ctrl+W stand-down is policy-independent and applies only while a terminal is focused.
  isCloseSuspended: () => boolean = () => false
): void {
  win.webContents.on('before-input-event', (event, input) => {
    if (isRecording() || isStoodDown()) return
    const decision = keydownIntercept(input, getBindings())
    if (!decision) return
    // Checked AFTER resolution and only for close: the chord must fall through UNTOUCHED (no
    // preventDefault) so it reaches the page → xterm → the pty as readline's kill-word. The menu
    // leg is suspended in the same states (syncMenuForStandDown), so nothing above the page takes
    // it either.
    if (decision.action === 'close-node' && isCloseSuspended()) return
    event.preventDefault()
    if (decision.action) win.webContents.send(keydownInterceptChannel(decision.action))
  })
}
