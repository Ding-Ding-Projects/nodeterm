// Live main-window tracking. Everything in the main process that pushes IPC to the
// renderer must resolve the window AT SEND TIME via getMainWindow()/sendToMain().
// Never capture a BrowserWindow in a closure at init, because a replacement window
// must receive later updates too.

// Structural view of BrowserWindow (keeps this module electron-free and unit-testable).
export interface MainWindowLike {
  isDestroyed(): boolean
  isFocused(): boolean
  isMinimized(): boolean
  restore(): void
  show(): void
  focus(): void
  setOverlayIcon?(image: unknown, description: string): void
  on(event: 'closed', cb: () => void): void
  // `id` is Electron's webContents id — the same number CorePlatform addresses a UI by
  // (sendTo / the sender id of an ipcMain event). Optional so a test double may omit it.
  webContents: { id?: number; send(channel: string, ...args: unknown[]): void }
}

let current: MainWindowLike | null = null

export function setMainWindow(win: MainWindowLike): void {
  current = win
  win.on('closed', () => {
    // Guard: a late 'closed' from a replaced window must not clear its successor.
    if (current === win) current = null
  })
}

export function getMainWindow(): MainWindowLike | null {
  return current && !current.isDestroyed() ? current : null
}

export function sendToMain(channel: string, ...args: unknown[]): void {
  getMainWindow()?.webContents.send(channel, ...args)
}

/** The attached renderer client ids, resolved at call time so a replacement window is picked up. */
export function mainWindowClientIds(): number[] {
  const id = getMainWindow()?.webContents.id
  return typeof id === 'number' ? [id] : []
}

export type CrashReloadAction = 'reload' | 'give-up' | 'ignore'

// A dead renderer leaves the (single) window a permanent blank page — nothing in Electron
// reloads it. Reload automatically, but bounded: a crash on the boot path would otherwise
// reload forever. 'clean-exit' is a deliberate teardown (window close, navigation), never
// reloaded; everything else, including crashed, oom, abnormal-exit, launch-failed, and killed,
// deserves an attempt.
export function createCrashReloadPolicy(
  opts?: { maxReloads?: number; windowMs?: number }
): (reason: string, now: number) => CrashReloadAction {
  const maxReloads = opts?.maxReloads ?? 2
  const windowMs = opts?.windowMs ?? 60_000
  let granted: number[] = []
  return (reason, now) => {
    if (reason === 'clean-exit') return 'ignore'
    granted = granted.filter((t) => now - t < windowMs)
    if (granted.length >= maxReloads) return 'give-up'
    granted.push(now)
    return 'reload'
  }
}
