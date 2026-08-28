import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    include: [
      'src/core/**/*.test.ts',
      'src/shared/**/*.test.ts',
      'src/main/**/*.test.ts',
      'src/preload/**/*.test.ts',
      // .tsx too: component tests (jsdom via a per-file pragma; everything else stays node).
      'src/renderer/**/*.test.{ts,tsx}',
      'src/server/**/*.test.ts',
      'src/session-host/**/*.test.ts',
      'test/server/**/*.test.ts',
      'test/remote/**/*.test.ts',
      // Cross-layer acceptance chains (e.g. renderer store + main's pure gates in one flow):
      // production layering forbids these imports inside src/, so the chain lives here, like
      // test/server's cross-layer boots.
      'test/acceptance/**/*.test.ts',
      // Opt-in end-to-end tests against a real sshd in Docker. They self-skip unless
      // NODETERM_SSH_DOCKER is set, so a machine without Docker still runs a green suite.
      'test/ssh-docker/**/*.test.ts'
    ],
    // These suites exercise a POSIX shell, a POSIX Unix socket, or a real tmux installation.
    // Windows has separate session-host, ConPTY, and Windows shell-profile coverage; collecting
    // the POSIX harnesses here only creates false failures when `sh`, tmux, or Unix sockets are
    // unavailable. The POSIX suites remain active on Linux and macOS CI.
    exclude: process.platform === 'win32'
      ? [
          '**/*.realsh.test.ts',
          '**/*.realtmux.test.ts',
          '**/*.realtty.test.ts',
          'src/core/codex-launcher-sh.test.ts',
          'src/core/context-link.cli.test.ts',
          'src/core/codex-thread-identity-sh.test.ts',
          'src/core/agents/hooks/opencode.test.ts',
          'src/core/codex-session-name.test.ts',
          'src/core/pty-background-write.test.ts',
          'src/core/pty-shadow.test.ts',
          'src/core/pty-single-user.test.ts',
          'src/core/pty-spawn-preflight.test.ts',
          'src/core/pty-proc-timeout.test.ts',
      'src/core/pty-bundled-tmux.test.ts',
      'src/core/pty-pressure.test.ts',
      'src/core/pty-spawn-diagnosis.test.ts',
      'src/core/pty-idle-reap.test.ts',
      'src/core/project-setup-runner-local.test.ts',
      'src/main/control-shim-parse.test.ts',
      'src/core/agents/hook-server.sock.test.ts',
      'src/core/context-link-shim.failover.test.ts',
      'src/core/remote-transcript-locate.test.ts',
      'src/core/usage/remote-claude-usage.test.ts',
      'src/core/agents/grok-paths.test.ts',
      'src/core/agents/hooks/grok.test.ts',
      // These assertions inspect POSIX mode bits or Unix credential/sock semantics. NTFS uses
      // ACLs instead, so these fixtures need a dedicated Windows ACL harness rather than a false
      // chmod verdict from Node's compatibility bits.
      'src/core/agent-status-mirror.test.ts',
      'src/core/settings-store.test.ts',
      'src/core/codex-identity-proxy.test.ts',
      'src/core/codex-identity-caps.test.ts',
      'src/core/github/cache.test.ts',
      'src/core/github/control-store.test.ts',
      'src/core/agents/node-auth-secret.test.ts',
      'src/core/agents/node-token-files.test.ts',
      'src/core/agents/hook-endpoint-file.test.ts',
      'src/core/agents/hook-endpoint-file-sh.test.ts',
      'src/core/claude-accounts-core.test.ts',
      'src/core/claude-config-dir.test.ts',
      'src/core/commit-message.test.ts',
      'src/core/worktree-shared-paths.test.ts',
      'src/core/worktree-shared-paths-handlers.test.ts',
      'src/main/github-control.test.ts',
      'src/server/github-control.test.ts',
      'src/main/remote/host-identity.test.ts',
      'src/main/remote/peer-identity.test.ts',
      'src/core/usage/minimax-usage.test.ts',
          'src/core/session-memory-remote.test.ts',
          'src/core/tmux-*.test.ts',
          'src/main/canvas-control-shim.test.ts',
          'src/main/canvas-control-shim.failover.test.ts',
          'src/main/codex-relay-daemon.test.ts',
          'src/main/remote-ssh/remote-hooks.test.ts',
          'src/main/remote-ssh/ssh-askpass.test.ts'
        ]
      : [],
    environment: 'node',
    // Issue #160: with the default (one worker per core), a 10-core Mac runs ~10 fs-heavy suites
    // at once and transient fd exhaustion (EMFILE) turns into silent test flakiness — probes like
    // `fs.existsSync` swallow the error and answer false, so whole files fail in ways that never
    // reproduce alone and vanish with --no-file-parallelism. Half the cores keeps wall-clock
    // close (the suite is fs/IO-bound, not CPU-bound) while halving peak fd pressure. CI's 2-core
    // runners resolve to 1 worker, which is what they effectively ran anyway.
    // Windows native filesystem and process fixtures share global platform and host state. Run
    // them serially so one fixture cannot invalidate another fixture's temporary socket or host.
    fileParallelism: process.platform !== 'win32',
    maxWorkers: process.platform === 'win32' ? 1 : '50%'
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer')
    }
  }
})
