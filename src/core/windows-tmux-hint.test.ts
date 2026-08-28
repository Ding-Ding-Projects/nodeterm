import { describe, expect, it } from 'vitest'
import { findCommand, tmuxCandidatePaths, tmuxInstall } from './tmux-hint'

describe('Windows tmux discovery boundary', () => {
  it('does not suggest a native tmux installation command', () => {
    expect(tmuxInstall('win32', () => true)).toBeNull()
  })

  it('keeps the POSIX fallback list free of Apple package-manager paths', () => {
    const paths = tmuxCandidatePaths('/home/example', 'example')
    expect(paths).toContain('/usr/bin/tmux')
    expect(paths).toContain('/home/example/.nix-profile/bin/tmux')
    expect(paths.join('\n')).not.toMatch(/homebrew|macports|opt\/local/i)
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
