/**
 * Compatibility seam for the historical platform-specific pty pressure reader.
 *
 * Windows terminal capacity is owned by ConPTY and the session-host process rather than by a
 * user-adjustable global device ceiling. The Windows session-host health surface is therefore the
 * authoritative recovery route. This seam reports no numeric ceiling so older pressure consumers
 * fail closed instead of inventing capacity numbers.
 */
export interface PtyDevices {
  ceiling: number | null
  inUse: number | null
}

export const PTY_DEVICE_HEADROOM = 0

export function primePtyCeiling(): void {}

export function readPtyDevices(): PtyDevices {
  return { ceiling: null, inUse: null }
}

export function ptyDevicesExhausted(_devices: PtyDevices): boolean {
  return false
}

export function spawnFailureHint(
  archNote: string | null,
  _devices: PtyDevices,
  generic: string
): string {
  return archNote || generic
}

export function invalidatePtyCeiling(): void {}

export function resetPtyDevicesCacheForTests(): void {}
