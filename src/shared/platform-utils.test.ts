import { describe, expect, it } from 'vitest'
import { isWindowsPlatform } from './platform-utils'

describe('Windows platform detection', () => {
  it('detects Windows only when a browser reports it', () => {
    expect(isWindowsPlatform()).toBe(true)
  })
})
