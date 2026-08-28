import { useEffect } from 'react'
import type { Announcement } from '@shared/types'

const SEEN_KEY = 'nodeterm.seenAnnouncements'
const SIX_HOURS = 6 * 60 * 60 * 1000

export interface AnnouncementNotification {
  kind: 'warning'
  message: string
}

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveSeen(seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    // A storage refusal must not interrupt the application.
  }
}

/**
 * Remote informational and success items are not application events. Showing them on launch is
 * unsolicited promotion, so they never enter the UI. Warning items can carry a functional service
 * notice and are routed through the application's existing notification bus.
 */
export function notificationForAnnouncement(
  announcement: Announcement
): AnnouncementNotification | null {
  if (announcement.level !== 'warning') return null
  const body = announcement.body?.trim()
  return {
    kind: 'warning',
    message: body ? `${announcement.title}: ${body}` : announcement.title
  }
}

/**
 * Polls the bounded announcement feed without rendering a banner. Functional warnings are emitted
 * through the same in-application notification path used by local events. Promotional feed entries
 * remain silent.
 */
export function AnnouncementNotifier(): null {
  useEffect(() => {
    let cancelled = false

    const check = async (): Promise<void> => {
      let items: Announcement[]
      try {
        items = await window.nodeTerminal.announcements.fetch()
      } catch {
        return
      }
      if (cancelled || !items.length) return

      const seen = loadSeen()
      const candidate = items.find(
        (item) => !seen.has(item.id) && notificationForAnnouncement(item) !== null
      )
      if (!candidate) return

      const notification = notificationForAnnouncement(candidate)
      if (!notification) return
      seen.add(candidate.id)
      saveSeen(seen)
      window.dispatchEvent(new CustomEvent('nodeterm:toast', { detail: notification }))
    }

    void check()
    const timer = window.setInterval(() => void check(), SIX_HOURS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return null
}
