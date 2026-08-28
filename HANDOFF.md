# Windows conversion handoff

## Current state

The work is being prepared in PR #494, targeting `eneskirca/nodeterm:main` from
`Ding-Ding-Projects/nodeterm:feat/windows-complete-conversion`.

The latest source commit is:

```text
5667f07b
```

The source checkout is clean and the source ref has been verified with `git ls-remote`.

## User-facing headline

The intended first-run experience is a ZIP-only Windows workflow:

1. Download the source ZIP.
2. Extract it.
3. Double-click `build.bat`.

The script obtains the pinned toolchain and project packages, rebuilds native modules, builds the
real desktop outputs, and supports `build.bat /s` for unattended operation. `build-installer.bat /s`
uses the same bootstrap route and produces an unsigned x64 Squirrel.Windows installer.

## Verified evidence

### Full retained Windows test suite

Verified at commit `6ec87ac2520021f8d96ae85db12de575ce329b44`:

- 591 test files passed
- 2 test files skipped by explicit platform boundary
- 7,739 tests passed
- 52 tests skipped by explicit platform boundary
- 0 failures
- 0 uncaught errors

The final source commit `d752e268` has a green full retained Windows suite with 591 passing files,
7,737 passing tests, 2 skipped files, and 52 skipped tests. It also has green typecheck, focused
session-budget, SSH-project, memory-pressure, and bug-report checks. The source scan at that commit
reports no executable Darwin or Apple-only branches in the shipped source paths covered by the scan.
The later font-stack cleanup commit `5667f07b` has a green production build for the renderer,
session-host, and relay outputs, plus 30 focused renderer tests and a green typecheck.

### Fresh ZIP build

At commit `6ec87ac2520021f8d96ae85db12de575ce329b44`, a fresh ZIP extraction with no `node_modules`
passed the exact root `build.bat /s` route. It detected Node.js 24.19.0, VS 2022 with the required
Spectre support, Python, native module rebuilds, renderer output, session-host output, and relay
output without manual toolchain preparation.

### Fresh ZIP installer

At commit `b072daf67d3d6b86339a51d3a0bd144a2b013e7a`, a second fresh ZIP extraction with no
`node_modules` produced:

- `nodeterm-Setup-0.3.2.exe`, 195,750,400 bytes
- `node-terminal-0.3.2-full.nupkg`, 195,527,979 bytes
- `RELEASES`, 84 bytes, referencing the full package

The setup executable SHA-256 was:

```text
15F16F129BD45274125A0586ED1A41DC9FDF15F1C01B0F2B829C139C4D0E599A
```

The full package SHA-256 was:

```text
7825A0606AB99336DFC5CEF3D78963BD280A9186
```

### Hidden built-app verification

The packaged executable from the current source state was launched directly on a named hidden
Win32 desktop through the local command-line runtime. The real product window was resolved by its
non-empty title, `Chrome_WidgetWin_1` class, and non-zero `2121x1363` dimensions. A first-screen
capture was visually inspected, then a control-targeted keyboard action advanced onboarding to
Step 1 and a second capture was visually inspected.

The two capture SHA-256 values were:

```text
DA0DFAAF3D505FE5112FEB7F77316985B5B56DFD16ED8CD60FCE3905EDF6719C
7C4FC370A6A6D464D7109E9C8F82CBC217D67D7C7213BB9365D78B7F23183B3E
```

The task-owned process tree was terminated after capture. The hidden desktop release command
reported that the short-lived CLI instance did not retain desktop bookkeeping, so process-tree
termination is the authoritative cleanup evidence.

Packaging logs confirmed that signing was skipped. The installer is intentionally unsigned and may
produce an unknown-publisher warning.

## Remaining work

- The full retained Windows suite is verified at `d752e268`; the final font-stack cleanup is covered by its focused checks and production build. Hidden built-app verification is recorded above.
- Complete hidden-desktop verification of the packaged application.
- Inspect the final production source for any remaining active Apple-only runtime path.
- Add the final evidence to PR #494 and keep it draft until the evidence is complete.
- Merge only after upstream review approval.

## Known historical note

Commit `bc37ad47` contains literal `\\n` sequences in its public commit body because of an earlier
PowerShell message-encoding mistake. It was already pushed before discovery, so correcting it would
require history rewriting. The commit is preserved and later commits use correctly formatted
bilingual messages.
