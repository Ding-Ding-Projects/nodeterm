import { describe, expect, it } from 'vitest'
import { findCommand, tmuxCandidatePaths, tmuxInstall } from './tmux-hint'

describe('Windows tmux discovery boundary', () => {
  it('does not suggest a native tmux installation command', () => {
    expect(tmuxInstall('win32', () => true)).toBeNull()
  })

  it('uses only the supported Linux and Nix fallback paths', () => {
    const paths = tmuxCandidatePaths('/home/example', 'example')
    expect(paths).toEqual([
      '/usr/bin/tmux',
      '/bin/tmux',
      '/home/example/.nix-profile/bin/tmux',
      '/etc/profiles/per-user/example/bin/tmux'
    ])
  })

  it('checks PATH before fixed Linux fallback directories', () => {
    const seen: string[] = []
    expect(
      findCommand('tmux', { PATH: '/custom/bin' }, (candidate) => {
        seen.push(candidate)
        return candidate === '/custom/bin/tmux'
      })
    ).toBe(true)
    expect(seen[0]).toBe('/custom/bin/tmux')
  })
})
