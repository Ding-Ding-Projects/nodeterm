import { describe, it, expect } from 'vitest'
import { SUN_PATH_MAX, tmuxSocketPath, pickTmuxTmpdirBase } from './tmux-test-socket'

// A deliberately deep temporary root reproduces the socket-length boundary.
const LONG_TMP = `/tmp/${'x'.repeat(56)}`

describe('tmuxSocketPath', () => {
  it('is where tmux binds for `-L <socket>` under a given TMUX_TMPDIR', () => {
    expect(tmuxSocketPath('/tmp/nts-abc123', 501, 'sock')).toBe('/tmp/nts-abc123/tmux-501/sock')
  })
})

describe('pickTmuxTmpdirBase', () => {
  it('keeps the first base that fits — the caller orders them by preference', () => {
    expect(pickTmuxTmpdirBase([LONG_TMP, '/tmp'], 501, 'sock', 'p-')).toBe(LONG_TMP)
  })

  it('skips a base whose socket path would not fit and takes the next', () => {
    // This is the regression: the real prefix and socket name from
    // local-send-keys.realtmux.test.ts, which exceeded the socket budget under a deep temp root
    // and failed as `error connecting to …: File name too long`.
    const base = pickTmuxTmpdirBase([LONG_TMP, '/tmp'], 501, 'nt-sendkeys-test-38663', 'ntsendkeys-')
    expect(base).toBe('/tmp')
  })

  it('accounts for the six random characters mkdtemp appends to the prefix', () => {
    // A prefix landing EXACTLY on the limit before mkdtemp grows it, so the only thing that can
    // make this base unusable is the six characters — nothing else in the arithmetic.
    const uid = 501
    const socket = 'sock'
    const overhead = `${LONG_TMP}/`.length + `/tmux-${uid}/${socket}`.length
    const prefix = 'x'.repeat(SUN_PATH_MAX - overhead)
    expect(tmuxSocketPath(`${LONG_TMP}/${prefix}`, uid, socket).length).toBe(SUN_PATH_MAX)
    expect(pickTmuxTmpdirBase([LONG_TMP], uid, socket, prefix)).toBeNull()
  })

  it('is null when no base fits — a caller must not silently bind a truncated path', () => {
    expect(pickTmuxTmpdirBase([LONG_TMP], 501, 'x'.repeat(200), 'p-')).toBeNull()
  })
})
