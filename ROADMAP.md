# Roadmap

## Windows desktop conversion

- [x] Provide a root `build.bat` that bootstraps the pinned Windows toolchain and project packages on a fresh checkout.
- [x] Provide a root `download-dependencies.bat` with silent mode, idempotent checks, and pinned tool metadata.
- [x] Provide a root `build-installer.bat` that builds and validates the unsigned x64 Squirrel.Windows package.
- [x] Reject every nonzero bootstrap result, including negative native error codes, before build or packaging begins.
- [x] Add native PowerShell hooks for every locally integrated agent and retain POSIX scripts only for Linux SSH or Server Edition hosts.
- [x] Convert desktop chrome, notifications, shortcuts, clipboard transfer, file opening, native rebuilds, account paths, and palette defaults to Windows behavior.
- [x] Remove retired desktop packaging, entitlement, launcher, credential-service, bundled tmux, shortcut-glyph, toolchain, and historical promotion paths.
- [x] Verify type checking and the complete retained suite with 592 passing files, 7,714 passing tests, 2 skipped files, and 49 skipped tests.
- [x] Verify the native `cmd.exe` hook wrapper through a real loopback receiver and permission-answer flow.
- [x] Verify `build.bat /s` produces every required main, preload, renderer, session-host, and relay output.
- [x] Verify version `0.3.4` through `build-installer.bat /s`, including unsigned setup, `RELEASES`, full package, bytes, and SHA-256.
- [x] Verify the 7-frame ICO and associated icons from the packaged app and setup executable.
- [x] Add and test a reproducible release line counter based on surviving `git blame` lines.

## Release automation and documentation

- [x] Highlight the fresh-Windows ZIP, extract, double-click experience in `README.md`.
- [x] Add focused one-click build documentation and a categorized release documentation index.
- [x] Add version `0.3.4` changelog and public dim-sum code-name metadata.
- [x] Make the build workflow call `build.bat /s` on every push and manual dispatch.
- [x] Restrict release publication to `main` so preserving a task branch cannot create a duplicate release.
- [x] Make release automation build through `build-installer.bat /s`, count lines, publish timing and hashes, and download assets for verification.
- [x] Validate retained workflow structure with `actionlint` and parse every embedded PowerShell block.
- [ ] Integrate into `main` only after the product-wide release blockers below are resolved or explicitly respecified by the product owner.
- [ ] Publish and verify exactly one non-draft release for the final integrated commit.

## Product-wide release blockers

- [ ] Implement and verify the visible local personal-vocabulary JSON upload on every user-facing surface.
- [ ] Implement and verify app-logo customization with bounded local conversion and reset.
- [ ] Implement and verify the categorized local file converter, including bundled adapters and PDF operations.
- [ ] Implement and verify the complete local Ollama suite manager.
- [ ] Implement and verify the full regex workbench beside every search field.
- [ ] Implement and verify the three language modes and two independent funny-level controls.
- [ ] Implement and verify shared School mode, narrator voice controls, and the five ADHD modes.
- [ ] Implement and verify full per-element appearance editing, toy locks, TOTP registration, and the local authenticator.
- [ ] Implement and verify Git-backed local history for every user-owned record.
- [ ] Implement and verify the browser-extension start, downloading, and completion surfaces.
- [ ] Produce the complete built interaction ledger, current per-surface capture matrix, and screen recording.
