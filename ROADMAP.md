# Roadmap

## Windows desktop conversion

- [x] Provide a root `build.bat` that bootstraps the pinned Windows toolchain and project packages on a fresh checkout.
- [x] Provide a root `download-dependencies.bat` with silent mode, idempotent checks, and pinned tool metadata.
- [x] Provide a root `build-installer.bat` that builds and validates the unsigned x64 Squirrel.Windows package.
- [x] Remove active non-Windows desktop packaging, entitlement, installer, launcher, and local toolchain paths.
- [x] Convert desktop window chrome, notifications, shortcuts, clipboard file transfer, SSH discovery, and native rebuild handling to Windows behavior.
- [x] Route POSIX-only verification fixtures away from the Windows suite when they require unavailable shells, Unix sockets, or POSIX permission bits.
- [x] Verify the retained Windows suite at commit `d752e268` with 591 passing files, 7,737 passing tests, 2 skipped files, and 52 skipped tests.
- [x] Verify a fresh ZIP checkout with no `node_modules` through `build.bat /s` at commit `6ec87ac2520021f8d96ae85db12de575ce329b44`.
- [x] Verify a fresh ZIP checkout with no `node_modules` through `build-installer.bat /s` at commit `b072daf67d3d6b86339a51d3a0bd144a2b013e7a`, producing `Setup.exe`, `RELEASES`, and the full `.nupkg`.
- [x] Rerun the full retained Windows suite after the production-path cleanup at `a1eef940`.
- [x] Rerun the full retained Windows suite after the final low-risk SSH and memory-reader cleanup at `d752e268`, with 591 files and 7,737 tests passing.
- [x] Complete hidden-desktop verification of the packaged application and retain the required evidence.
- [x] Refresh all upstream-facing handoff and PR evidence after the final verification commit.
- [ ] Merge the completed work into the upstream default branch after review approval.

## Release and documentation follow-up

- [x] Document the ZIP extraction plus double-click `build.bat` experience in `README.md`.
- [x] Document the Windows Agent HUD behavior in `docs/notch-hud.md`.
- [ ] Refresh the hosted documentation and release presentation from the final verified commit.
- [x] Move PR #494 out of draft after the build, test, source-scan, and hidden-app evidence was recorded.
