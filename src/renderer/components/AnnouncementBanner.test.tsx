// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Announcement } from '@shared/types'
import {
  AnnouncementNotifier,
  notificationForAnnouncement
} from './AnnouncementBanner'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const fetchAnnouncements = vi.fn<() => Promise<Announcement[]>>()
let host: HTMLDivElement
let root: Root | null = null
const storageValues = new Map<string, string>()
const storage: Storage = {
  get length() {
    return storageValues.size
  },
  clear: () => storageValues.clear(),
  getItem: (key) => storageValues.get(key) ?? null,
  key: (index) => [...storageValues.keys()][index] ?? null,
  removeItem: (key) => storageValues.delete(key),
  setItem: (key, value) => storageValues.set(key, String(value))
}

Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

async function renderNotifier(): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(<AnnouncementNotifier />)
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
  fetchAnnouncements.mockReset()
  ;(window as unknown as { nodeTerminal: unknown }).nodeTerminal = {
    announcements: { fetch: fetchAnnouncements }
  }
})

afterEach(() => {
  if (root) {
    const current = root
    root = null
    act(() => current.unmount())
    host.remove()
  }
})

describe('announcement notification policy', () => {
  it('refuses informational and success feed items', () => {
    expect(notificationForAnnouncement({ id: 'info', title: 'News', level: 'info' })).toBeNull()
    expect(
      notificationForAnnouncement({ id: 'success', title: 'Release', level: 'success' })
    ).toBeNull()
  })

  it('maps warning feed items to the internal notification payload', () => {
    expect(
      notificationForAnnouncement({
        id: 'warning',
        title: 'Service warning',
        body: 'Reconnect before continuing.',
        level: 'warning'
      })
    ).toEqual({ kind: 'warning', message: 'Service warning: Reconnect before continuing.' })
  })

  it('renders no visual surface for promotional items', async () => {
    fetchAnnouncements.mockResolvedValue([
      { id: 'promotion', title: 'Try another product', body: 'Learn more', level: 'info' }
    ])
    const onToast = vi.fn()
    window.addEventListener('nodeterm:toast', onToast)
    await renderNotifier()
    expect(host.innerHTML).toBe('')
    expect(onToast).not.toHaveBeenCalled()
    window.removeEventListener('nodeterm:toast', onToast)
  })

  it('delivers one warning through the internal notification event and remembers it', async () => {
    fetchAnnouncements.mockResolvedValue([
      { id: 'service-warning', title: 'Service warning', level: 'warning' }
    ])
    const seen: unknown[] = []
    const onToast = (event: Event): void => {
      seen.push((event as CustomEvent).detail)
    }
    window.addEventListener('nodeterm:toast', onToast)
    await renderNotifier()
    expect(host.innerHTML).toBe('')
    expect(seen).toEqual([{ kind: 'warning', message: 'Service warning' }])
    expect(JSON.parse(localStorage.getItem('nodeterm.seenAnnouncements') ?? '[]')).toEqual([
      'service-warning'
    ])
    window.removeEventListener('nodeterm:toast', onToast)
  })
})
