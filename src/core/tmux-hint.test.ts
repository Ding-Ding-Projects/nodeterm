import { describe, it, expect } from 'vitest'
import {
  findCommand,
  findFixedTmux,
  tmuxCandidatePaths,
  tmuxInstall
} from './tmux-hint'

describe('tmuxInstall', () => {
  it('linux: picks the first known package manager, in order', () => {
    expect(tmuxInstall('linux', (c) => c === 'apt-get')?.command).toContain('apt-get install -y tmux')
    expect(tmuxInstall('linux', (c) => c === 'dnf')?.command).toBe('sudo dnf install -y tmux')
    expect(tmuxInstall('linux', (c) => c === 'pacman')?.command).toBe('sudo pacman -S --needed tmux')
    expect(tmuxInstall('linux', (c) => c === 'apk')?.command).toBe('sudo apk add tmux')
    // apt-get outranks dnf when both exist (Debian-family first, matching the server docs' target).
    expect(tmuxInstall('linux', () => true)?.command).toContain('apt-get')
    expect(tmuxInstall('linux', () => true)?.label).toBe('Install tmux')
    expect(tmuxInstall('linux', () => false)).toBeNull()
  })

  it('win32 (no native tmux): never suggests a command', () => {
    expect(tmuxInstall('win32', () => true)).toBeNull()
  })
})

describe('findCommand', () => {
  it('scans PATH entries and the common GUI-blind dirs (apps do not inherit the shell PATH)', () => {
    const seen: string[] = []
    const exists = (p: string) => (seen.push(p), p === '/usr/local/bin/tmux')
    expect(findCommand('tmux', { PATH: '/usr/bin:/bin' }, exists)).toBe(true)
    expect(seen).toContain('/usr/bin/tmux')
    expect(seen).toContain('/usr/local/bin/tmux')
    expect(findCommand('tmux', { PATH: '/usr/bin' }, () => false)).toBe(false)
  })

  it('tolerates a missing PATH', () => {
    expect(findCommand('tmux', {}, (p) => p === '/usr/local/bin/tmux')).toBe(true)
  })
})

describe('tmuxCandidatePaths / findFixedTmux', () => {
  it('starts with the standard distro paths', () => {
    expect(tmuxCandidatePaths('/home/dev', 'dev').slice(0, 2)).toEqual([
      '/usr/bin/tmux',
      '/bin/tmux'
    ])
  })

  it('covers per-user Nix profiles', () => {
    const paths = tmuxCandidatePaths('/home/dev', 'dev')
    expect(paths).toContain('/home/dev/.nix-profile/bin/tmux')
    expect(paths).toContain('/etc/profiles/per-user/dev/bin/tmux')
  })

  it('falls back to the home directory basename when no user name is known', () => {
    expect(tmuxCandidatePaths('/home/ada')).toContain('/etc/profiles/per-user/ada/bin/tmux')
    // No home at all (an odd/locked-down environment): the home-derived paths are simply absent,
    // never emitted as `undefined/...`.
    expect(tmuxCandidatePaths(null).some((p) => p.includes('undefined'))).toBe(false)
    expect(tmuxCandidatePaths(null).some((p) => p.includes('.nix-profile'))).toBe(false)
  })

  it('returns the FIRST candidate that exists', () => {
    const seen: string[] = []
    const exists = (p: string): boolean => (seen.push(p), p === '/bin/tmux')
    expect(findFixedTmux(exists, '/home/dev', 'dev')).toBe('/bin/tmux')
    expect(seen[0]).toBe('/usr/bin/tmux')
    expect(findFixedTmux(() => false, '/home/dev', 'dev')).toBeNull()
  })

  it('treats a throwing existsSync as "not here" rather than failing the whole probe', () => {
    const exists = (p: string): boolean => {
      if (p === '/usr/bin/tmux') throw new Error('EPERM')
      return p === '/usr/bin/tmux'
    }
    expect(findFixedTmux(exists, 'C:/Users/dev', 'dev')).toBe('/usr/bin/tmux')
  })
})
