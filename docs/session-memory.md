# Session memory and detached-session limits

nodeterm reports memory held by terminal sessions and can release long-idle detached tmux clients
without destroying the tmux sessions that contain the user's work. Windows uses the native
session-host backend; Linux SSH and Server Edition hosts may use tmux.

## What is measured

`src/core/session-memory.ts` owns the process-table parser, process-tree rollup, host-memory parser,
and final report builder. A session row is keyed by its stable node id and includes the rolled-up
memory of the pane process and its descendants.

Host memory uses two paths:

- Linux reads `/proc/meminfo` and, when available, `/proc/pressure/memory`.
- Windows and other local hosts use Node's operating-system memory totals.

A failed read is `null`, never zero. Unknown memory must not be presented as an empty process or as
permission to reclaim a session.

## Windows session continuity

Stock Windows does not provide tmux. `src/session-host/host.ts` is therefore the normal persistence
backend on Windows, and `src/core/session-host-backend.ts` connects renderer terminals to it. The
session host is built by `npm run host:build` and included in every supported build path.

The detached-tmux reaper applies only where tmux exists. Windows session-host lifecycle uses its own
attach, detach, pause, resume, capture, and kill operations and does not depend on POSIX process or
socket assumptions.

## Linux and SSH session accounting

`src/core/session-memory-remote.ts` emits one bounded POSIX command that reads the remote process
table, pane list, `/proc/meminfo`, and PSI data. `parseRemoteSessionMemory` distinguishes a missing
tmux server from malformed output and from an unavailable memory source.

Remote session paths and process identifiers are validated before interpolation. A failed probe
reports an unavailable result and never becomes evidence that a host is idle.

## Reaping contract

`src/core/session-budget.ts` owns the detached-session policy. A candidate must be detached, idle
past the grace period, and outside every explicit protection before it can be selected. The policy
uses:

- a host available-memory watermark;
- swap pressure combined with low available memory;
- Linux PSI full-pressure data when present;
- a detached-count backstop;
- a bounded batch size.

Memory pressure and the detached-count backstop are separate reasons. A missing memory reading does
not trigger the memory leg. The count leg remains bounded and protects active or attached sessions.

Releasing a client is not the same as killing the session. Permanent node deletion is the only path
that destroys the corresponding tmux session, and it is kept separate from background reclamation.

## User interface

The session-memory panel shows the current host, rows, totals, and explicit unavailable states. It
does not invent a number when a host or process table cannot be read. Remote rows are labeled with
their host context so local and SSH measurements cannot be mistaken for one another.

## Failure modes

- No session host build: Windows creation refuses the missing backend instead of silently claiming
  persistence.
- No tmux server: Linux reports the no-server state and does not show phantom rows.
- No `/proc/meminfo`: rows may still be reported, while host memory remains unavailable.
- Malformed process output: malformed rows are skipped, and a wholly unusable report is rejected.
- Lost client: the idle reaper may release the client only after the configured grace period.
- Attached or relay-served session: never reclaimed as detached.

## Verification

Focused coverage lives in:

- `src/core/session-memory.test.ts`
- `src/core/session-memory-remote.test.ts`
- `src/core/session-budget.test.ts`
- `src/core/pty-idle-reap.test.ts`
- `src/core/session-host-backend.test.ts`
- `src/core/session-host-client.test.ts`

Run the focused checks with:

```powershell
npm test -- src/core/session-memory.test.ts src/core/session-memory-remote.test.ts src/core/session-budget.test.ts src/core/pty-idle-reap.test.ts
```

The one-click build also verifies that the Windows session-host output exists before reporting a
successful build.
