import { describe, expect, it } from 'vitest'
import {
  CODEX_SANDBOX_BLOCKED_LINE,
  CODEX_SANDBOX_HINT_SH,
  CODEX_SANDBOX_RETRY_LINE
} from './hook-sandbox-hint-sh'

describe('Windows sandbox hint contract', () => {
  it('keeps the actionable blocked and retry guidance', () => {
    expect(CODEX_SANDBOX_HINT_SH).toContain(CODEX_SANDBOX_BLOCKED_LINE)
    expect(CODEX_SANDBOX_HINT_SH).toContain(CODEX_SANDBOX_RETRY_LINE)
    expect(CODEX_SANDBOX_HINT_SH).toContain('CODEX_SANDBOX_NETWORK_DISABLED')
  })

  it('contains no Apple-only socket allowlist branch', () => {
    expect(CODEX_SANDBOX_HINT_SH).not.toContain('Darwin')
    expect(CODEX_SANDBOX_HINT_SH).not.toContain('uname -s')
    expect(CODEX_SANDBOX_HINT_SH).not.toContain('network.allow_unix_sockets')
  })
})
