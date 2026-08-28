# Changelog

All notable changes are recorded here. Dates use UTC. Commit links identify the implementation
milestone that completed each change.

## [0.3.4] - 2026-08-28

Code name: [Classic Har Gow · 蝦餃](https://github.com/Ding-Ding-Projects/dim-sum-photos/releases/download/catalog-v1/hk-dish-0001-classic-har-gow.png)

### Added

- Added a zero-manual-install Windows bootstrap. A fresh Windows user can download the repository
  ZIP, extract it, and double-click `build.bat`; the script obtains and verifies the complete build
  toolchain before building the runnable application.
- Added native Windows PowerShell agent hooks with real loopback payload, credential-header, and
  permission-answer coverage.
- Added release-grade unsigned Squirrel.Windows verification, byte count, SHA-256 reporting, and a
  reproducible surviving-line counter.
- Added a fail-closed 21-file capture manifest covering the Windows desktop and six Server Edition
  states, including Remote access, Browser control, Canvas control, and notifications.

### Changed

- Converted keyboard shortcuts, menus, file opening, clipboard transfer, title-bar behavior,
  platform labels, colors, native rebuilds, and account paths to Windows-only behavior.
- Replaced the retired desktop palette and shortcut glyphs in application, documentation, site,
  tests, and evidence assets with Windows equivalents.
- Limited release publication to the `main` branch so task branches can be preserved without
  creating duplicate releases.
- Routed warning-level remote service notices through the application's internal non-blocking
  notification path. Informational and success feed items now remain silent.
- Corrected the Server Edition container context so its required relay build script is available
  during a clean image build.
- Re-recorded every checked-in UI still, animation, and video from real built surfaces. Animated
  WebP keyframes now remain visible for 3 to 4.5 seconds instead of racing past the reader.
- Made the Server Edition Browser control screen state its permanent capability boundary, removed
  the unusable stop action, and disabled its project browser-driving switch.

### Removed

- Removed retired desktop packaging, launch, entitlement, toolchain, credential-service, bundled tmux,
  renderer-policy, and historical promotion paths.
- Removed the non-Windows static-analysis workflow and obsolete platform-only tests.
- Removed the automatic App Store banner, the startup promotional modal, and the promotional action
  from first-run onboarding.

Implementation: [`3c1826ed`](https://github.com/Ding-Ding-Projects/nodeterm/commit/3c1826edb571ffa6e30fe435433d127d4c753fef)
