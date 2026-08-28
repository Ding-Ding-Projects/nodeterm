import { describe, it, expect } from 'vitest'
import { SHELL_ACCESS_CONSENT, describeGrant } from './consent'

describe('consent copy', () => {
  it('states shell access = SSH-equivalent, in plain words', () => {
    // The user must understand the grant before accepting. This is the whole point of the copy.
    expect(SHELL_ACCESS_CONSENT).toContain('run commands on this PC')
    expect(SHELL_ACCESS_CONSENT).toContain('equivalent to giving them SSH access')
  })

  it('names the peer', () => {
    expect(describeGrant('Ayşe')).toBe(
      'Ayşe will be able to run commands on this PC. This is equivalent to giving them SSH access.'
    )
  })

  it('falls back to a generic subject when the label is empty/blank', () => {
    expect(describeGrant('')).toBe(SHELL_ACCESS_CONSENT)
    expect(describeGrant('   ')).toBe(SHELL_ACCESS_CONSENT)
    expect(describeGrant('  Bora ')).toBe(
      'Bora will be able to run commands on this PC. This is equivalent to giving them SSH access.'
    )
  })
})
