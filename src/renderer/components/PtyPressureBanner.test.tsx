// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { PtyPressure } from '@shared/types'
import { PtyPressureBanner, ptyPressureCopy } from './PtyPressureBanner'

const reading = (overrides: Partial<PtyPressure> = {}): PtyPressure => ({
  level: 'elevated',
  usage: 8,
  ceiling: 10,
  ...overrides
})

describe('pty pressure copy', () => {
  it('explains the Windows recovery route with measured capacity', () => {
    expect(ptyPressureCopy(reading())).toMatchObject({
      title: 'Terminal capacity is nearly full',
      tone: 'warning'
    })
    expect(ptyPressureCopy(reading())?.body).toContain('8 of 10 terminal slots')
    expect(ptyPressureCopy(reading())?.body).toContain('restart the affected session host')
  })

  it('stays silent when capacity was not measured', () => {
    expect(ptyPressureCopy(reading({ ceiling: null, usage: null }))).toBeNull()
  })
})

describe('PtyPressureBanner', () => {
  it('renders and dismisses a measured warning', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const existing = (window as unknown as { nodeTerminal?: { onPtyPressure?: unknown } }).nodeTerminal
    ;(window as unknown as { nodeTerminal: { onPtyPressure: (handler: (p: PtyPressure) => void) => () => void } }).nodeTerminal = {
      onPtyPressure: (handler) => {
      handler(reading())
      return () => undefined
      }
    }
    const root = createRoot(host)
    act(() => root.render(<PtyPressureBanner onError={vi.fn()} />))
    expect(host.textContent).toContain('Terminal capacity is nearly full')
    act(() => (host.querySelector('button') as HTMLButtonElement).click())
    expect(host.textContent).toBe('')
    act(() => root.unmount())
    ;(window as unknown as { nodeTerminal?: unknown }).nodeTerminal = existing
    host.remove()
  })
})
