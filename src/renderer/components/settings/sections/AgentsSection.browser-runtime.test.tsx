// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { markBrowserRuntime } from '../../../bridge/runtime'
import { useBrowserLease } from '../../../state/browserLease'
import { AgentsSection } from './AgentsSection'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let host: HTMLElement

beforeEach(async () => {
  markBrowserRuntime()
  useBrowserLease.setState({ entries: {} })
  ;(window as unknown as { nodeTerminal: unknown }).nodeTerminal = {
    settings: { save: vi.fn(async () => undefined) },
    claude: { cliCaps: vi.fn(async () => null) },
    browser: {
      stop: vi.fn(async () => undefined),
      stopAll: vi.fn(async () => undefined),
      stopProject: vi.fn(async () => undefined),
    },
  }

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AgentsSection isActive />)
  })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('the Server Edition browser-control status', () => {
  it('states the permanent capability boundary instead of reporting an idle desktop debugger', () => {
    const text = host.textContent ?? ''
    expect(text).toContain('Browser control is not available in Server Edition')
    expect(text).toContain("viewer's own browser")
    expect(text).toContain('Windows desktop application')
    expect(text).not.toContain('No agent is driving a browser node right now.')
    expect(text).not.toContain('Stop all')
  })
})
