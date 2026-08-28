# Windows conversion handoff

## Current state

The Windows platform conversion is implemented on `feat/windows-complete-conversion`.

Key commits:

```text
3c1826edb571ffa6e30fe435433d127d4c753fef  native Windows conversion
b2885e2                                  reproducible line counter
```

Release candidate metadata is prepared for version `0.3.4`, code name
`Classic Har Gow · 蝦餃`. At the point this handoff was written, the candidate had not been pushed,
integrated into `main`, published, or verified by GitHub Actions.

## User-facing headline

The highlighted first-run experience is a ZIP-only Windows workflow:

1. Download the source ZIP.
2. Extract it.
3. Double-click `build.bat`.

No build dependency needs to be installed by hand. The batch file requests administrator approval
before toolchain work, downloads and SHA-256-verifies the pinned Node.js, Python, and Visual Studio
bootstrap files, restores project packages, builds the real application, verifies required outputs,
and asks whether to launch only after success.

`build-installer.bat` uses the same bootstrap and produces the unsigned x64 Squirrel.Windows
package set. Silent mode is available through `/s`, `--silent`, or `SILENT=1`; it never opens UAC.

## Local verification

### Type and complete suite

- `npm run typecheck`: passed.
- `npm test`: 592 files passed, 2 skipped.
- Test cases: 7,714 passed, 49 skipped.
- `npx vitest run scripts/count-lines.test.mjs`: 6 passed.
- Native managed-hook wrapper, loopback payload, header, and permission-answer coverage: passed.

### Source and documentation scans

- No tracked retired desktop platform names, toolchains, credential stores, file managers,
  shortcut glyphs, package formats, or platform paths remain outside generated lock metadata.
- The only retained Apple text is exact non-desktop technical data: the iOS App Store URL,
  `AppleWebKit` in real user-agent fixtures, and cryptographic `MAC` terminology.
- No private conversational vocabulary appears in the public source tree.
- `git diff --check`: passed.

### One-click build

`build.bat /s` passed and produced:

- `out/main/index.js`
- `out/preload/index.js`
- `out/renderer/index.html`
- `out/session-host/host.cjs`
- `out/main/codex-relay.js`

The final dependency recovery run rebuilt native modules after four stale test session-host
processes were identified and stopped. The batch callers now reject every nonzero bootstrap exit,
including negative native error codes, so a partial package tree cannot fall through into a build.

### Unsigned Squirrel.Windows package

`build-installer.bat /s` passed for version `0.3.4` and produced:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `nodeterm-Setup-0.3.4.exe` | 195,746,816 | `8ce38652802fb13cca5f83daf7666f161da2e278862faa2972fec1e78c13f91b` |
| `node-terminal-0.3.4-full.nupkg` | 195,524,645 | `61e1852ec6bf6dd80108c6d50ca5f944016a59d500904569c9e43f1b9ce6806a` |
| `RELEASES` | 84 | `5947c2848412c98033d3c5dda5e6fd704dc4fd53761df08d2cadab4d8d4df612` |

Signing was skipped for the app executable, execution stub, Squirrel helper, and setup executable.
The independent certificate check returned `NotSigned`.

### Icon proof

- `build/icon.ico` is a valid ICO with 7 frames at 16, 24, 32, 48, 64, 128, and 256 pixels.
- `dist/win-unpacked/nodeterm.exe` exposes a 32 by 32 associated icon.
- `nodeterm-Setup-0.3.4.exe` exposes a 32 by 32 associated icon.

## Release automation

- `.github/workflows/ci.yml` runs the one-click build on every push and manual dispatch.
- `.github/workflows/release.yml` publishes only from `main`, preventing task-branch preservation
  from creating duplicate releases.
- Release automation checks out full history, builds through `build-installer.bat /s`, verifies
  unsigned outputs, runs the committed line counter, publishes one version tag, records start,
  completion, and duration, then downloads the setup and full package to compare hashes.
- `actionlint -shellcheck=` passed for all retained workflows.
- Every embedded PowerShell block in the release workflow passed the PowerShell parser after
  replacing GitHub expression placeholders with inert test values.

## Release readiness blocker

The Windows conversion is locally verified and may be reviewed or integrated as its own change.
The full product release is not ready under the fail-closed inventory in
`docs/release/completeness-audit.md`.

The upstream product lacks complete implementations and built interaction proof for the local
personal-vocabulary upload, app-logo customization, categorized file converter, local Ollama
manager, complete regex workbench, language and funny-level controls, shared School mode, narrator
voice selection, ADHD modes, full per-element appearance editing, toy locks and authenticator,
Git-backed local history for every record, browser-extension download dialogs, and a complete
per-click capture ledger.

No release, `main` merge, task-branch deletion, or cleanup claim should occur while that audit is
blocked. Preserve the task branch and package evidence until the product owner either supplies a
new explicit scope decision or the missing rows are fully implemented and verified.
