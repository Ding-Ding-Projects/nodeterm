import { useEffect, useState } from 'react'
import type { PtyPressure } from '@shared/types'

export interface PtyPressureCopy {
  title: string
  body: string
  tone: 'warning' | 'danger'
}

export function ptyPressureCopy(p: PtyPressure): PtyPressureCopy | null {
  if (p.level === 'none' || p.usage === null || p.ceiling === null) return null
  const counts = `(${p.usage} of ${p.ceiling} terminal slots)`
  const recover = 'Close unused terminals or restart the affected session host.'
  if (p.level === 'critical') {
    return {
      tone: 'danger',
      title: 'Terminal capacity is exhausted',
      body: `This machine has reached its terminal capacity ${counts}. New terminals may fail to open. ${recover}`
    }
  }
  return {
    tone: 'warning',
    title: 'Terminal capacity is nearly full',
    body: `This machine is close to its terminal capacity ${counts}. ${recover}`
  }
}

export function PtyPressureBanner({
  onError: _onError
}: {
  onError: (message: string) => void
}): JSX.Element | null {
  const [state, setState] = useState<{ reading: PtyPressure; seq: number } | null>(null)
  const [dismissed, setDismissed] = useState<{ level: PtyPressure['level']; seq: number } | null>(null)

  useEffect(() => {
    const off = window.nodeTerminal.onPtyPressure?.((reading) =>
      setState((previous) => ({ reading, seq: (previous?.seq ?? 0) + 1 }))
    )
    return () => off?.()
  }, [])

  const reading = state?.reading ?? null
  const copy = reading ? ptyPressureCopy(reading) : null
  const hidden =
    !!dismissed &&
    !!reading &&
    dismissed.level === reading.level &&
    (reading.level !== 'critical' || dismissed.seq === state?.seq)
  if (!reading || !copy || hidden) return null

  return (
    <div className={`announce-banner announce-banner--${copy.tone}`}>
      <span className="announce-banner__dot" />
      <div className="announce-banner__content">
        <span className="announce-banner__title">{copy.title}</span>
        <span className="announce-banner__body">{copy.body}</span>
      </div>
      <button
        className="announce-banner__close"
        title="Dismiss"
        onClick={() => setDismissed({ level: reading.level, seq: state?.seq ?? 0 })}
      >
        ✕
      </button>
    </div>
  )
}
